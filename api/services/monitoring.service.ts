import { LoggingService } from './logging.service';
import { HealthCheckService } from './health-check.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { AIReviewError } from '../models/ai-review.errors';

/**
 * Monitoring and Alerting Service for AI Review System
 * Provides system monitoring, alerting, and metrics collection
 * Requirements: 7.4, 6.4
 */
export class MonitoringService {
  private static readonly ALERT_THRESHOLDS = {
    errorRate: 0.1,           // 10% error rate
    responseTime: 30000,      // 30 seconds
    circuitBreakerOpen: 1,    // Any circuit breaker open
    healthCheckFailures: 3,   // 3 consecutive health check failures
    diskUsage: 0.9,          // 90% disk usage
    memoryUsage: 0.85        // 85% memory usage
  };

  private static readonly MONITORING_INTERVALS = {
    healthCheck: 60000,       // 1 minute
    metrics: 30000,          // 30 seconds
    alertCheck: 120000       // 2 minutes
  };

  private static metrics: SystemMetrics = {
    requests: { total: 0, successful: 0, failed: 0 },
    aiReviews: { total: 0, successful: 0, failed: 0, fallback: 0 },
    services: {
      groq: { calls: 0, failures: 0, avgResponseTime: 0 },
      pinecone: { calls: 0, failures: 0, avgResponseTime: 0 },
      github: { calls: 0, failures: 0, avgResponseTime: 0 },
      database: { calls: 0, failures: 0, avgResponseTime: 0 }
    },
    errors: new Map<string, number>(),
    lastReset: new Date()
  };

  private static alertHistory: AlertEvent[] = [];
  private static monitoringActive = false;
  private static intervals: NodeJS.Timeout[] = [];

  /**
   * Starts monitoring services
   */
  static startMonitoring(): void {
    if (MonitoringService.monitoringActive) {
      LoggingService.logWarning('monitoring_already_active', 'Monitoring is already active');
      return;
    }

    MonitoringService.monitoringActive = true;

    // Start health check monitoring
    const healthCheckInterval = setInterval(
      () => MonitoringService.performHealthCheckMonitoring(),
      MonitoringService.MONITORING_INTERVALS.healthCheck
    );

    // Start metrics collection
    const metricsInterval = setInterval(
      () => MonitoringService.collectMetrics(),
      MonitoringService.MONITORING_INTERVALS.metrics
    );

    // Start alert checking
    const alertInterval = setInterval(
      () => MonitoringService.checkAlerts(),
      MonitoringService.MONITORING_INTERVALS.alertCheck
    );

    MonitoringService.intervals = [healthCheckInterval, metricsInterval, alertInterval];

    LoggingService.logInfo(
      'monitoring_started',
      'System monitoring has been started',
      { intervals: Object.keys(MonitoringService.MONITORING_INTERVALS) }
    );
  }

  /**
   * Stops monitoring services
   */
  static stopMonitoring(): void {
    if (!MonitoringService.monitoringActive) {
      return;
    }

    MonitoringService.intervals.forEach(interval => clearInterval(interval));
    MonitoringService.intervals = [];
    MonitoringService.monitoringActive = false;

    LoggingService.logInfo('monitoring_stopped', 'System monitoring has been stopped');
  }

  /**
   * Records AI review event for monitoring
   */
  static recordAIReviewEvent(
    eventType: 'started' | 'completed' | 'failed' | 'fallback',
    duration?: number,
    error?: AIReviewError
  ): void {
    MonitoringService.metrics.aiReviews.total++;

    switch (eventType) {
      case 'completed':
        MonitoringService.metrics.aiReviews.successful++;
        break;
      case 'failed':
        MonitoringService.metrics.aiReviews.failed++;
        if (error) {
          MonitoringService.recordError(error.code, error.message);
        }
        break;
      case 'fallback':
        MonitoringService.metrics.aiReviews.fallback++;
        break;
    }

    // Log high-level metrics periodically
    if (MonitoringService.metrics.aiReviews.total % 10 === 0) {
      MonitoringService.logMetricsSummary();
    }
  }

  /**
   * Records service call metrics
   */
  static recordServiceCall(
    serviceName: 'groq' | 'pinecone' | 'github' | 'database',
    success: boolean,
    responseTime: number,
    error?: Error
  ): void {
    const serviceMetrics = MonitoringService.metrics.services[serviceName];
    serviceMetrics.calls++;

    if (!success) {
      serviceMetrics.failures++;
      if (error) {
        MonitoringService.recordError(`${serviceName}_error`, error.message);
      }
    }

    // Update average response time
    serviceMetrics.avgResponseTime = 
      (serviceMetrics.avgResponseTime * (serviceMetrics.calls - 1) + responseTime) / serviceMetrics.calls;

    // Check for performance alerts
    if (responseTime > MonitoringService.ALERT_THRESHOLDS.responseTime) {
      MonitoringService.triggerAlert(
        'high_response_time',
        `${serviceName} response time exceeded threshold: ${responseTime}ms`,
        { serviceName, responseTime, threshold: MonitoringService.ALERT_THRESHOLDS.responseTime }
      );
    }
  }

