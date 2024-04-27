import { Router } from 'express';
import { getAllCourses, getLecturesByCourseId } from '../controllers/course.controller.js'; // Corrected import path
import { isLoggedIn } from '../middlewares/auth.middlewares.js';

const router = Router(); // Added closing parenthesis

router.get('/', getAllCourses);
router.get('/:id',isLoggedIn, getLecturesByCourseId);

export default router;
