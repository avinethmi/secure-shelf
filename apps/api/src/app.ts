import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { env, isProduction } from './config/env.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { originCheck } from './middleware/originCheck.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { authRouter } from './modules/auth/routes.js';
import { usersRouter } from './modules/users/routes.js';
import { auditRouter } from './modules/audit/routes.js';
import { policiesRouter } from './modules/policies/routes.js';

// Proposal §4, Figure 1: the API is the trust boundary. Everything security-relevant
// (headers, origin policy, body limits) is configured here, once, before any route.
export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', false);

  // 1. HTTP hardening headers. CSP is tightened in Phase 6 once the asset list is final.
  app.use(
    helmet({
      contentSecurityPolicy: isProduction
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
              fontSrc: ["'self'", 'https://fonts.gstatic.com'],
              imgSrc: ["'self'", 'data:'],
              connectSrc: ["'self'"],
              frameAncestors: ["'none'"],
              objectSrc: ["'none'"],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // 2. CORS allowlist. Only the Vite dev origin in development; nothing in the demo build
  //    because the SPA is served from this same origin.
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || env.CORS_ORIGINS.includes(origin)) return cb(null, true);
        return cb(new Error('Origin not allowed by CORS'));
      },
      credentials: true,
    }),
  );

  // 3. Body and cookie parsing. 10 kB is plenty for every JSON body in this app; evidence
  //    uploads use multipart on their own route with their own limit.
  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());

  // 4. CSRF backstop: state-changing requests must carry an Origin/Referer we recognise.
  app.use(originCheck);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'secureshelf-api', time: new Date().toISOString() });
  });

  app.use('/api', apiLimiter);
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/audit', auditRouter);
  app.use('/api/policies', policiesRouter);
  // Phase 3+: training, compliance, cctv, incidents, dashboard.

  // 5. In the demo build the compiled SPA is served from the API on one origin.
  const webDist = path.resolve(process.cwd(), '../web/dist');
  if (isProduction && fs.existsSync(webDist)) {
    app.use(express.static(webDist, { index: false, maxAge: '1h' }));
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.sendFile(path.join(webDist, 'index.html'));
    });
  }

  app.use('/api', notFound);
  app.use(errorHandler);
  return app;
}
