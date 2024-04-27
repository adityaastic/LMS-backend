import User from "../models/user.model.js";
import AppError from "../utils/error.utils.js";
import cloudinary from 'cloudinary';
import fs from 'fs/promises';
import sendEmail from "../utils/sendEmail.js";
import crypto from 'crypto';

const cookieOptions = {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: true
};

const register = async (req, res, next) => {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
        return next(new AppError('All fields are required', 400));
    }

    try {
        const userExists = await User.findOne({ email });

        if (userExists) {
            return next(new AppError('Email already exists', 400));
        }

        const user = await User.create({
            fullName,
            email,
            password,
            avatar: {
                public_id: email,
                secure_url: 'https://res.cloudinary.com/du9jzql' // Add the complete URL here
            }
        });

        if (!user) {
            return next(new AppError('User registration failed, please try again', 400));
        }

        // Run only if user sends a file
        if (req.file) {
            try {
                const result = await cloudinary.v2.uploader.upload(req.file.path, {
                    folder: 'lms', // Save files in a folder named lms
                    width: 250,
                    height: 250,
                    gravity: 'faces', // This option tells cloudinary to center the image around detected faces (if any) after cropping or resizing the original image
                    crop: 'fill',
                });

                // If success
                if (result) {
                    // Set the public_id and secure_url in DB
                    user.avatar.public_id = result.public_id;
                    user.avatar.secure_url = result.secure_url;

                    // After successful upload remove the file from local storage
                    fs.rm(`uploads/${req.file.filename}`);
                }
            } catch (error) {
                return next(
                    new AppError(error || 'File not uploaded, please try again', 400)
                );
            }
        }

        await user.save();

        user.password = undefined;

        const token = await user.generateJWTToken();

        res.cookie('token', token, cookieOptions);

        // Optionally, you can return a success response or handle any other logic here after creating the user.
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: user // You might want to exclude sensitive data like password before sending it in response
        });
    } catch (error) {
        return next(new AppError('Failed to register user', 500));
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return next(new AppError('All fields are required', 400));
        }

        const user = await User.findOne({ email }).select('+password');

        if (!user || !(await user.comparePassword(password))) {
            return next(new AppError('Email or password does not match', 400));
        }

        const token = await user.generateJWTToken();
        user.password = undefined;

        res.cookie('token', token, cookieOptions);

        res.status(200).json({
            success: true,
            message: 'User logged in successfully',
            user,
        });
    } catch (error) {
        return next(new AppError(error.message, 500));
    }
};

const logout = (req, res) => {
    res.cookie('token', null, {
        secure: true,
        maxAge: 0,
        httpOnly: true
    });

    res.status(200).json({
        success: true,
        message: 'User logged out successfully'
    });
};

const getProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return next(new AppError('User not found', 404));
        }

        res.status(200).json({
            success: true,
            message: 'User details',
            user
        });
    } catch (e) {
        return next(new AppError('Failed to fetch profile', 500));
    }
};

const forgotPassword = async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        return next(new AppError('Email is required', 400));
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return next(new AppError('Email not registered', 400));
        }

        const resetToken = await user.generatePasswordResetToken();

        await user.save();

        const resetPasswordURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

        // Define subject and message variables
        const subject = 'Reset Password';
        const message = `You can reset your password by clicking <a href=${resetPasswordURL} target="_blank">Reset your password</a>\nIf the above link does not work for some reason then copy paste this link in new tab ${resetPasswordURL}.\n If you have not requested this, kindly ignore.`;

        await sendEmail(email, subject, message);

        res.status(200).json({
            success: true,
            message: `Reset password token has been sent to ${email} successfully`
        });
    } catch (e) {
        // If an error occurs, reset user's reset token and expiry
        user.forgotPasswordExpiry = undefined;
        user.forgotPasswordToken = undefined;

        await user.save();
        return next(new AppError(e.message, 500));
    }
};

const resetPassword = async (req, res, next) => {
    // Extracting resetToken from req.params object
    const { resetToken } = req.params;
  
    // Extracting password from req.body object
    const { password } = req.body;
  
    // We are again hashing the resetToken using sha256 since we have stored our resetToken in DB using the same algorithm
    const forgotPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
  
    // Check if password is not there then send response saying password is required
    if (!password) {
      return next(new AppError('Password is required', 400));
    }
  
    console.log(forgotPasswordToken);
  
    // Checking if token matches in DB and if it is still valid(Not expired)
    const user = await User.findOne({
      forgotPasswordToken,
      forgotPasswordExpiry: { $gt: Date.now() }, // $gt will help us check for greater than value, with this we can check if token is valid or expired
    });
  
    // If not found or expired send the response
    if (!user) {
      return next(
        new AppError('Token is invalid or expired, please try again', 400)
      );
    }
  
    // Update the password if token is valid and not expired
    user.password = password;
  
    // making forgotPassword* valus undefined in the DB
    user.forgotPasswordExpiry = undefined;
    user.forgotPasswordToken = undefined;
  
    // Saving the updated user values
    await user.save();
  
    // Sending the response when everything goes good
    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
};

 const changePassword = async (req, res, next) => {
    // Destructuring the necessary data from the req object
    const { oldPassword, newPassword } = req.body;
    const { id } = req.user; // because of the middleware isLoggedIn
  
    // Check if the values are there or not
    if (!oldPassword || !newPassword) {
      return next(
        new AppError('Old password and new password are required', 400)
      );
    }
  
    // Finding the user by ID and selecting the password
    const user = await User.findById(id).select('+password');
  
    // If no user then throw an error message
    if (!user) {
      return next(new AppError('Invalid user id or user does not exist', 400));
    }
  
    // Check if the old password is correct
    const isPasswordValid = await user.comparePassword(oldPassword);
  
    // If the old password is not valid then throw an error message
    if (!isPasswordValid) {
      return next(new AppError('Invalid old password', 400));
    }
  
    // Setting the new password
    user.password = newPassword;
  
    // Save the data in DB
    await user.save();
  
    // Setting the password undefined so that it won't get sent in the response
    user.password = undefined;
  
    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  };




 const updateUser = async (req, res, next) => {
    // Destructuring the necessary data from the req object
    const { fullName } = req.body;
    const { id } = req.params;
  
    const user = await User.findById(id);
  
    if (!user) {
      return next(new AppError('Invalid user id or user does not exist'));
    }
  
    if (fullName) {
      user.fullName = fullName;
    }
  
    // Run only if user sends a file
    if (req.file) {
      // Deletes the old image uploaded by the user
      await cloudinary.v2.uploader.destroy(user.avatar.public_id);
  
      try {
        const result = await cloudinary.v2.uploader.upload(req.file.path, {
          folder: 'lms', // Save files in a folder named lms
          width: 250,
          height: 250,
          gravity: 'faces', // This option tells cloudinary to center the image around detected faces (if any) after cropping or resizing the original image
          crop: 'fill',
        });
  
        // If success
        if (result) {
          // Set the public_id and secure_url in DB
          user.avatar.public_id = result.public_id;
          user.avatar.secure_url = result.secure_url;
  
          // After successful upload remove the file from local storage
          fs.rm(`uploads/${req.file.filename}`);
        }
      } catch (error) {
        return next(
          new AppError(error || 'File not uploaded, please try again', 400)
        );
      }
    }
  
    // Save the user object
    await user.save();
  
    res.status(200).json({
      success: true,
      message: 'User details updated successfully',
    });
  };

// Exporting functions
export { register, login, logout, getProfile, forgotPassword, resetPassword, changePassword ,updateUser };
