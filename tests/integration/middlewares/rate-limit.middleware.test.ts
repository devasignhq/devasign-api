import request from "supertest";
import express, { Request, Response } from "express";
import { apiLimiter, webhookLimiter } from "../../../api/middlewares/rate-limit.middleware";
import { STATUS_CODES, ENDPOINTS } from "../../../api/utilities/data";

describe("Rate Limit Middleware", () => {
    let app: express.Application;

    beforeAll(() => {
        // Any global setup
    });

    beforeEach(() => {
        app = express();
        app.use(express.json());
    });

    describe("API Rate Limiter", () => {
        it("should allow requests under the limit", async () => {
            app.use("/api/test-under", apiLimiter);
            app.get("/api/test-under", (req: Request, res: Response) => { res.status(200).json({ message: "success" }); });

            for (let i = 0; i < 5; i++) {
                await request(app)
                    .get("/api/test-under")
                    .expect(STATUS_CODES.SUCCESS);
            }
        });

        it("should skip rate limiting for webhook endpoints", async () => {
            app.use(apiLimiter);
            app.get(`${ENDPOINTS.WEBHOOK.PREFIX}/test-skip`, (req: Request, res: Response) => { res.status(200).json({ message: "success" }); });

            const checks = [];
            for (let i = 0; i < 20; i++) {
                checks.push(
                    request(app)
                        .get(`${ENDPOINTS.WEBHOOK.PREFIX}/test-skip`)
                        .expect(STATUS_CODES.SUCCESS)
                );
            }
            await Promise.all(checks);
        });

        it("should block requests over the limit", async () => {
            // Use a unique path to avoid interference from previous tests if state persists
            const path = "/api/test-over-limit";
            app.use(path, apiLimiter);
            app.get(path, (req: Request, res: Response) => { res.status(200).json({ message: "success" }); });

            // Limit is 150.
            // We'll send requests in batches of 20 to avoid overwhelm.
            const limit = 160;
            let blocked = false;

            for (let i = 0; i < limit; i += 20) {
                const batch = [];
                for (let j = 0; j < 20; j++) {
                    batch.push(request(app).get(path));
                }
                const responses = await Promise.all(batch);

                for (const res of responses) {
                    if (res.status === STATUS_CODES.RATE_LIMIT) {
                        blocked = true;
                        expect(res.body.message).toBe("Too many requests from this IP, please try again after 15 minutes");
                        break;
                    }
                }
                if (blocked) break;
            }

            // If we haven't been blocked yet, do one more check
            if (!blocked) {
                const res = await request(app).get(path);
                if (res.status === STATUS_CODES.RATE_LIMIT) blocked = true;
            }

            expect(blocked).toBe(true);
        }, 60000); // 60s timeout
    });

    describe("Webhook Rate Limiter", () => {
        it("should enforce webhook specific limits", async () => {
            const path = "/webhook/test-limit";
            app.use(path, webhookLimiter);
            app.post(path, (req: Request, res: Response) => { res.status(200).json({ message: "success" }); });

            // Limit is 300.
            // We need to hit > 300.
            const limit = 310;
            let blocked = false;

            for (let i = 0; i < limit; i += 50) {
                const batch = [];
                for (let j = 0; j < 50; j++) {
                    batch.push(request(app).post(path));
                }
                const responses = await Promise.all(batch);

                for (const res of responses) {
                    if (res.status === STATUS_CODES.RATE_LIMIT) {
                        blocked = true;
                        expect(res.body.message).toBe("Too many webhook requests from this IP, please try again after 1 minute");
                        break;
                    }
                }
                if (blocked) break;
            }

            if (!blocked) {
                const res = await request(app).post(path);
                if (res.status === STATUS_CODES.RATE_LIMIT) blocked = true;
            }

            expect(blocked).toBe(true);
        }, 60000);
    });
});
