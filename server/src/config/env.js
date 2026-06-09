import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_JWT_SECRET = 'litflow-dev-secret';
const DEFAULT_ADMIN_JWT_SECRET = 'litflow-admin-dev-secret';
const PLACEHOLDER_SECRET_PREFIX = 'replace_with_';

function parseBoolean(value, fallback = false) {
  if (value === undefined) {
    return fallback;
  }

  return `${value}`.trim().toLowerCase() === 'true';
}

function isPlaceholderSecret(value = '') {
  return value.trim().toLowerCase().startsWith(PLACEHOLDER_SECRET_PREFIX);
}

function assertStrongSecret(name, value, { minLength = 32 } = {}) {
  if (!value || value.length < minLength || isPlaceholderSecret(value)) {
    throw new Error(`${name} must be a non-placeholder secret with at least ${minLength} characters.`);
  }
}

function warnWeakDevelopmentSecret(name, value, { defaultValue = '', minLength = 32 } = {}) {
  if (value === defaultValue || value.length < minLength || isPlaceholderSecret(value)) {
    console.warn(`${name} is weak for production. Use a long random value before deployment.`);
  }
}

export const env = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  appName: process.env.APP_NAME || 'LitFlow',
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  jwtSecret: process.env.JWT_SECRET || DEFAULT_JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  adminJwtSecret: process.env.ADMIN_JWT_SECRET || DEFAULT_ADMIN_JWT_SECRET,
  adminJwtExpiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '12h',
  adminSeedEmail: process.env.ADMIN_SEED_EMAIL || 'admin@litflow.app',
  adminSeedPassword: process.env.ADMIN_SEED_PASSWORD || '',
  adminSeedName: process.env.ADMIN_SEED_NAME || 'LitFlow Admin',
  adminSeedRecoveryEnabled: parseBoolean(process.env.ADMIN_SEED_RECOVERY_ENABLED, false),
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: `${process.env.SMTP_SECURE || 'false'}` === 'true',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || 'LitFlow <no-reply@litflow.local>',
  semanticScholarApiKey: process.env.SEMANTIC_SCHOLAR_API_KEY || '',
  semanticScholarBaseUrl:
    process.env.SEMANTIC_SCHOLAR_BASE_URL || 'https://api.semanticscholar.org/graph/v1',
  openAiApiKey: process.env.OPENAI_API_KEY || '',
  openAiModel: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
  openAiInputCostPer1M: Number(process.env.OPENAI_INPUT_COST_PER_1M || 0.15),
  openAiOutputCostPer1M: Number(process.env.OPENAI_OUTPUT_COST_PER_1M || 0.6),
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
  razorpayProPlanId: process.env.RAZORPAY_PRO_PLAN_ID || '',
  razorpaySubscriptionCount: Number(process.env.RAZORPAY_SUBSCRIPTION_COUNT || 12)
};

export const isProduction = env.nodeEnv === 'production';

if (isProduction) {
  [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET',
    'ADMIN_JWT_SECRET',
    'CLIENT_URL',
    'ADMIN_SEED_EMAIL',
    'ADMIN_SEED_PASSWORD'
  ].forEach((name) => {
    if (!process.env[name]) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
  });

  if (env.jwtSecret === DEFAULT_JWT_SECRET) {
    throw new Error('JWT_SECRET must not use the development fallback in production.');
  }

  if (env.adminJwtSecret === DEFAULT_ADMIN_JWT_SECRET) {
    throw new Error('ADMIN_JWT_SECRET must not use the development fallback in production.');
  }

  assertStrongSecret('JWT_SECRET', env.jwtSecret);
  assertStrongSecret('ADMIN_JWT_SECRET', env.adminJwtSecret);
  assertStrongSecret('ADMIN_SEED_PASSWORD', env.adminSeedPassword, { minLength: 12 });

  if (!env.smtpHost || !env.smtpUser || !env.smtpPass || !env.smtpFrom) {
    throw new Error('SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM are required in production for OTP delivery.');
  }
}

if (!env.adminSeedPassword) {
  throw new Error('ADMIN_SEED_PASSWORD is required to seed the admin account safely.');
}

if (!isProduction) {
  warnWeakDevelopmentSecret('JWT_SECRET', env.jwtSecret, { defaultValue: DEFAULT_JWT_SECRET });
  warnWeakDevelopmentSecret('ADMIN_JWT_SECRET', env.adminJwtSecret, {
    defaultValue: DEFAULT_ADMIN_JWT_SECRET
  });
  warnWeakDevelopmentSecret('ADMIN_SEED_PASSWORD', env.adminSeedPassword, { minLength: 12 });
}
