import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const registerUser = asyncHandler(async (req, res) => {
    const {fullName, username, email, password} = req.body;

    if(
        [fullName, username, email, password].some(field => field?.trim() === "")
    ){
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = User.findOne({
        $or : [{username}, {email}]
    })

    if(existedUser){
        throw new ApiError(409, "User already exists with this username or email");
    }

    const avatarLocalPath = registerUser.files?.avatar[0]?.path;
    const coverPhotoLocalPath = registerUser.files?.coverPhoto[0]?.path;

    if(!avatarLocalPath ){
        throw new ApiError(400, "Avtar is required");
    }


    const avatar = await uploadOnCloudinary(avatarLocalPath);

    const coverPhoto = await uploadOnCloudinary(coverPhotoLocalPath);

    if(!avatar){
        throw new ApiError(400, "Error while uploading avtar");
    }

    const user = await User.create({fullName, username: username.toLowerCase(), email, password, avtar: avatar.url, coverimage: coverPhoto?.url||""})

    const userCeated = await User.findById(user._id).select("-password  -refreshToken");

    if(!userCeated){
        throw new ApiError(500, "User registration failed");
    }


    return res.status(201).json(new ApiResponse(201, "User registered successfully", userCeated));


})

export {registerUser};