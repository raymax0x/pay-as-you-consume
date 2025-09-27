import { Router } from 'express';
import * as controller from './controller';

const router = Router();

router.get('/:userAddress/balance', controller.getUserBalance);
router.get('/:userAddress/stats', controller.getUserStats);

export { router as userRoutes };