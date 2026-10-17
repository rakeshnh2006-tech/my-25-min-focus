import { Router } from 'express';
import { getTasks, createTask, updateTask, deleteTask } from '../controllers/tasksController';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { createTaskSchema, updateTaskSchema } from '../validation/schemas';

const router = Router();

router.use(requireAuth);

router.get('/', getTasks);
router.post('/', validateBody(createTaskSchema), createTask);
router.patch('/:id', validateBody(updateTaskSchema), updateTask);
router.delete('/:id', deleteTask);

export default router;
