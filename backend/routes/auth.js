const express = require("express");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

const router = express.Router();

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// حماية من محاولات تخمين كلمة المرور (brute-force): 10 محاولات كحد أقصى كل 15 دقيقة لكل IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "محاولات تسجيل دخول كثيرة جدًا، حاول مرة أخرى بعد قليل" },
  standardHeaders: true,
  legacyHeaders: false,
});

// تسجيل الدخول
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "من فضلك أدخل اسم المستخدم وكلمة المرور" });
    }
    const user = await User.findOne({ username: username.toLowerCase() }).populate("branch", "name");
    if (!user || !user.active) {
      return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
    }
    const token = signToken(user._id);
    res.json({ token, user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: "حدث خطأ أثناء تسجيل الدخول", error: err.message });
  }
});

// بيانات المستخدم الحالي
router.get("/me", protect, async (req, res) => {
  const user = await User.findById(req.user._id).populate("branch", "name");
  res.json({ user: user.toSafeObject() });
});

// تغيير كلمة المرور الخاصة بالمستخدم الحالي
router.put("/change-password", protect, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) return res.status(400).json({ message: "كلمة المرور القديمة غير صحيحة" });
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل" });
    }
    user.password = newPassword;
    await user.save();
    res.json({ message: "تم تغيير كلمة المرور بنجاح" });
  } catch (err) {
    res.status(500).json({ message: "حدث خطأ", error: err.message });
  }
});

module.exports = router;
