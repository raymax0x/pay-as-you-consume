import { Router } from 'express';
import * as controller from './controller';

const router = Router();

router.get('/', controller.getActiveContent);
router.get('/:contentId', controller.getContentById);

export { router as contentRoutes };