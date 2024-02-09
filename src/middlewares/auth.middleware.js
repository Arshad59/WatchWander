import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { ErrorHandler } from "../utils/ErrorHandler.js";
import jwt from "jsonwebtoken";

export const verify_jwt = asyncHandler(async(req,res,next)=>{
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","");
    if(!token){
        throw new ErrorHandler(401,"Unauthorized request");
    }
    try {
        const decodedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
        if(!user){
            throw new ErrorHandler(401,"Invalid Access Token")
        }
        req.user = user;
        next();
    } catch (error) {
        throw new ErrorHandler(401,error?.message||"Invalid access token")
    }
});