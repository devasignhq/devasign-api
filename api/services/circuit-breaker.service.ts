/**
 * Circuit Breaker Service
 * Implements circuit breaker pattern for external service calls
 */
export class CircuitBreakerService {
    private static circuits: Map<string, CircuitBreaker> = new Map();

    /**
     * Gets or creates a circuit breaker for a service
     */
    static getCircuit(serviceName: string, options?: CircuitBreakerOptions): CircuitBreaker {
        if (!this.circuits.has(serviceName)) {
            this.circuits.set(serviceName, new CircuitBreaker(serviceName, options));
        }
        return this.circuits.get(serviceName)!;
    }

    /**
     * Executes operation through circuit breaker
     */
    static async execute<T>(
        serviceName: string,
        operation: () => Promise<T>,
        fallback?: () => Promise<T>
    ): Promise<T> {
        const circuit = this.getCircuit(serviceName);
        return circuit.execute(operation, fallback);
    }

    /**
     * Gets status of all circuits
     */
    static getCircuitStatus(): Record<string, CircuitState> {
        const status: Record<string, CircuitState> = {};
        for (const [name, circuit] of this.circuits) {
            status[name] = {
                state: circuit.getState(),
                failureCount: circuit.getFailureCount(),
                lastFailureTime: circuit.getLastFailureTime(),
                nextAttemptTime: circuit.getNextAttemptTime()
            };
        }
        return status;
    }

    /**
     * Resets all circuits (for testing or manual recovery)
     */
    static resetAll(): void {
        for (const circuit of this.circuits.values()) {
            circuit.reset();
        }
    }
}

/**
 * Circuit Breaker implementation
 */
class CircuitBreaker {
    private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
    private failureCount = 0;
    private lastFailureTime?: Date;
    private nextAttemptTime?: Date;
    private successCount = 0;

    constructor(
        private serviceName: string,
        private options: CircuitBreakerOptions = {}
    ) {
        this.options = {
            failureThreshold: 5,
            recoveryTimeout: 60000, // 1 minute
            monitoringPeriod: 300000, // 5 minutes
            halfOpenMaxCalls: 3,
            ...options
        };
        this.serviceName = serviceName;
    }

    /**
     * Executes operation through the circuit breaker
     */
    async execute<T>(
        operation: () => Promise<T>,
        fallback?: () => Promise<T>
    ): Promise<T> {
        if (this.state === "OPEN") {
            if (this.shouldAttemptReset()) {
                this.state = "HALF_OPEN";
                this.successCount = 0;
                console.log(`Circuit breaker for ${this.serviceName} moved to HALF_OPEN state`);
            } else {
                console.warn(`Circuit breaker for ${this.serviceName} is OPEN, using fallback`);
                if (fallback) {
                    return fallback();
                }
                throw new Error(`Circuit breaker is OPEN for service: ${this.serviceName}`);
            }
        }

        if (this.state === "HALF_OPEN" && this.successCount >= this.options.halfOpenMaxCalls!) {
            console.warn(`Circuit breaker for ${this.serviceName} is HALF_OPEN with max calls reached, using fallback`);
            if (fallback) {
                return fallback();
            }
            throw new Error(`Circuit breaker is HALF_OPEN and max calls reached for service: ${this.serviceName}`);
        }

        try {
            const result = await operation();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();

            // Check if we should use fallback after failure handling
            if (fallback) {
                // After onFailure(), check if circuit is now open or should be
                const shouldUseFallback = this.failureCount >= this.options.failureThreshold!;
                if (shouldUseFallback) {
                    console.warn(`Circuit breaker for ${this.serviceName} failed, using fallback:`, error);
                    return fallback();
                }
            }

            throw error;
        }
    }

    /**
     * Handles successful operation
     */
    private onSuccess(): void {
        this.failureCount = 0;

        if (this.state === "HALF_OPEN") {
            this.successCount++;

            if (this.successCount >= this.options.halfOpenMaxCalls!) {
                this.state = "CLOSED";
                this.successCount = 0;
                console.log(`Circuit breaker for ${this.serviceName} recovered to CLOSED state`);
            }
        }
    }

    /**
     * Handles failed operation
     */
    private onFailure(): void {
        this.failureCount++;
        this.lastFailureTime = new Date();

        if (this.state === "HALF_OPEN") {
            this.state = "OPEN";
            this.nextAttemptTime = new Date(Date.now() + this.options.recoveryTimeout!);
            console.warn(`Circuit breaker for ${this.serviceName} failed in HALF_OPEN, moving to OPEN state`);
        } else if (this.failureCount >= this.options.failureThreshold!) {
            this.state = "OPEN";
            this.nextAttemptTime = new Date(Date.now() + this.options.recoveryTimeout!);
            console.warn(`Circuit breaker for ${this.serviceName} opened due to ${this.failureCount} failures`);
        }
    }

    /**
     * Checks if circuit should attempt to reset
     */
    private shouldAttemptReset(): boolean {
        return this.nextAttemptTime ? Date.now() >= this.nextAttemptTime.getTime() : false;
    }

    /**
     * Gets current circuit state
     */
    getState(): "CLOSED" | "OPEN" | "HALF_OPEN" {
        return this.state;
    }

    /**
     * Gets failure count
     */
    getFailureCount(): number {
        return this.failureCount;
    }

    /**
     * Gets last failure time
     */
    getLastFailureTime(): Date | undefined {
        return this.lastFailureTime;
    }

    /**
     * Gets next attempt time
     */
    getNextAttemptTime(): Date | undefined {
        return this.nextAttemptTime;
    }

    /**
     * Manually resets the circuit breaker
     */
    reset(): void {
        this.state = "CLOSED";
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = undefined;
        this.nextAttemptTime = undefined;
        console.log(`Circuit breaker for ${this.serviceName} manually reset`);
    }
}

/**
 * Circuit breaker configuration options
 */
interface CircuitBreakerOptions {
    /** Number of failures before opening circuit */
    failureThreshold?: number;
    /** Time to wait before attempting recovery (ms) */
    recoveryTimeout?: number;
    /** Period for monitoring failures (ms) */
    monitoringPeriod?: number;
    /** Maximum calls allowed in half-open state */
    halfOpenMaxCalls?: number;
}

/**
 * Circuit state information
 */
export interface CircuitState {
    state: "CLOSED" | "OPEN" | "HALF_OPEN";
    failureCount: number;
    lastFailureTime?: Date;
    nextAttemptTime?: Date;
}
