import { Router } from 'express';
import { createCourse, getAllCourses, getLecturesByCourseId,updateCourse ,removeCourse, addLectureToCourseById} from '../controllers/course.controller.js'; // Corrected import path
import { authorizeRoles, isLoggedIn } from '../middlewares/auth.middlewares.js';
import upload from '../middlewares/multer.middlewares.js'
const router = Router(); 

router.route('/')
.get(getAllCourses)
.post(
isLoggedIn,
authorizeRoles('ADMIN'),
upload.single('lecture'),
createCourse
);

router.route('/:id')
.get(isLoggedIn, getLecturesByCourseId)
.put(
isLoggedIn,
authorizeRoles('ADMIN'),
updateCourse)

.delete( 
    isLoggedIn,
    authorizeRoles('ADMIN'),
removeCourse)

.post(
    isLoggedIn,
    authorizeRoles('ADMIN'),
    upload.single('thumbnail'),
    addLectureToCourseById
  )



export default router;
