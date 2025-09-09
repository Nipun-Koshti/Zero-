import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";


export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        const token = req.cookies?.ACCESSTOKEN || req.header("Authorization")?.replace("Bearer ", "");
    
        if(!token){
            throw new ApiError(401, "Unauthorized access, token missing");
        }
    
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
        const user = await User.findById(decoded?._id).select("-password -refreshToken -__v");
    
        if(!user){
            throw new ApiError(401, "Unauthorized access, user not found");
        }
    
        req.user = user;
        next(); 


    } catch (error) {
        throw new ApiError(401, error?.messsage || "Unauthorized access");
    }
});