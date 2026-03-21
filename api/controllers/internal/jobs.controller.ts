import { Request, Response, NextFunction } from "express";
import { orchestrationService } from "../../services/pr-review/orchestration.service";
import { PRAnalysisService } from "../../services/pr-review/pr-analysis.service";
import { indexingService } from "../../services/pr-review/indexing.service";
import { STATUS_CODES } from "../../utilities/data";
import { dataLogger } from "../../config/logger.config";
import { responseWrapper } from "../../utilities/helper";

/**
 * Handles incoming Cloud Tasks jobs for PR Analysis
 */
export const handlePRAnalysisJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { payload, isActualFollowUp, pendingCommentId } = req.body;
        const { pull_request } = payload;

        dataLogger.info("Received PR Analysis job from Cloud Tasks", { prNumber: pull_request?.number });

        // Extract and validate PR data
        const prData = await PRAnalysisService.createCompletePRData(payload);
        prData.pendingCommentId = pendingCommentId;

        // Handle follow-up vs new review
        if (isActualFollowUp) {
            await orchestrationService.updateExistingReview(prData);
        } else {
            await orchestrationService.analyzePullRequest(prData);
        }

        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: { success: true },
            message: "PR Analysis job completed"
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Handles incoming Cloud Tasks jobs for Repository Indexing
 */
export const handleRepositoryIndexingJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { installationId, repositoryName } = req.body;

        dataLogger.info("Received Repository Indexing job from Cloud Tasks", { installationId, repositoryName });

        await indexingService.indexRepository(installationId, repositoryName);

        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: { success: true },
            message: "Repository Indexing job completed"
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Handles incoming Cloud Tasks jobs for Incremental Indexing
 */
export const handleIncrementalIndexingJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { installationId, repositoryName, filesToIndex, filesToRemove } = req.body;

        dataLogger.info("Received Incremental Indexing job from Cloud Tasks", {
            installationId, repositoryName,
            filesToIndex: filesToIndex?.length,
            filesToRemove: filesToRemove?.length 
        });

        await indexingService.indexChangedFiles(
            installationId,
            repositoryName,
            filesToIndex,
            filesToRemove
        );

        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: { success: true },
            message: "Incremental Indexing job completed"
        });
    } catch (error) {
        next(error);
    }
};
