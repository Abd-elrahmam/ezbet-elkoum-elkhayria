const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

// كل الصور (الشعار، صورة الهيرو، صور الموظفين، صور الطلاب) بترفع مباشرة
// على Cloudinary بدل ما تتخزن على قرص السيرفر (اللي بيتمسح على Render/Railway)
// أو جوه الداتابيز نفسها (اللي كانت بتتقل بالـ base64). Cloudinary مجاني
// لحد حجم معقول وبيفضل ثابت مهما حصل للسيرفر.
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "bilal-elkhayria", // كل صور الموقع بتتحط في مجلد واحد منظم على Cloudinary
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
    // تصغير أي صورة أكبر من 1200x1200 تلقائيًا عشان توفير المساحة وسرعة التحميل
    transformation: [{ width: 1200, height: 1200, crop: "limit" }],
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/jpg"];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("الملف يجب أن يكون صورة (jpg, png, webp, gif)"));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

module.exports = upload;
