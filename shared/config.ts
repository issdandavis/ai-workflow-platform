/**
 * Application Configuration v2.0
 * 
 * Universal configuration file for branding and app settings.
 * This platform is designed for maximum adaptability - customize these values
 * to deploy as your own branded AI workflow solution.
 * 
 * @version 2.0.0
 * @license MIT
 * @adaptable true - All values can be overridden via environment variables
 */

// Environment-aware configuration loader
const getEnvOrDefault = (key: string, defaultValue: string): string => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || defaultValue;
  }
  return defaultValue;
};

export const APP_CONFIG = {
  // === PLATFORM METADATA ===
  version: "2.0.0",
  buildDate: new Date().toISOString(),
  adaptable: true,
  
  // === BRANDING (Override via env: APP_NAME, APP_SHORT_NAME, etc.) ===
  name: getEnvOrDefault("APP_NAME", "AI Workflow Platform"),
  shortName: getEnvOrDefault("APP_SHORT_NAME", "AI Platform"),
  description: getEnvOrDefault("APP_DESCRIPTION", "Universal multi-AI orchestration platform with workflow automation, autonomy mode, and enterprise security"),
  tagline: getEnvOrDefault("APP_TAGLINE", "Orchestrate AI. Automate Everything. Self-Improve."),
  
  // === COMPANY INFO ===
  company: {
    name: "Your Company",
    website: "https://yourcompany.com",
    support: "support@yourcompany.com",
    twitter: "@yourcompany",
  },
  
  // === THEME ===
  theme: {
    primaryColor: "#6366f1", // Indigo
    accentColor: "#8b5cf6",  // Purple
  },
  
  // === FEATURES (Toggle via env: FEATURE_SHOPIFY=true, etc.) ===
  features: {
    enableShopify: getEnvOrDefault("FEATURE_SHOPIFY", "true") === "true",
    enableStripe: getEnvOrDefault("FEATURE_STRIPE", "true") === "true",
    enableAutonomyMode: getEnvOrDefault("FEATURE_AUTONOMY", "true") === "true",
    enableDeveloperMode: getEnvOrDefault("FEATURE_DEVELOPER", "true") === "true",
    enableRoundtable: getEnvOrDefault("FEATURE_ROUNDTABLE", "true") === "true",
    enableWorkflows: getEnvOrDefault("FEATURE_WORKFLOWS", "true") === "true",
    enableSelfImprovement: getEnvOrDefault("FEATURE_SELF_IMPROVE", "true") === "true",
    enableMultiTenant: getEnvOrDefault("FEATURE_MULTI_TENANT", "true") === "true",
    enableApiAccess: getEnvOrDefault("FEATURE_API_ACCESS", "true") === "true",
  },
  
  // === PRICING (customize for your business) ===
  pricing: {
    currency: "USD",
    plans: {
      free: {
        name: "Free",
        price: 0,
        features: ["5 AI requests/day", "Basic integrations", "Community support"],
      },
      starter: {
        name: "Starter",
        price: 19,
        features: ["100 AI requests/day", "All integrations", "Email support"],
      },
      pro: {
        name: "Pro",
        price: 49,
        features: ["Unlimited AI requests", "Priority support", "Custom workflows"],
      },
      enterprise: {
        name: "Enterprise",
        price: null, // Contact sales
        features: ["Custom deployment", "SLA", "Dedicated support"],
      },
    },
  },
  
  // === API LIMITS ===
  limits: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxRequestsPerMinute: 60,
    sessionTimeout: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  
  // === SUPPORTED AI PROVIDERS (Extensible - add your own) ===
  aiProviders: [
    { id: "openai", name: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo", "o1-preview", "o1-mini"], tier: "premium" },
    { id: "anthropic", name: "Anthropic", models: ["claude-3-5-sonnet", "claude-3-haiku", "claude-3-opus"], tier: "premium" },
    { id: "google", name: "Google AI", models: ["gemini-pro", "gemini-pro-vision", "gemini-2.0-flash"], tier: "standard" },
    { id: "groq", name: "Groq", models: ["llama-3.1-70b", "mixtral-8x7b", "llama-3.2-90b"], tier: "free" },
    { id: "xai", name: "xAI", models: ["grok-beta", "grok-2"], tier: "premium" },
    { id: "perplexity", name: "Perplexity", models: ["pplx-70b-online", "pplx-sonar"], tier: "standard" },
    { id: "ollama", name: "Ollama (Local)", models: ["llama3", "mistral", "codellama"], tier: "free" },
    { id: "custom", name: "Custom Provider", models: [], tier: "custom" },
  ],
  
  // === INTEGRATIONS (Extensible - add custom integrations) ===
  integrations: [
    { id: "github", name: "GitHub", category: "development", icon: "github" },
    { id: "notion", name: "Notion", category: "productivity", icon: "notion" },
    { id: "google_drive", name: "Google Drive", category: "storage", icon: "drive" },
    { id: "dropbox", name: "Dropbox", category: "storage", icon: "dropbox" },
    { id: "onedrive", name: "OneDrive", category: "storage", icon: "onedrive" },
    { id: "slack", name: "Slack", category: "communication", icon: "slack" },
    { id: "zapier", name: "Zapier", category: "automation", icon: "zapier" },
    { id: "discord", name: "Discord", category: "communication", icon: "discord" },
    { id: "jira", name: "Jira", category: "development", icon: "jira" },
    { id: "linear", name: "Linear", category: "development", icon: "linear" },
    { id: "figma", name: "Figma", category: "design", icon: "figma" },
    { id: "custom_webhook", name: "Custom Webhook", category: "automation", icon: "webhook" },
  ],
  
  // === DEPLOYMENT MODES ===
  deploymentModes: {
    standalone: { name: "Standalone", description: "Single instance deployment" },
    saas: { name: "SaaS", description: "Multi-tenant cloud deployment" },
    enterprise: { name: "Enterprise", description: "On-premise with custom integrations" },
    embedded: { name: "Embedded", description: "White-label integration into other apps" },
  },
};

// Export individual configs for convenience
export const { name: APP_NAME, shortName: APP_SHORT_NAME, description: APP_DESCRIPTION } = APP_CONFIG;
export const { company: COMPANY_INFO } = APP_CONFIG;
export const { features: FEATURES } = APP_CONFIG;
export const { pricing: PRICING } = APP_CONFIG;
export const { limits: LIMITS } = APP_CONFIG;
export const { aiProviders: AI_PROVIDERS } = APP_CONFIG;
export const { integrations: INTEGRATIONS } = APP_CONFIG;
export const { deploymentModes: DEPLOYMENT_MODES } = APP_CONFIG;

// Helper function to check if a feature is enabled
export const isFeatureEnabled = (feature: keyof typeof APP_CONFIG.features): boolean => {
  return APP_CONFIG.features[feature] ?? false;
};

// Helper to get provider by ID
export const getProviderById = (id: string) => {
  return APP_CONFIG.aiProviders.find(p => p.id === id);
};

// Helper to get integration by ID
export const getIntegrationById = (id: string) => {
  return APP_CONFIG.integrations.find(i => i.id === id);
};

// Type exports for TypeScript consumers
export type AIProvider = typeof APP_CONFIG.aiProviders[number];
export type Integration = typeof APP_CONFIG.integrations[number];
export type PricingPlan = keyof typeof APP_CONFIG.pricing.plans;
export type FeatureFlag = keyof typeof APP_CONFIG.features;