  /**
   * Records error for tracking
   */
  static recordError(errorCode: string, errorMessage: string): void {
    const count = MonitoringService.metrics.errors.get(errorCode) || 0;
    MonitoringService.metrics.errors.set(errorCode, count + 1);

    // Check error rate threshold
    const totalRequests = MonitoringService.metrics.requests.total;
    const totalErrors = Array.from(MonitoringService.metrics.errors.values())
      .reduce((sum, count) => sum + count, 0);

    if (totalRequests > 0) {
      const errorRate = totalErrors / totalRequests;
      if (errorRate > MonitoringService.ALERT_THRESHOLDS.errorRate) {
        MonitoringService.triggerAlert(
          'high_error_rate',
          `Error rate exceeded threshold: ${(errorRate * 100).toFixed(2)}%`,
          { errorRate, threshold: MonitoringService.ALERT_THRESHOLDS.errorRate, totalErrors, totalRequests }
        );
      }
    }
  }

  /**
   * Performs health check monitoring
   */
  private static async performHealthCheckMonitoring(): Promise<void> {
    try {
      const healthResult = await HealthCheckService.performHealthCheck(true);
      
      // Check for unhealthy services
      Object.entries(healthResult.services).forEach(([serviceName, health]) => {
        if (health.status === 'unhealthy') {
          MonitoringService.triggerAlert(
            'service_unhealthy',
            `Service ${serviceName} is unhealthy: ${health.message}`,
            { serviceName, health }
          );
        }
      });

      // Check overall system health
      if (healthResult.status === 'unhealthy') {
        MonitoringService.triggerAlert(
          'system_unhealthy',
          'Overall system health is unhealthy',
          { healthResult }
        );
      }

      // Check circuit breaker status
      const circuitStatus = CircuitBreakerService.getCircuitStatus();
      Object.entries(circuitStatus).forEach(([serviceName, status]) => {
        if (status.state === 'OPEN') {
          MonitoringService.triggerAlert(
            'circuit_breaker_open',
            `Circuit breaker for ${serviceName} is OPEN`,
            { serviceName, status }
          );
        }
      });

    } catch (error) {
      LoggingService.logError('health_check_monitoring_failed', error as Error);
    }
  }

  /**
   * Collects system metrics
   */
  private static collectMetrics(): void {
    try {
      // Collect system resource metrics
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      // Check memory usage
      const memoryUsageRatio = memoryUsage.heapUsed / memoryUsage.heapTotal;
      if (memoryUsageRatio > MonitoringService.ALERT_THRESHOLDS.memoryUsage) {
        MonitoringService.triggerAlert(
          'high_memory_usage',
          `Memory usage exceeded threshold: ${(memoryUsageRatio * 100).toFixed(2)}%`,
          { memoryUsage, threshold: MonitoringService.ALERT_THRESHOLDS.memoryUsage }
        );
      }

      // Log metrics periodically
      LoggingService.logInfo(
        'system_metrics',
        'System metrics collected',
        {
          memory: {
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            usageRatio: Math.round(memoryUsageRatio * 100)
          },
          uptime: Math.round(process.uptime()),
          aiReviews: MonitoringService.metrics.aiReviews,
          services: MonitoringService.getServiceMetricsSummary()
        }
      );

    } catch (error) {
      LoggingService.logError('metrics_collection_failed', error as Error);
    }
  }

  /**
   * Checks for alert conditions
   */
  private static checkAlerts(): void {
    try {
      // Check for repeated alerts to avoid spam
      const recentAlerts = MonitoringService.alertHistory.filter(
        alert => Date.now() - alert.timestamp.getTime() < 300000 // 5 minutes
      );

      // Clean up old alerts
      MonitoringService.alertHistory = MonitoringService.alertHistory.filter(
        alert => Date.now() - alert.timestamp.getTime() < 3600000 // 1 hour
      );

      // Log alert summary if there are recent alerts
      if (recentAlerts.length > 0) {
        const alertSummary = recentAlerts.reduce((summary, alert) => {
          summary[alert.type] = (summary[alert.type] || 0) + 1;
          return summary;
        }, {} as Record<string, number>);

        LoggingService.logWarning(
          'alert_summary',
          `Recent alerts in the last 5 minutes: ${recentAlerts.length}`,
          { alertSummary, recentAlerts: recentAlerts.length }
        );
      }

    } catch (error) {
      LoggingService.logError('alert_check_failed', error as Error);
    }
  }

