const cloudinary = require("cloudinary").v2;

// بيانات الاتصال بـ Cloudinary لازم تتحط في ملف .env (شوف .env.example)
// تقدر تجيبها من https://cloudinary.com/console بعد عمل حساب مجاني
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.warn(
    "⚠️  إعدادات Cloudinary غير مكتملة في .env - رفع الصور (الشعار، صور الموظفين والطلاب) مش هيشتغل لحد ما تضيف CLOUDINARY_CLOUD_NAME وCLOUDINARY_API_KEY وCLOUDINARY_API_SECRET"
  );
}

module.exports = cloudinary;
