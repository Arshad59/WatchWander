import mongoose from "mongoose";
import {DB_NAME} from "../constant.js";

const connectDB = async () =>{
    try{
        const conn = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`\n MongoDB connected. DB_HOST:${conn.connection.host}`);
    }catch(error){
        console.log("MONGODB connection error", error)
        process.exit(1)
    }
}
export default connectDB;


// if db is to be connected in src/index.js
// ( async () => {
//     try{
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//         app.on("error",(error)=>{
//             console.log("ERROR: ",error);
//             throw(error)
//         })
//         app.listen(process.env.PORT,()=>{
//             console.log(`App is listening on port ${process.env.PORT}`)
//         })
//     }   
//     catch(error){
//         console.error("ERROR: ",error)
//         throw err
//     }
// })()