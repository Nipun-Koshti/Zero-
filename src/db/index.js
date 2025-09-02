import { DB_NAME } from "../constants.js";
import mongoose from "mongoose";

const connectDB = async()=>{
    try{
        const connectionInstance = await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`);
        console.log("DB connected successfully");

        console.log("connectionInstance:",);
    }
    catch(err){
        console.error("error", err);
        process.exit(1);
    }

}

export default connectDB;   