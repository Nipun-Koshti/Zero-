import {Router} from 'express';
import { LoginUser, logoutUser, refreshAccessToken, registerUser } from '../controllers/user.controller.js';
import upload from '../middlewares/multer.middleware.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';


const router = Router();


router.route("/register").post(
    upload.fields([
        {
            name:"avtar",
            maxCount:1
        },
        {
            name:"coverPhoto",
            maxCount:1
        }  
    ]),
    registerUser
);


router.route("/login").post(LoginUser);


router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);

export default router;