import Course from "../models/course.model.js"; // Corrected import path
import AppError from "../utils/error.utils.js";

const getAllCourses = async function(req, res, next) {
    try {
        const courses = await Course.find({}).select('-lectures');
        res.status(200).json({
            success: true,
            message: 'All courses',
            courses
        });
    } catch (error) {
        return next(error);
    }
};

const getLecturesByCourseId = async function(req, res, next) {
    try {
        const { id } = req.params;

        const course = await Course.findById(id);
        if(!course){
            return next(
              new AppError('invaild course id',400)
            )
        }


        res.status(200).json({
            success: true,
            message: 'Course lectures fetched successfully',
            lectures: course.lectures // Make sure 'lectures' is the correct property name in your Course model
        });
    } catch (e) {
        return next(new AppError(e.message, 500)); // Added missing closing parenthesis for 'next' function
    }
};


export { getAllCourses, getLecturesByCourseId };
