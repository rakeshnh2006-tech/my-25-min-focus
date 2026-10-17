import { Router } from 'express';
import { getSubjects, createSubject, updateSubject, deleteSubject } from '../controllers/subjectsController';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { createSubjectSchema, updateSubjectSchema } from '../validation/schemas';

const router = Router();

router.use(requireAuth);

router.get('/', getSubjects);
router.post('/', validateBody(createSubjectSchema), createSubject);
router.patch('/:id', validateBody(updateSubjectSchema), updateSubject);
router.delete('/:id', deleteSubject);

export default router;
