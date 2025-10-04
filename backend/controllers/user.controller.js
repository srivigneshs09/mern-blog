import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import getDataUri from "../utils/dataUri.js";
import cloudinary from "../utils/cloudinary.js";


export const register = async (req, res) => {
    try {
        const { firstName, lastName, email,  password } = req.body;
        if (!firstName || !lastName || !email ||  !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            })
        }
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters"
            });
        }

        const existingUserByEmail = await User.findOne({ email: email });

        if (existingUserByEmail) {
            return res.status(400).json({ success: false, message: "Email already exists" });
        }

        // const existingUserByUsername = await User.findOne({ userName: userName });

        // if (existingUserByUsername) {
        //     return res.status(400).json({ success: false, message: "Username already exists" });
        // }

        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            firstName,
            lastName,
            email,
            password: hashedPassword
        })

        return res.status(201).json({
            success: true,
            message: "Account Created Successfully"
        })

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failed to register"
        })

    }
}

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log("Login attempt for:", email); // Debug log
        
        // Fix the condition - should be OR not AND
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Incorrect email or password"
            });
        }

        console.log("User found:", user.email); // Debug log

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid Credentials" 
            });
        }

        console.log("Password valid, generating token..."); // Debug log

        // Check if SECRET_KEY exists
        if (!process.env.SECRET_KEY) {
            console.error("SECRET_KEY is not defined in environment variables");
            return res.status(500).json({
                success: false,
                message: "Server configuration error"
            });
        }

        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, process.env.SECRET_KEY, { 
            expiresIn: '1d' 
        });

        console.log("Token generated successfully"); // Debug log

        // Set cookie with proper options for development
        const cookieOptions = {
            maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day
            httpOnly: true, // Fixed typo: was "httpsOnly"
            sameSite: 'lax', // More flexible than 'strict' for development
            secure: process.env.NODE_ENV === 'production' // Only secure in production
        };

        return res.status(200)
            .cookie("token", token, cookieOptions)
            .json({
                success: true,
                message: `Welcome back ${user.firstName}`,
                user: {
                    _id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email
                    // Don't send password
                }
            });

    } catch (error) {
        console.log("Login error details:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to Login",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export const logout = async (_, res) => {
    try {
        return res.status(200).cookie("token", "", { maxAge: 0 }).json({
            message: "Logged out successfully.",
            success: true
        })
    } catch (error) {
        console.log(error);
    }
}

export const updateProfile = async(req, res) => {
    try {
        const userId= req.id
        const {firstName, lastName, occupation, bio, instagram, facebook, linkedin, github} = req.body;
        const file = req.file;

        const fileUri = getDataUri(file)
        let cloudResponse = await cloudinary.uploader.upload(fileUri)

        const user = await User.findById(userId).select("-password")
        
        if(!user){
            return res.status(404).json({
                message:"User not found",
                success:false
            })
        }

        // updating data
        if(firstName) user.firstName = firstName
        if(lastName) user.lastName = lastName
        if(occupation) user.occupation = occupation
        if(instagram) user.instagram = instagram
        if(facebook) user.facebook = facebook
        if(linkedin) user.linkedin = linkedin
        if(github) user.github = github
        if(bio) user.bio = bio
        if(file) user.photoUrl = cloudResponse.secure_url

        await user.save()
        return res.status(200).json({
            message:"profile updated successfully",
            success:true,
            user
        })
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failed to update profile"
        })
    }
}

export const getAllUsers = async (req, res) => {
    try {
      const users = await User.find().select('-password'); // exclude password field
      res.status(200).json({
        success: true,
        message: "User list fetched successfully",
        total: users.length,
        users
      });
    } catch (error) {
      console.error("Error fetching user list:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch users"
      });
    }
  };