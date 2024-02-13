import {asyncHandler} from "../utils/AsyncHandler.js"
import { ErrorHandler } from "../utils/ErrorHandler.js";
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/FileUpload.js"
import { ResponseHandler } from "../utils/ResponseHandler.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";
import { deleteOnCloudinary } from "../utils/FileDelete.js";


const options = {
        httpOnly:true, 
        secure:true
}

const generateAccessAndRefreshTokens = async (userId)=>{
    try {
        const user = await User.findById(userId)
        const refreshToken = user.generateRefreshToken();
        const accessToken = user.generateAccessToken();

        user.refreshToken = refreshToken;

        await user.save(
            {
                validateBeforeSave:false
            }
        )
        return {accessToken,refreshToken};

    } catch (error) {
        throw new ErrorHandler(500,"Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler(async (req,res)=>{
    const {fullName,email,username,password} = req.body;
    if([fullName,email,username,password].some((field)=>field?.trim()==="")){
        throw new ErrorHandler(400,"All fields are required");
    }
    if(email.indexOf('@')===-1){
        throw new ErrorHandler(400,"Enter correct email")
    }
    const existedUser = await User.findOne({
        $or: [{ username },{ email }]
    })

    if(existedUser){
        console.log("Existed User",existedUser);
        throw new ErrorHandler(409,"User already exists+")
    }
    console.log("Body:",req.body);
    console.log("files:",req.files);
    const localAvatarPath = req.files?.avatar[0]?.path
    let localCoverImagePath = ""
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        localCoverImagePath = req.files.coverImage[0].path
    }


    if(!localAvatarPath){
        throw new ErrorHandler(400,"Avatar file is required");
    }
    const avatar = await uploadOnCloudinary(localAvatarPath);
    const coverImage = await uploadOnCloudinary(localCoverImagePath);
    console.log(avatar)
    console.log(coverImage)
    if(!avatar){
        throw new ErrorHandler(400,"Avatar file is not uploaded");
    }

   const user = await User.create({
        fullName,
        avatar:[avatar.url,avatar.public_id],
        coverImage:[coverImage?.url || "",coverImage?.public_id||""],
        email,
        password,
        username: username.toLowerCase()
    })
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    console.log(createdUser)
    
    if(!createdUser){
        throw new ErrorHandler(500,"Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ResponseHandler(200,createdUser,"User registered successfully")
    )

});

const loginUser = asyncHandler(async (req,res)=>{
    //get user username/email and password from the user using forms
    //find the username/email inthe db
    //if username is found then checkwhether the password matches
    //if username is present and the password matches login the user else give proper message
    
    const {email,username,password} = req.body;
    console.log(email)
    console.log(req.body)
    if(!username && !email){
        throw new ErrorHandler(400,"username or email required")
    }
    const user = await User.findOne(
        {
            $or: [{username},{email}]
        }
    )
    if(!user){
        throw new ErrorHandler(404,"User does not exist")
    }
    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new(401,"Invalid user credentials")
    }
    const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
    
   
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ResponseHandler(
            200,
            {
                user:loggedInUser,accessToken,refreshToken
            },
            "User logged in successfully"
        )
    )
})

const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset:{
                refreshToken:1
            }
        },
        {
            new: true
        } 
    )
    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ResponseHandler(200,{},"User logged out successfully"));
 
    
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
   const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken ;

   if ( !incomingRefreshToken ) {
        throw new ErrorHandler(401,"Unauthorized request");
   }

  try {
     const decodedToken = jwt.verify(
          incomingRefreshToken,
          process.env.REFRESH_TOKEN_SECRET
      )
      const user = await User.findById(decodedToken?._id)
  
      if(!user){
          throw new ErrorHandler(401,"Invalid refresh token");
      }
  
      if(incomingRefreshToken !== user?.refreshToken){
          throw new ErrorHandler(401,"Refresh token is expired or used");
      }
      const {newAccessToken,newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
      return res
      .status(200)
      .cookie("accessToken",newAccessToken,options)
      .cookie("refreshToken",newRefreshToken,options)
      .json(
          new ResponseHandler(
              200,
             {accessToken:newAccessToken, refreshToken:newRefreshToken},
             "Access Token refreshed"
          )
      )
  } catch (error) {
    throw new ErrorHandler(401,error?.message||"Invalid refresh message")
  }



})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword, newPassword} = req.body;

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    
    if(!isPasswordCorrect){
        throw new ErrorHandler(400,"Invalid old password");
    }
    
    user.password = newPassword;

    await user.save({validateBeforeSave:false})

    return res.status(200).json(new ResponseHandler(200,{},"Password changed successfully"));
})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res.status(200).json(200,req.user,"Current user fetched successfully");
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullName} = req.body;

    if(!fullName){
        throw new ErrorHandler(400,"All fields are required");
    
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName
            }
        },
        {
            new:true
        }
    ).select("-password")
    console.log(user)
    return res.status(200).
    json(
        new ResponseHandler(200,user,"Full name updated successfully")
        );
})

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path
    if (!avatarLocalPath) {
        throw new ErrorHandler(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if (!avatar.url) {
        throw new ErrorHandler(400, "Error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: [avatar.url,avatar.public_id]
            }
        },
        {new: true}
    ).select("-password")
    console.log(user)

    deleteOnCloudinary(req.user.avatar[1])
    
    return res
    .status(200)
    .json(
        new ResponseHandler(200, user, "Avatar image updated successfully")
    )
})

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ErrorHandler(400, "Cover image file is missing")
    }


    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ErrorHandler(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: [coverImage.url,coverImage.public_id]
            }
        },
        {new: true}
    ).select("-password")

    if(req.user.coverImage){
        deleteOnCloudinary(req.user.coverImage[1]);
    } 

    return res
    .status(200)
    .json(
        new ResponseHandler(200, user, "Cover image updated successfully")
    )
})


const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const { username } = req.params;

    if(!username?.trim()){
        throw new ErrorHandler(400,"username is missing");
    }

    const channel = await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()
            }
        },{
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size: "$subscribers"
                },
                channelsSubscribedToCount:{
                    $size:"subscribedTo"
                },
                isSubscribed: {
                    $cond:{
                        if:{$in:[req.user?._id,"$subscribers.subscriber"]},
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
                isSubscribed:1, 
                subscriberCount:1,
                channelsSubscribedToCount:1,
                avatar:1,
                coverImage:1,
                email:1
            }
        }

    ])

    console.log(channel)

    if(!channel?.length){
        throw new ErrorHandler(404,"channel does not exist")
    }

    return res
    .status(200)
    .json(
        new ResponseHandler(200,channel[0],"user channel fetched successfully")
    )
})

const getWatchHistory = asyncHandler(async(req,res)=>{
    const user = await User.aggregate([
        {
            mathc:{
                _id:new mongoose.Types.ObjectId(req.user._id)
            }
        },{
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        avatar:1,
                                        fullName:1,
                                        username:1
                                    }
                                }
                            ]
                        }
                    },{
                        addField:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        },{

        }
    ])
    return res
    .status(200)
    .json(
        new ResponseHandler(
            200,
            user[0].watchHistory,
            "Watch History fetched successfully"
        )
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserCoverImage,
    updateUserAvatar,
    getUserChannelProfile,

}