  /**
   * Triggers an alert
   */
  private static triggerAlert(
    alertType: string,
    message: string,
    details?: Record<string, any>
  ): void {
    const alert: AlertEvent = {
      type: alertType,
      message,
      details,
      timestamp: new Date(),
      severity: MonitoringService.getAlertSeverity(alertType)
    };

    MonitoringService.alertHistory.push(alert);

    // Log the alert
    LoggingService.logError(
      `alert_${alertType}`,
      new Error(message),
      { alert, severity: alert.severity }
    );

    // Send to external monitoring systems
    MonitoringService.sendAlertToExternalSystems(alert);
  }

  /**
   * Determines alert severity
   */
  private static getAlertSeverity(alertType: string): 'low' | 'medium' | 'high' | 'critical' {
    const criticalAlerts = ['system_unhealthy', 'high_error_rate'];
    const highAlerts = ['service_unhealthy', 'circuit_breaker_open', 'high_memory_usage'];
    const mediumAlerts = ['high_response_time'];

    if (criticalAlerts.includes(alertType)) return 'critical';
    if (highAlerts.includes(alertType)) return 'high';
    if (mediumAlerts.includes(alertType)) return 'medium';
    return 'low';
  }

  /**
   * Sends alert to external monitoring systems
   */
  private static async sendAlertToExternalSystems(alert: AlertEvent): Promise<void> {
    try {
      // In production, this would integrate with:
      // - PagerDuty for critical alerts
      // - Slack/Teams for team notifications
      // - Email for high severity alerts
      // - SMS for critical system failures

      if (process.env.ALERT_WEBHOOK_URL) {
        await fetch(process.env.ALERT_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.ALERT_WEBHOOK_TOKEN || ''}`
          },
          body: JSON.stringify({
            ...alert,
            service: 'ai-review-system',
            environment: process.env.NODE_ENV || 'development'
          })
        });
      }

    } catch (error) {
      // Don't let alert sending failures break the main flow
      console.error('Failed to send alert to external systems:', error);
    }
  }

  /**
   * Gets current metrics summary
   */
  static getMetrics(): SystemMetrics {
    return { ...MonitoringService.metrics };
  }

  /**
   * Gets recent alerts
   */
  static getRecentAlerts(minutes: number = 60): AlertEvent[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return MonitoringService.alertHistory.filter(
      alert => alert.timestamp.getTime() > cutoff
    );
  }

  /**
   * Resets metrics (for testing or periodic reset)
   */
  static resetMetrics(): void {
    MonitoringService.metrics = {
      requests: { total: 0, successful: 0, failed: 0 },
      aiReviews: { total: 0, successful: 0, failed: 0, fallback: 0 },
      services: {
        groq: { calls: 0, failures: 0, avgResponseTime: 0 },
        pinecone: { calls: 0, failures: 0, avgResponseTime: 0 },
        github: { calls: 0, failures: 0, avgResponseTime: 0 },
        database: { calls: 0, failures: 0, avgResponseTime: 0 }
      },
      errors: new Map<string, number>(),
      lastReset: new Date()
    };

    LoggingService.logInfo('metrics_reset', 'System metrics have been reset');
  }

  /**
   * Logs metrics summary
   */
  private static logMetricsSummary(): void {
    const summary = {
      aiReviews: MonitoringService.metrics.aiReviews,
      services: MonitoringService.getServiceMetricsSummary(),
      topErrors: MonitoringService.getTopErrors(5),
      uptime: Math.round(process.uptime())
    };

    LoggingService.logInfo(
      'metrics_summary',
      'Periodic metrics summary',
      summary
    );
  }

  /**
   * Gets service metrics summary
   */
  private static getServiceMetricsSummary(): Record<string, any> {
    const summary: Record<string, any> = {};
    
    Object.entries(MonitoringService.metrics.services).forEach(([serviceName, metrics]) => {
      summary[serviceName] = {
        calls: metrics.calls,
        failures: metrics.failures,
        successRate: metrics.calls > 0 ? ((metrics.calls - metrics.failures) / metrics.calls * 100).toFixed(2) + '%' : '0%',
        avgResponseTime: Math.round(metrics.avgResponseTime)
      };
    });

    return summary;
  }

  /**
   * Gets top errors by frequency
   */
  private static getTopErrors(limit: number): Array<{ code: string; count: number }> {
    return Array.from(MonitoringService.metrics.errors.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}

/**
 * System metrics structure
 */
interface SystemMetrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
  };
  aiReviews: {
    total: number;
    successful: number;
    failed: number;
    fallback: number;
  };
  services: {
    groq: ServiceMetrics;
    pinecone: ServiceMetrics;
    github: ServiceMetrics;
    database: ServiceMetrics;
  };
  errors: Map<string, number>;
  lastReset: Date;
}

/**
 * Service-specific metrics
 */
interface ServiceMetrics {
  calls: number;
  failures: number;
  avgResponseTime: number;
}

/**
 * Alert event structure
 */
interface AlertEvent {
  type: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}