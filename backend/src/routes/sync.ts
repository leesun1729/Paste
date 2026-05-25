import { Router } from 'express';
import { syncController } from '../controllers/syncController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);
router.post('/', syncController.sync);

export default router;
