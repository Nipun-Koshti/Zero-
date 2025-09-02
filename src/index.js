
import express from "express";
import dotenv from "dotenv";
import connectDB from "./db/index.js";

dotenv.config({
    path: "./.env"
});



connectDB();



const app = express();

//ifi
// (async()=> {

//     try{
//        await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`)
//        app.on('error',(err)=>{
//         console.error("Error in DB connection");
//         throw err;
//        })

//        app.listen(process.env.PORT,()=>{
//         console.log(`Server is running on port ${process.env.PORT}`);
//        })
//     }
//     catch(err){
//         console.error("Error:", err );
//         throw err;
//     }

// })();

