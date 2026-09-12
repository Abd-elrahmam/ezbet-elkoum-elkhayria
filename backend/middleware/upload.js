const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "bilal-elkhayria",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif", "svg"],
    resource_type: "image",
    transformation: [
      {
        quality: "auto:best",
        fetch_format: "auto",
      },
    ],
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    "image/jpeg", "image/png", "image/webp",
    "image/gif", "image/jpg", "image/svg+xml",
  ];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("الملف يجب أن يكون صورة (jpg, png, webp, gif, svg)"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = upload;