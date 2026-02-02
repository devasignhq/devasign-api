import { Request, Response, NextFunction } from "express";
import axios from "axios";
import crypto from "crypto-js";
import { STATUS_CODES } from "../../utilities/data";
import { responseWrapper } from "../../utilities/helper";
import { ErrorClass } from "../../models/error.model";

/**
 * Generate Sumsub SDK access token
 */
export const generateSumsubSdkToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = res.locals.userId;
        const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN!;
        const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY!;
        const SUMSUB_LEVEL_NAME = process.env.SUMSUB_LEVEL_NAME!;
        const SUMSUB_BASE_URL = process.env.SUMSUB_BASE_URL || "https://api.sumsub.com";

        // Generate the request URL, timestamp and request body
        const url = "/resources/accessTokens/sdk";
        const timestamp = Math.floor(Date.now() / 1000);
        const requestBody = {
            userId,
            levelName: SUMSUB_LEVEL_NAME,
            ttlInSecs: 600
        };

        // Convert the body to a string exactly as it will be sent in the request
        const bodyString = JSON.stringify(requestBody);
        const signatureData = `${timestamp}POST${url}${bodyString}`;

        // Generate the HMAC SHA256 signature
        const signature = crypto.HmacSHA256(signatureData, SUMSUB_SECRET_KEY).toString(crypto.enc.Hex);

        // Make the POST request with the generated signature
        const response = await axios.post(
            SUMSUB_BASE_URL + url,
            requestBody,
            {
                headers: {
                    "X-App-Token": SUMSUB_APP_TOKEN,
                    "X-App-Access-Ts": timestamp,
                    "X-App-Access-Sig": signature,
                    "Content-Type": "application/json"
                }
            }
        );

        if (response.status !== 200) {
            throw new ErrorClass(
                "SUMSUB_API_ERROR",
                response.data,
                "Sumsub SDK token generation failed",
                STATUS_CODES.SERVER_ERROR
            );
        }

        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: response.data,
            message: "Sumsub SDK token generated"
        });

    } catch (error) {
        // Check if it's an Axios Error
        if (axios.isAxiosError(error)) {
            const errorData = error.response?.data || error.message;

            return next(new ErrorClass(
                "SUMSUB_API_ERROR",
                errorData,
                `Sumsub API failed: ${error.message}`,
                STATUS_CODES.SERVER_ERROR
            ));
        }

        // Fallback for other synchronous errors
        next(error);
    }
};
