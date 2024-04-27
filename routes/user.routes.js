import { Router } from "express";
import { changePassword, forgotPassword, getProfile, login, logout, register, resetPassword, updateUser } from "../controllers/user.controller.js";
import { isLoggedIn } from "../middlewares/auth.middlewares.js";
import upload from "../middlewares/multer.middlewares.js";

const router = Router();

router.post('/register', upload.single("avatar"), register);
router.post('/login', login);
router.get('/logout', logout);
router.post('/reset', forgotPassword);
router.post('/reset/:resetToken', resetPassword);
router.post("/change-password", isLoggedIn, changePassword);
router.put("/update/:id", isLoggedIn, upload.single("avatar"), updateUser);

export default router;
