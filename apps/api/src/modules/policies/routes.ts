import { Router } from 'express';
import {
  approveSchema,
  createPolicySchema,
  createVersionSchema,
  idParamSchema,
  publishSchema,
  requestChangesSchema,
  updateVersionSchema,
  versionIdParamSchema,
  type Role,
} from '@secureshelf/shared';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { clientIp } from '../../lib/tokens.js';
import * as svc from './service.js';

export const policiesRouter = Router();
policiesRouter.use(authenticate);

type Req = Parameters<typeof clientIp>[0];
const caller = (req: Req) => ({ id: req.user!.id, role: req.user!.role });
const meta = (req: Req) => ({ ip: clientIp(req) });
const idOf = (req: { params: unknown }) => (req.params as { id: number }).id;
const vidOf = (req: { params: unknown }) => (req.params as { vid: number }).vid;

// Register (Owner / Security Admin). Plan A2: the three lifecycle permissions between them.
const manage = requirePermission('policy.write', 'policy.approve', 'policy.publish');

policiesRouter.get('/', manage, async (_req, res, next) => {
  try {
    res.json({ policies: await svc.listPolicies() });
  } catch (e) {
    next(e);
  }
});

// FR-09: what I must read. Registered before /:id so "assigned" is never parsed as an id.
policiesRouter.get('/assigned', requirePermission('policy.read'), async (req, res, next) => {
  try {
    res.json({ policies: await svc.listAssigned(caller(req)) });
  } catch (e) {
    next(e);
  }
});

policiesRouter.post('/', requirePermission('policy.write'), validate({ body: createPolicySchema }), async (req, res, next) => {
  try {
    res.status(201).json(await svc.createPolicy(req.body, caller(req), meta(req)));
  } catch (e) {
    next(e);
  }
});

// Version routes -------------------------------------------------------------------------

policiesRouter.get('/versions/:vid', requirePermission('policy.read'), validate({ params: versionIdParamSchema }), async (req, res, next) => {
  try {
    res.json(await svc.getVersion(vidOf(req), caller(req)));
  } catch (e) {
    next(e);
  }
});

policiesRouter.patch('/versions/:vid', requirePermission('policy.write'), validate({ params: versionIdParamSchema, body: updateVersionSchema }), async (req, res, next) => {
  try {
    res.json({ version: await svc.updateVersion(vidOf(req), req.body, caller(req), meta(req)) });
  } catch (e) {
    next(e);
  }
});

policiesRouter.post('/versions/:vid/submit', requirePermission('policy.write'), validate({ params: versionIdParamSchema }), async (req, res, next) => {
  try {
    res.json({ version: await svc.submitVersion(vidOf(req), caller(req), meta(req)) });
  } catch (e) {
    next(e);
  }
});

policiesRouter.post('/versions/:vid/request-changes', requirePermission('policy.approve'), validate({ params: versionIdParamSchema, body: requestChangesSchema }), async (req, res, next) => {
  try {
    res.json({ version: await svc.requestChanges(vidOf(req), (req.body as { note: string }).note, caller(req), meta(req)) });
  } catch (e) {
    next(e);
  }
});

policiesRouter.post('/versions/:vid/approve', requirePermission('policy.approve'), validate({ params: versionIdParamSchema, body: approveSchema }), async (req, res, next) => {
  try {
    res.json({ version: await svc.approveVersion(vidOf(req), (req.body as { note?: string }).note, caller(req), meta(req)) });
  } catch (e) {
    next(e);
  }
});

policiesRouter.post('/versions/:vid/publish', requirePermission('policy.publish'), validate({ params: versionIdParamSchema, body: publishSchema }), async (req, res, next) => {
  try {
    res.json({ version: await svc.publishVersion(vidOf(req), (req.body as { roles: Role[] }).roles, caller(req), meta(req)) });
  } catch (e) {
    next(e);
  }
});

// NFR-08: one request, no body. The reader UI is read -> tick -> this call.
policiesRouter.post('/versions/:vid/acknowledge', requirePermission('policy.read'), validate({ params: versionIdParamSchema }), async (req, res, next) => {
  try {
    res.json(await svc.acknowledgeVersion(vidOf(req), caller(req), meta(req)));
  } catch (e) {
    next(e);
  }
});

// Policy routes --------------------------------------------------------------------------

policiesRouter.get('/:id', requirePermission('policy.read'), validate({ params: idParamSchema }), async (req, res, next) => {
  try {
    res.json(await svc.getPolicy(idOf(req), caller(req)));
  } catch (e) {
    next(e);
  }
});

policiesRouter.post('/:id/versions', requirePermission('policy.write'), validate({ params: idParamSchema, body: createVersionSchema }), async (req, res, next) => {
  try {
    res.status(201).json({ version: await svc.createVersion(idOf(req), req.body, caller(req), meta(req)) });
  } catch (e) {
    next(e);
  }
});

policiesRouter.get('/:id/acknowledgements', manage, validate({ params: idParamSchema }), async (req, res, next) => {
  try {
    res.json(await svc.acknowledgementStatus(idOf(req)));
  } catch (e) {
    next(e);
  }
});
