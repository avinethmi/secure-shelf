import { Router } from 'express';
import { createUserSchema, updateUserSchema, setUserStatusSchema, idParamSchema } from '@secureshelf/shared';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { clientIp } from '../../lib/tokens.js';
import * as svc from './service.js';

export const usersRouter = Router();

// Every route here needs users.manage (plan A1: Owner + Security Admin).
usersRouter.use(authenticate, requirePermission('users.manage'));

const actor = (req: Parameters<typeof clientIp>[0]) => ({ id: req.user!.id, role: req.user!.role });
const meta = (req: Parameters<typeof clientIp>[0]) => ({ ip: clientIp(req) });
const idOf = (req: { params: unknown }) => (req.params as { id: number }).id;

usersRouter.get('/', async (_req, res, next) => {
  try {
    res.json({ users: await svc.listUsers(false) });
  } catch (e) {
    next(e);
  }
});

usersRouter.get('/lockouts', async (_req, res, next) => {
  try {
    res.json({ users: await svc.listLockouts() });
  } catch (e) {
    next(e);
  }
});

usersRouter.post('/', validate({ body: createUserSchema }), async (req, res, next) => {
  try {
    res.status(201).json({ user: await svc.createUser(req.body, actor(req), meta(req)) });
  } catch (e) {
    next(e);
  }
});

// Reveal decrypts NIC / phone / contact for this one record; the list endpoint masks them.
usersRouter.get('/:id', validate({ params: idParamSchema }), async (req, res, next) => {
  try {
    res.json({ user: await svc.getUser(idOf(req), true), sessions: await svc.listSessions(idOf(req)) });
  } catch (e) {
    next(e);
  }
});

usersRouter.patch('/:id', validate({ params: idParamSchema, body: updateUserSchema }), async (req, res, next) => {
  try {
    res.json({ user: await svc.updateUser(idOf(req), req.body, actor(req), meta(req)) });
  } catch (e) {
    next(e);
  }
});

usersRouter.patch('/:id/status', validate({ params: idParamSchema, body: setUserStatusSchema }), async (req, res, next) => {
  try {
    const { status, reason } = req.body as { status: 'active' | 'suspended' | 'offboarded'; reason?: string };
    res.json({ user: await svc.setStatus(idOf(req), status, reason, actor(req), meta(req)) });
  } catch (e) {
    next(e);
  }
});

usersRouter.post('/:id/unlock', validate({ params: idParamSchema }), async (req, res, next) => {
  try {
    res.json({ user: await svc.unlock(idOf(req), actor(req), meta(req)) });
  } catch (e) {
    next(e);
  }
});

usersRouter.post('/:id/reset-2fa', validate({ params: idParamSchema }), async (req, res, next) => {
  try {
    res.json({ user: await svc.resetTotp(idOf(req), actor(req), meta(req)) });
  } catch (e) {
    next(e);
  }
});
