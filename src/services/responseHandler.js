const responseHandler = (res, statusCode, success, message, data = null) => {
   try {
      if (!res) {
         console.error("Response object missing in responseHandler");
         return;
      }

      return res.status(statusCode).json({ success, message, data });
   } catch (error) {
      console.error("Error in responseHandler", error.message);
      return res.status(500).json({success: false, message: "Internal Server Error in responseHandler"})
   }
};

export default responseHandler;
