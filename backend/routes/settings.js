const express = require("express");
const Setting = require("../models/Setting");
const upload = require("../middleware/upload");
const { protect, allowRoles } = require("../middleware/auth");
const { ROLES } = require("../utils/constants");

const router = express.Router();

const getOrCreateSettings = async () => {
  let settings = await Setting.findOne({ key: "site_settings" });
  if (!settings) settings = await Setting.create({ key: "site_settings" });
  return settings;
};

// إعدادات الموقع عامة (متاحة بدون تسجيل دخول عشان تظهر في اللاندينج بيج)
router.get("/", async (req, res) => {
  const settings = await getOrCreateSettings();
  res.json(settings);
});

// تعديل الإعدادات النصية (الأدمن الرئيسي فقط)
router.put("/", protect, allowRoles(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    const allowedFields = ["heroTitle", "heroSubtitle", "aboutText", "whatsappNumber"];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) settings[field] = req.body[field];
    });
    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(400).json({ message: "فشل حفظ الإعدادات", error: err.message });
  }
});

// رفع/تغيير الشعار
router.put("/logo", protect, allowRoles(ROLES.SUPER_ADMIN), upload.single("logo"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "لم يتم إرسال أي صورة" });
    const settings = await getOrCreateSettings();
    settings.logoUrl = `/uploads/${req.file.filename}`;
    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(400).json({ message: "فشل رفع الشعار", error: err.message });
  }
});

// رفع/تغيير صورة الهيرو في اللاندينج بيج
router.put("/hero-image", protect, allowRoles(ROLES.SUPER_ADMIN), upload.single("heroImage"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "لم يتم إرسال أي صورة" });
    const settings = await getOrCreateSettings();
    settings.heroImageUrl = `/uploads/${req.file.filename}`;
    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(400).json({ message: "فشل رفع الصورة", error: err.message });
  }
});

module.exports = router;
