import { Router, Request, Response, NextFunction, RequestHandler } from "express";
import { OctokitService } from "../../services/octokit.service";
import { STATUS_CODES } from "../../utilities/data";
import { responseWrapper } from "../../utilities/helper";

const router = Router();

// Get user top languages
router.get("/languages/:username", (async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { username } = req.params;
        const languages = await OctokitService.getUserTopLanguages(username);

        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            message: "User top languages retrieved successfully",
            data: languages
        });
    } catch (error) {
        next(error);
    }
}) as RequestHandler);

export const octokitTestRoutes = router;
