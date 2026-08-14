const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, default: "site_settings", unique: true },
    logoUrl: { type: String, default: "" },
    heroImageUrl: { type: String, default: "" },
    heroTitle: { type: String, default: "جمعية العلوم الخيرية بعزبة الكوم" },
    heroSubtitle: { type: String, default: "نظام إدارة الحضانة والكتاب" },
    aboutText: {
      type: String,
      default: "جمعية خيرية تُعنى بتحفيظ القرآن الكريم ورعاية الأطفال، تضم فروعًا متعددة تخدم أبناء المنطقة.",
    },
    whatsappNumber: { type: String, default: "201021330018" }, // رقم تواصل الجمعية - قابل للتعديل من الأدمن
  },
  { timestamps: true }
);

module.exports = mongoose.model("Setting", settingSchema);
