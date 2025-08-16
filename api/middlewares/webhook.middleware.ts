import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { GitHubWebhookError } from '../models/ai-review.errors';

/**
 * Middleware to validate GitHub webhook signatures
 * Requirement 1.2: System SHALL have access to monitor pull requests and issues
 */
export const validateGitHubWebhook = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const signature = req.get('X-Hub-Signature-256');
    const payload = JSON.stringify(req.body);
    const secret = process.env.GITHUB_WEBHOOK_SECRET;

    if (!secret) {
      throw new GitHubWebhookError('GitHub webhook secret not configured');
    }

    if (!signature) {
      throw new GitHubWebhookError('Missing webhook signature');
    }

    // Create expected signature
    const expectedSignature = `sha256=${crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex')}`;

    // Compare signatures using timing-safe comparison
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      throw new GitHubWebhookError('Invalid webhook signature');
    }

    next();
  } catch (error) {
    if (error instanceof GitHubWebhookError) {
      res.status(401).json({
        success: false,
        error: error.message,
        code: error.code
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Webhook validation failed',
      code: 'WEBHOOK_VALIDATION_ERROR'
    });
    return;
  }
};

/**
 * Middleware to validate webhook event types
 * Only processes PR events that we care about
 */
export const validatePRWebhookEvent = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const eventType = req.get('X-GitHub-Event');
    const { action } = req.body;

    // Only process pull_request events
    if (eventType !== 'pull_request') {
      res.status(200).json({
        success: true,
        message: 'Event type not processed',
        eventType
      });
      return;
    }

    // Only process specific PR actions
    const validActions = ['opened', 'synchronize', 'ready_for_review'];
    if (!validActions.includes(action)) {
      res.status(200).json({
        success: true,
        message: 'PR action not processed',
        action
      });
      return;
    }

    // Add event metadata to request for use in controller
    req.body.webhookMeta = {
      eventType,
      action,
      deliveryId: req.get('X-GitHub-Delivery'),
      timestamp: new Date().toISOString()
    };

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Event validation failed',
      code: 'EVENT_VALIDATION_ERROR'
    });
    return;
  }
};