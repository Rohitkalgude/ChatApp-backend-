import mongoose from "mongoose";

const ConnectDB = async () => {
   try {
      await mongoose.connect(process.env.MONGODB_URL);
      console.log("Database connect Succeffully");
   } catch (error) {
      console.log("Database is not connect", error.messsage);
      process.exit();
   }
};

export default ConnectDB;
