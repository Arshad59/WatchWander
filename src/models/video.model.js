import {Schema,model} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
    {
        videoFile:{
            type:String,
            required:true,
        },
        thumbnail:{
            typr:String,
            required:true
        },
        title:{
            typr:String,
            required:true
        },
        description:{
            typr:String,
            required:true
        },
        duration:{
            typr:Number,
            required:true
        },
        views:{
            type:Number,
            default:0
        },
        isPublished:{
            type:Boolean,
            default:true
        },
        owner:{
            type:Schema.types.ObjectId,
            ref:"User"
        }
    },{
        timestamps:true
    }
)
videoSchema.plugin(mongooseAggregatePaginate);



export const Video = model("Video",videoSchema);