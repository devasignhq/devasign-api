/**
 * Intelligent Context Configuration Service
 * Manages configuration for intelligent context fetching features
 * Requirements: 6.1, 6.4
 */

export interface IntelligentContextConfig {
    enabled: boolean;
    maxProcessingTime: number;
    fallbackOnError: boolean;
    enableMetrics: boolean;
}

export interface IntelligentContextFeatureFlags {
    useAIContextAnalysis: boolean;
    enableSelectiveFileFetching: boolean;
    enableRepositoryStructureAnalysis: boolean;
    enableRawCodeChangesExtraction: boolean;
    enableEnhancedContextBuilder: boolean;
}

/**
 * Service for managing intelligent context configuration
 */
export class IntelligentContextConfigService {
    private static instance: IntelligentContextConfigService;
    private config: IntelligentContextConfig;
    private featureFlags: IntelligentContextFeatureFlags;

    private constructor() {
        this.config = this.loadConfigFromEnvironment();
        this.featureFlags = this.loadFeatureFlagsFromEnvironment();
    }

    public static getInstance(): IntelligentContextConfigService {
        if (!IntelligentContextConfigService.instance) {
            IntelligentContextConfigService.instance = new IntelligentContextConfigService();
        }
        return IntelligentContextConfigService.instance;
    }

    /**
     * Gets current intelligent context configuration
     */
    public getConfig(): IntelligentContextConfig {
        return { ...this.config };
    }

    /**
     * Gets current feature flags
     */
    public getFeatureFlags(): IntelligentContextFeatureFlags {
        return { ...this.featureFlags };
    }

    /**
     * Updates configuration (runtime changes)
     */
    public updateConfig(updates: Partial<IntelligentContextConfig>): void {
        this.config = { ...this.config, ...updates };
        console.log('Intelligent context configuration updated:', this.config);
    }

    /**
     * Updates feature flags (runtime changes)
     */
    public updateFeatureFlags(updates: Partial<IntelligentContextFeatureFlags>): void {
        this.featureFlags = { ...this.featureFlags, ...updates };
        console.log('Intelligent context feature flags updated:', this.featureFlags);
    }

    /**
     * Checks if intelligent context is enabled
     */
    public isEnabled(): boolean {
        return this.config.enabled;
    }

    /**
     * Checks if a specific feature is enabled
     */
    public isFeatureEnabled(feature: keyof IntelligentContextFeatureFlags): boolean {
        return this.featureFlags[feature];
    }

    /**
     * Gets configuration for external services
     */
    public getServiceConfig() {
        return {
            timeout: this.config.maxProcessingTime,
            enableFallback: this.config.fallbackOnError,
            enableMetrics: this.config.enableMetrics,
            features: this.featureFlags
        };
    }

    /**
     * Validates configuration
     */
    public validateConfig(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (this.config.maxProcessingTime < 10000) {
            errors.push('maxProcessingTime should be at least 10 seconds (10000ms)');
        }

        if (this.config.maxProcessingTime > 600000) {
            errors.push('maxProcessingTime should not exceed 10 minutes (600000ms)');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Reloads configuration from environment variables
     */
    public reloadFromEnvironment(): void {
        this.config = this.loadConfigFromEnvironment();
        this.featureFlags = this.loadFeatureFlagsFromEnvironment();
        console.log('Intelligent context configuration reloaded from environment');
    }

    /**
     * Gets configuration summary for logging/monitoring
     */
    public getConfigSummary() {
        return {
            enabled: this.config.enabled,
            maxProcessingTimeSeconds: Math.round(this.config.maxProcessingTime / 1000),
            fallbackOnError: this.config.fallbackOnError,
            metricsEnabled: this.config.enableMetrics,
            featuresEnabled: Object.entries(this.featureFlags)
                .filter(([_, enabled]) => enabled)
                .map(([feature, _]) => feature),
            validation: this.validateConfig()
        };
    }

    /**
     * Loads configuration from environment variables
     */
    private loadConfigFromEnvironment(): IntelligentContextConfig {
        return {
            enabled: process.env.INTELLIGENT_CONTEXT_ENABLED !== 'false',
            maxProcessingTime: parseInt(process.env.MAX_INTELLIGENT_CONTEXT_TIME || '120000'),
            fallbackOnError: process.env.FALLBACK_ON_INTELLIGENT_CONTEXT_ERROR !== 'false',
            enableMetrics: process.env.ENABLE_INTELLIGENT_CONTEXT_METRICS !== 'false'
        };
    }

    /**
     * Loads feature flags from environment variables
     */
    private loadFeatureFlagsFromEnvironment(): IntelligentContextFeatureFlags {
        return {
            useAIContextAnalysis: process.env.INTELLIGENT_CONTEXT_AI_ANALYSIS !== 'false',
            enableSelectiveFileFetching: process.env.INTELLIGENT_CONTEXT_SELECTIVE_FETCHING !== 'false',
            enableRepositoryStructureAnalysis: process.env.INTELLIGENT_CONTEXT_REPO_STRUCTURE !== 'false',
            enableRawCodeChangesExtraction: process.env.INTELLIGENT_CONTEXT_CODE_EXTRACTION !== 'false',
            enableEnhancedContextBuilder: process.env.INTELLIGENT_CONTEXT_ENHANCED_BUILDER !== 'false'
        };
    }
}