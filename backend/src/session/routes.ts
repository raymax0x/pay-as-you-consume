import { Router } from 'express';
import * as controller from './controller';

const router = Router();

// Session management routes
router.post('/start', controller.startSession);
router.post('/pause', controller.pauseSession);
router.post('/resume', controller.resumeSession);
router.post('/stop', controller.stopSession);

// Session query routes
router.get('/:sessionId', controller.getSession);
router.get('/user/:userAddress/active', controller.getUserActiveSessions);
router.get('/user/:userAddress/history', controller.getUserSessionHistory);

export { router as sessionRoutes };