import { Router } from 'express';
import { clipboardController } from '../controllers/clipboardController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', clipboardController.list);
router.get('/stats', clipboardController.stats);
router.get('/:id', clipboardController.getById);
router.post('/', clipboardController.create);
router.patch('/:id', clipboardController.update);
router.delete('/bulk', clipboardController.bulkDelete);
router.delete('/:id', clipboardController.delete);
router.post('/:id/favorite', clipboardController.toggleFavorite);

export default router;
