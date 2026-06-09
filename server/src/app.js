import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import routes from './routes/index.js';

const app = express();
app.disable('x-powered-by');

const allowedOrigins = env.clientUrl
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.set('trust proxy', 1);
app.use(
  cors({
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 60 * 60,
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    }
  })
);
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'no-referrer' },
    hsts:
      env.nodeEnv === 'production'
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
          }
        : false
  })
);
app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ extended: true, limit: '4mb' }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.originalUrl.startsWith('/api/admin')
});

const adminApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 240,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many admin requests. Please slow down and try again shortly.'
  }
});

const adminWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 80,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => ['GET', 'HEAD', 'OPTIONS'].includes(req.method),
  message: {
    success: false,
    message: 'Too many admin changes submitted. Wait a moment before trying again.'
  }
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many OTP attempts. Please try again shortly.'
  }
});

const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 90,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many search requests. Please wait a moment before searching again.'
  }
});

const aiSummaryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many AI summary requests. Please slow down and try again shortly.'
  }
});

const billingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many billing requests. Please wait a moment before trying again.'
  }
});

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    service: env.appName,
    status: 'ok',
    uptimeSeconds: Math.round(process.uptime()),
    services: {
      databaseConfigured: Boolean(env.supabaseUrl && env.supabaseServiceRoleKey),
      otpDelivery: env.smtpHost && env.smtpUser && env.smtpPass ? 'email' : 'preview',
      semanticScholar: env.semanticScholarApiKey ? 'remote' : 'local-fallback',
      aiSummary: env.openAiApiKey ? 'openai' : 'local-fallback',
      billing: env.razorpayKeyId && env.razorpayKeySecret ? 'configured' : 'not-configured'
    }
  });
});

app.use('/api/send-otp', otpLimiter);
app.use('/api/verify-otp', otpLimiter);
app.use('/api/search-papers', searchLimiter);
app.use('/api/ai/summarize-paper', aiSummaryLimiter);
app.use('/api/billing/create-subscription', billingLimiter);
app.use('/api/billing/verify-subscription', billingLimiter);
app.use('/api/admin', adminApiLimiter, adminWriteLimiter);
app.use('/api', apiLimiter, routes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
