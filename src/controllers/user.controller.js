import {asyncHandler} from "../utils/AsyncHandler.js"
import { ErrorHandler } from "../utils/ErrorHandler.js";
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/FileUpload.js"
import { ResponseHandler } from "../utils/ResponseHandler.js";

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
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
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
    if(!username || !email){
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

    const options = {
        httpOnly:true, //makes the cookie modifiable only in server
        secure:true
    }
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
            $set:{
                refreshToken:undefined
            }
        },
        {
            new: true
        } 
    )
    const options = {
        httpOnly:true, //makes the cookie modifiable only in server
        secure:true
    }
    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ResponseHandler(200,{},"User logged out successfully"));

    
})


export {registerUser,loginUser,logoutUser}