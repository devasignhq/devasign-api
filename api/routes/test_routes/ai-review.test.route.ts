import { Router, Request, Response, RequestHandler } from 'express';
import { ReviewFormatterService } from '../../services/review-formatter.service';
import { ReviewCommentIntegrationService } from '../../services/review-comment-integration.service';

const router = Router();

/**
 * Test endpoint for AI review formatting
 * GET /ai-review-test/format-preview
 */
router.get('/format-preview', async (req: Request, res: Response) => {
  try {
    // Create test review result
    const testResult = ReviewCommentIntegrationService.createTestReviewResult(
      'test-installation-123',
      'owner/test-repo',
      42
    );

    // Format the review
    const formatted = ReviewFormatterService.formatReview(testResult);
    const compactSummary = ReviewFormatterService.formatCompactSummary(testResult);

    res.json({
      success: true,
      data: {
        testResult,
        formatted: {
          header: formatted.header,
          mergeScoreSection: formatted.mergeScoreSection,
          rulesSection: formatted.rulesSection,
          suggestionsSection: formatted.suggestionsSection,
          footer: formatted.footer,
          fullComment: formatted.fullComment
        },
        compactSummary,
        stats: {
          commentLength: formatted.fullComment.length,
          rulesViolated: testResult.rulesViolated.length,
          rulesPassed: testResult.rulesPassed.length,
          suggestions: testResult.suggestions.length
        }
      }
    });

  } catch (error) {
    console.error('Error in format preview:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Test endpoint for error comment formatting
 * GET /ai-review-test/error-comment
 */
router.get('/error-comment', async (req: Request, res: Response) => {
  try {
    const errorComment = ReviewFormatterService.formatErrorComment(
      'test-installation-123',
      42,
      'owner/test-repo',
      'This is a test error message for demonstration purposes'
    );

    res.json({
      success: true,
      data: {
        errorComment,
        length: errorComment.length
      }
    });

  } catch (error) {
    console.error('Error in error comment formatting:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Test endpoint for marker extraction
 * POST /ai-review-test/extract-marker
 */
router.post('/extract-marker', (async (req: Request, res: Response) => {
  try {
    const { commentBody } = req.body;

    if (!commentBody) {
      return res.status(400).json({
        success: false,
        error: 'commentBody is required'
      });
    }

    const marker = ReviewFormatterService.extractReviewMarker(commentBody);
    const isAIComment = ReviewFormatterService.isAIReviewComment(commentBody);

    res.json({
      success: true,
      data: {
        marker,
        isAIComment,
        commentLength: commentBody.length
      }
    });

  } catch (error) {
    console.error('Error in marker extraction:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}) as RequestHandler);

/**
 * Test endpoint for different merge scores
 * GET /ai-review-test/score-variations
 */
router.get('/score-variations', async (req: Request, res: Response) => {
  try {
    const scores = [95, 85, 75, 65, 45, 25];
    const variations = scores.map(score => {
      const testResult = ReviewCommentIntegrationService.createTestReviewResult(
        'test-installation-123',
        'owner/test-repo',
        42
      );
      testResult.mergeScore = score;

      const formatted = ReviewFormatterService.formatReview(testResult);
      const compactSummary = ReviewFormatterService.formatCompactSummary(testResult);

      return {
        score,
        header: formatted.header.split('\n')[0],
        compactSummary,
        recommendation: formatted.mergeScoreSection.split('\n').find(line => line.includes('**Recommendation:**'))
      };
    });

    res.json({
      success: true,
      data: {
        variations,
        totalVariations: variations.length
      }
    });

  } catch (error) {
    console.error('Error in score variations:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as aiReviewTestRoutes };