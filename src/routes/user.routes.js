import { Router } from "express";
import {
    loginUser,
    logoutUser,
    registerUser,
    refreshAccessToken,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getCurrentUser
} from "../controllers/user.controller.js"
import { upload } from "../middlewares/multer.middleware.js";
import { verify_jwt } from "../middlewares/auth.middleware.js";
const router = Router()

// http:localhost:8000/api/v1/users/register
router.route("/register").post(
    upload.fields([
        {
            name:'avatar',
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }
    ]),
    registerUser
    )

router.route("/login").post(loginUser)


router.route("/logout").post(verify_jwt,logoutUser)
router.route("/refreshtoken").post(refreshAccessToken)
router.route("/current-user").get(verify_jwt, getCurrentUser)
router.route("/update-account").patch(verify_jwt, updateAccountDetails)

router.route("/avatar").patch(verify_jwt, upload.single("avatar"), updateUserAvatar)
router.route("/cover-image").patch(verify_jwt, upload.single("coverImage"), updateUserCoverImage)


export default router;