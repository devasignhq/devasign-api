import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import express, { Request, Response } from "express";
import { apiLimiter, webhookLimiter } from "../../../api/middlewares/rate-limit.middleware.js";
import { STATUS_CODES, ENDPOINTS } from "../../../api/utils/data.js";

describe("Rate Limit Middleware", () => {
    let app: express.Application;

    beforeEach(() => {
        app = express();
        app.use(express.json());
    });

    describe("API Rate Limiter", () => {
        it("should allow requests under the limit", async () => {
            app.use("/api/test-under", apiLimiter);
            app.get("/api/test-under", (_req: Request, res: Response) => {
                res.status(STATUS_CODES.SUCCESS).json({ message: "success" });
            });

            for (let i = 0; i < 5; i++) {
                await request(app)
                    .get("/api/test-under")
                    .expect(STATUS_CODES.SUCCESS);
            }
        });

        it("should skip rate limiting for webhook endpoints", async () => {
            app.use(apiLimiter);
            app.get(`${ENDPOINTS.WEBHOOK.PREFIX}/test-skip`, (_req: Request, res: Response) => {
                res.status(STATUS_CODES.SUCCESS).json({ message: "success" });
            });

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
            app.get(path, (_req: Request, res: Response) => { res.status(STATUS_CODES.SUCCESS).json({ message: "success" }); });

            // Limit is 300.
            const limit = 310;
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
                        expect(res.body.message).toBe("Too many requests from this IP, please try again after 1 minute");
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
            app.post(path, (_req: Request, res: Response) => { res.status(STATUS_CODES.SUCCESS).json({ message: "success" }); });

            // Limit is 300.
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
