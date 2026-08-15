const express = require("express");
const User = require("../models/User");
const { protect, allowRoles } = require("../middleware/auth");
const { ROLES } = require("../utils/constants");
const upload = require("../middleware/upload");
const fs = require("fs");
const path = require("path");

const deleteOldPhoto = (photoUrl) => {
  if (!photoUrl || !photoUrl.startsWith("/uploads/")) return;
  const filePath = path.join(__dirname, "..", photoUrl);
  fs.unlink(filePath, () => {});
};

const router = express.Router();
router.use(protect);

// جلب المستخدمين: الأدمن يشوف الكل، مدير الفرع يشوف موظفين فرعه فقط
router.get("/", async (req, res) => {
  const filter = {};
  if (req.user.role === ROLES.SUPER_ADMIN) {
    if (req.query.branch) filter.branch = req.query.branch;
    if (req.query.role) filter.role = req.query.role;
  } else if (req.user.role === ROLES.BRANCH_MANAGER) {
    filter.branch = req.user.branch;
    filter.role = ROLES.EMPLOYEE; // مدير الفرع يشوف الموظفين بس، مش مديرين تانيين
  } else {
    // الموظف يشوف نفسه بس
    filter._id = req.user._id;
  }
  if (req.query.department) filter.department = { $in: [req.query.department, "both"] };

  const users = await User.find(filter).select("-password").populate("branch", "name").sort({ name: 1 });
  res.json(users);
});

router.get("/:id", async (req, res) => {
  const user = await User.findById(req.params.id).select("-password").populate("branch", "name");
  if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });
  res.json(user);
});

// إنشاء مستخدم جديد
// الأدمن الرئيسي: يقدر ينشئ مدير فرع أو موظف لأي فرع
// مدير الفرع: يقدر ينشئ موظف بس، وفي فرعه هو
router.post("/", allowRoles(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER), async (req, res) => {
  try {
    const payload = { ...req.body };
    if (req.user.role === ROLES.BRANCH_MANAGER) {
      payload.role = ROLES.EMPLOYEE;
      payload.branch = req.user.branch;
    } else if (payload.role === ROLES.SUPER_ADMIN) {
      payload.branch = null;
    }
    const user = await User.create(payload);
    res.status(201).json(user.toSafeObject());
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "اسم المستخدم مستخدم بالفعل" });
    }
    res.status(400).json({ message: "فشل إنشاء المستخدم", error: err.message });
  }
});

router.put("/:id", allowRoles(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER), async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: "المستخدم غير موجود" });

    if (req.user.role === ROLES.BRANCH_MANAGER) {
      if (
        target._id.toString() === req.user._id.toString() ||
        target.role !== ROLES.EMPLOYEE ||
        target.branch?.toString() !== req.user.branch.toString()
      ) {
        return res.status(403).json({ message: "لا يمكنك تعديل هذا المستخدم" });
      }
      delete req.body.role;
      delete req.body.branch;
    }

    const payload = { ...req.body };
    if (payload.password === "") delete payload.password; // منع مسح الباسورد بالغلط
    // تغيير كلمة مرور مستخدم آخر مسموح للأدمن الرئيسي فقط
    if (req.user.role !== ROLES.SUPER_ADMIN) delete payload.password;

    Object.assign(target, payload);
    await target.save();
    res.json(target.toSafeObject());
  } catch (err) {
    res.status(400).json({ message: "فشل تعديل المستخدم", error: err.message });
  }
});

router.delete("/:id", allowRoles(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER), async (req, res) => {
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ message: "المستخدم غير موجود" });

  if (req.user.role === ROLES.BRANCH_MANAGER) {
    if (
      target._id.toString() === req.user._id.toString() ||
      target.role !== ROLES.EMPLOYEE ||
      target.branch?.toString() !== req.user.branch.toString()
    ) {
      return res.status(403).json({ message: "لا يمكنك حذف هذا المستخدم" });
    }
  }
  await target.deleteOne();
  res.json({ message: "تم حذف المستخدم" });
});

// رفع صورة المستخدم
router.put("/:id/photo", allowRoles(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER), upload.single("photo"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "لم يتم إرسال أي صورة" });
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ message: "المستخدم غير موجود" });
  if (req.user.role === ROLES.BRANCH_MANAGER) {
    if (
      target._id.toString() === req.user._id.toString() ||
      target.role !== ROLES.EMPLOYEE ||
      target.branch?.toString() !== req.user.branch.toString()
    ) {
      return res.status(403).json({ message: "لا يمكنك تعديل هذا المستخدم" });
    }
  }
  deleteOldPhoto(target.photoUrl);
  target.photoUrl = `/uploads/${req.file.filename}`;
  await target.save();
  res.json(target.toSafeObject());
});

// حذف صورة المستخدم
router.delete("/:id/photo", allowRoles(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER), async (req, res) => {
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ message: "المستخدم غير موجود" });
  if (req.user.role === ROLES.BRANCH_MANAGER) {
    if (
      target._id.toString() === req.user._id.toString() ||
      target.role !== ROLES.EMPLOYEE ||
      target.branch?.toString() !== req.user.branch.toString()
    ) {
      return res.status(403).json({ message: "لا يمكنك تعديل هذا المستخدم" });
    }
  }
  deleteOldPhoto(target.photoUrl);
  target.photoUrl = "";
  await target.save();
  res.json(target.toSafeObject());
});

module.exports = router;
