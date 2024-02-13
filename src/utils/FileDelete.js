import cloudinary from 'cloudinary';

export const deleteOnCloudinary = async(FilePath)=>{
  try {
        const result = await cloudinary.v2.api.delete_resources([FilePath], { type: 'upload', resource_type: 'image' });
        console.log(result);
    } catch (error) {
        console.error(error);
    }
    }