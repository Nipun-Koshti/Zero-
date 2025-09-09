import asyncHandler from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";


const generateAccessAndRefreshToken = async(userId) => {
    try{
        const user = await User.findById(userId);
        if(!user){
            throw new ApiError(404, "User not found");
        }

        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken;

        await user.save({validateBeforeSave: false});

        return {accessToken, refreshToken};
    }
    catch(err){
        throw new ApiError(500, "Error while generating tokens");
    }
}

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

const LoginUser = asyncHandler(async (req, res) => {
    //take the email and password from the request body
    //validate the email in the sytem 
    //compare the passwordd 
    //genrate the access token and refresh token
    //send the response

    const {email, password, username} = req.body;

    if(!email && !username){
        throw new ApiError(400, "Email or username is required");
    }

    if([email,password,username].some(field => field.trim()=="")){
        throw new ApiError(400, "All fields are required");
    }

    const user = User.findOne({
        $or:[{username: username?.toLowerCase()}, {email: email?.toLowerCase()}]
    }); 

    if(!user){
        throw new ApiError(404, "User not found with this email");
    }

    const passwordMatch = await user.isPasswordCorrect(password);

    if(!passwordMatch){
        throw new ApiError(401, "Invalid credentials");
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    if(!loggedInUser){
        throw new ApiError(500, "Error while logging in");
    }

    const options = {
        httpOnly: true,
        secure:true,
    }

    return res.status(200)
    .cookie("ACCESSTOKEN",accessToken,options)
    .cookie("RefreshTOKEN",refreshToken,options)
    .json(new ApiResponse(200, "User logged in successfully", {accessToken, refreshToken}));

});


const logoutUser = asyncHandler(async (req, res) => {
    const user = req.user._id;

    await User.findByIdAndUpdate(user, {$set:{ refreshToken:undefined}}, {new:true});

    const options = {
        httpOnly: true,
        secure:true,
    }

    return res.status(200).clearCookie("ACCESSTOKEN",options).clearCookie("RefreshTOKEN",options).json(new ApiResponse(200, "User logged out successfully"));

});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incommingRefreshToken = req.cookie.RefreshTOKEN || req.body.RefreshTOKEN;

  if(!incommingRefreshToken){
    throw new ApiError(401, "Unauthorized access")
  }

  try {
    const decodedToken = jwt.verify(incommingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
  
    const user = await User.findById(decodedToken?._id);
  
    if(!user || user?.refreshToken !== incommingRefreshToken){
      throw new ApiError(401, "Refesh token mismatch - Unauthorized access");
    }
  
    const options = {
      httpOnly: true,
      secure:true,
    }
  
    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);
  
          
    return res.status(200).cookie("ACCESSTOKEN",accessToken,options)
    .cookie("RefreshTOKEN",refreshToken,options)
    .json(new ApiResponse(200, "Access token refreshed successfully", {accessToken, refreshToken}));

    
  } catch (error) {

    throw new ApiError(401, error.message||"Invalid refresh token - Unauthorized access");
    
  }

});

const changeCurrentUserPassword = asyncHandler(async (req, res) =>{
    const {oldPassword, newPasswor} = req.body;

     if([oldPassword, newPasswor].some(field => field?.trim() === "")){
        throw new ApiError(400, "All fields are required");
    }

    const id = req.user?._id;

    const user = await User.findById(id);

    if(!user){
        throw new ApiError(404, "User not found");
    }

    if(!(await user.isPasswordCorrect(oldPassword))){
        throw new ApiError(400, "Old password is incorrect");
    }


    user.password = newPasswor;
    await user.save({validateBeforeSave:true}); 

    return res.status(200).json(new ApiResponse(200, "Password changed successfully"));

   
} );


const currentUser = asyncHandler(async (req, res) => {
    const user =  req.user;

    return res.status(200).json(200, "Current user fetched successfully", user);
});


const updateAccountDetails = asyncHandler(async (req, res) => {
    const {fullName, email} = req.body;

    if([fullName, email].some(field => field?.trim() === "")){
        throw new ApiError(400, "All fields are required");
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{fullName, email}
        },
        {new:true}
    ).select("-password -refreshToken");

    return res.status(200).json(new ApiResponse(200, "User details updated successfully", updatedUser));    

});


const updateUserAvatar = asyncHandler(async (req, res) => {

    const avatarLocalPath = req.files?.avatar[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avtar is required");
    }   

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url){
        throw new ApiError(400, "Error while uploading avtar");
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{avtar: avatar.url}
        },
        {new:true}
    ).select("-password -refreshToken");

    return res.status(200).json(new ApiResponse(200, "User avtar updated successfully", updatedUser));

});

const updateUserCoverImage = asyncHandler(async (req, res) => {

    const coverImageLocalPath = req.files?.avatar[0]?.path;

    if(!coverImageLocalPath ){
        throw new ApiError(400, "Avtar is required");
    }   

    const coverImage = await uploadOnCloudinary(coverImageLocalPath );

    if(!coverImage.url){
        throw new ApiError(400, "Error while uploading avtar");
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{coverimage: coverImage.url}
        },
        {new:true}
    ).select("-password -refreshToken");

    return res.status(200).json(new ApiResponse(200, "User coverImage updated successfully", updatedUser));

});

const getUserChannelProfile = asyncHandler(async (req, res) => {

    const {username} = req.params;

    if(!username || username?.trim() === ""){
        throw new ApiError(400, "Username is required");
    }

    const channel = await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscription",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"

            }
        },
        {
            $lookup:{
                from:"subscription",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{$size:"$subscribers"},
                subscribedToCount:{$size:"$subscribedTo"},

                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id, "$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{
                fullName:1,
                username:1,
                email:1,
                subscribersCount:1,
                subscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverimage:1,
            }
        }
    ])

    if(!channel || channel.length === 0){
        throw new ApiError(404, "Channel not found with this username");
    }


    return res.status(200).json(new ApiResponse(200, "Channel profile fetched successfully", channel[0]));



});


const getWatchHistory = asyncHandler(async(req,res)=>{

    const id = req.user._id;
    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(id)

            }
        },
        {
            $lookup:{
                from: "videos",
                localField: "watchHistory",
                foreignField:"_id",
                as: "watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"user",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",

                            pipeline:[
                                {
                                    $project:{
                                        fullName:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },

                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])


    return res.status(200).json(new ApiResponse(200,"Watch history fetched successfully", user[0].watchHistory))
});



export {registerUser, LoginUser, logoutUser, refreshAccessToken , changeCurrentUserPassword, currentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile,getWatchHistory};       