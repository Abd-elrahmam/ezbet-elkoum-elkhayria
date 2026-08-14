const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/bilal_ibn_rabah";
    await mongoose.connect(uri);
    console.log("✅ MongoDB متصل بنجاح");
  } catch (err) {
    console.error("❌ فشل الاتصال بقاعدة البيانات:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
