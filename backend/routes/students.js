const express = require("express");
const Student = require("../models/Student");
const { protect, scopeToOwnBranch } = require("../middleware/auth");
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

router.get("/", async (req, res) => {
  const filter = {};
  if (req.user.role === ROLES.SUPER_ADMIN) {
    if (req.query.branch) filter.branch = req.query.branch;
  } else {
    filter.branch = req.user.branch;
  }
  if (req.query.department) filter.department = req.query.department;
  if (req.query.teacher) filter.teacher = req.query.teacher;
  if (req.user.role === ROLES.EMPLOYEE) filter.teacher = req.user._id; // المدرس يشوف طلابه فقط

  // ترتيب النتائج: أبجدي بالاسم (الافتراضي) أو حسب ترتيب الإضافة (الأقدم فالأحدث)
  const sortOption = req.query.sort === "added" ? { createdAt: 1 } : { name: 1 };

  const students = await Student.find(filter)
    .populate("branch", "name")
    .populate("teacher", "name")
    .sort(sortOption);
  res.json(students);
});

router.get("/:id", async (req, res) => {
  const student = await Student.findById(req.params.id).populate("branch", "name").populate("teacher", "name");
  if (!student) return res.status(404).json({ message: "الطالب غير موجود" });
  res.json(student);
});

router.post("/", scopeToOwnBranch, async (req, res) => {
  try {
    if (req.user.role === ROLES.EMPLOYEE) {
      return res.status(403).json({ message: "ليس لديك صلاحية إضافة طلاب" });
    }
    const student = await Student.create(req.body);
    res.status(201).json(student);
  } catch (err) {
    res.status(400).json({ message: "فشل إضافة الطالب", error: err.message });
  }
});

router.put("/:id", scopeToOwnBranch, async (req, res) => {
  try {
    if (req.user.role === ROLES.EMPLOYEE) {
      return res.status(403).json({ message: "ليس لديك صلاحية تعديل بيانات الطلاب" });
    }
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "الطالب غير موجود" });
    if (req.user.role !== ROLES.SUPER_ADMIN && student.branch.toString() !== req.user.branch.toString()) {
      return res.status(403).json({ message: "لا يمكنك تعديل طالب من فرع آخر" });
    }
    Object.assign(student, req.body);
    await student.save();
    res.json(student);
  } catch (err) {
    res.status(400).json({ message: "فشل تعديل الطالب", error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  if (req.user.role === ROLES.EMPLOYEE) {
    return res.status(403).json({ message: "ليس لديك صلاحية حذف الطلاب" });
  }
  const student = await Student.findById(req.params.id);
  if (!student) return res.status(404).json({ message: "الطالب غير موجود" });
  if (req.user.role !== ROLES.SUPER_ADMIN && student.branch.toString() !== req.user.branch.toString()) {
    return res.status(403).json({ message: "لا يمكنك حذف طالب من فرع آخر" });
  }
  await student.deleteOne();
  res.json({ message: "تم حذف الطالب" });
});

// توزيع/إعادة توزيع طالب على مدرس معين
router.put("/:id/assign-teacher", async (req, res) => {
  if (req.user.role === ROLES.EMPLOYEE) {
    return res.status(403).json({ message: "ليس لديك صلاحية توزيع الطلاب" });
  }
  const { teacherId } = req.body;
  const student = await Student.findById(req.params.id);
  if (!student) return res.status(404).json({ message: "الطالب غير موجود" });
  if (req.user.role !== ROLES.SUPER_ADMIN && student.branch.toString() !== req.user.branch.toString()) {
    return res.status(403).json({ message: "لا يمكنك تعديل طالب من فرع آخر" });
  }
  student.teacher = teacherId || null;
  await student.save();
  res.json(student);
});

// تحديد "مجموعة" طلاب مدرس معين دفعة واحدة (بدل توزيع كل طالب لوحده)
// studentIds = القائمة الكاملة المطلوب إسنادها للمدرس ده؛ أي طالب كان
// متسجل عنده قبل كده وشيل من القائمة بيترفع منه المدرس تلقائيًا
router.put("/assign-teacher-group", async (req, res) => {
  if (req.user.role === ROLES.EMPLOYEE) {
    return res.status(403).json({ message: "ليس لديك صلاحية توزيع الطلاب" });
  }
  const { teacherId, studentIds } = req.body;
  if (!teacherId || !Array.isArray(studentIds)) {
    return res.status(400).json({ message: "بيانات ناقصة" });
  }

  const branchFilter = req.user.role === ROLES.SUPER_ADMIN ? {} : { branch: req.user.branch };

  // شيل المدرس من أي طالب كان معينله قبل كده ومش موجود في القائمة الجديدة
  await Student.updateMany(
    { ...branchFilter, teacher: teacherId, _id: { $nin: studentIds } },
    { teacher: null }
  );
  // عيّن المدرس لكل الطلاب في القائمة الجديدة
  await Student.updateMany(
    { ...branchFilter, _id: { $in: studentIds } },
    { teacher: teacherId }
  );

  const group = await Student.find({ ...branchFilter, teacher: teacherId })
    .populate("branch", "name")
    .sort({ name: 1 });
  res.json(group);
});

// رفع صورة الطالب
router.put("/:id/photo", upload.single("photo"), async (req, res) => {
  if (req.user.role === ROLES.EMPLOYEE) {
    return res.status(403).json({ message: "ليس لديك صلاحية تعديل صورة الطالب" });
  }
  if (!req.file) return res.status(400).json({ message: "لم يتم إرسال أي صورة" });
  const student = await Student.findById(req.params.id);
  if (!student) return res.status(404).json({ message: "الطالب غير موجود" });
  if (req.user.role !== ROLES.SUPER_ADMIN && student.branch.toString() !== req.user.branch.toString()) {
    return res.status(403).json({ message: "لا يمكنك تعديل طالب من فرع آخر" });
  }
  deleteOldPhoto(student.photoUrl);
  student.photoUrl = `/uploads/${req.file.filename}`;
  await student.save();
  res.json(student);
});

// حذف صورة الطالب
router.delete("/:id/photo", async (req, res) => {
  if (req.user.role === ROLES.EMPLOYEE) {
    return res.status(403).json({ message: "ليس لديك صلاحية تعديل صورة الطالب" });
  }
  const student = await Student.findById(req.params.id);
  if (!student) return res.status(404).json({ message: "الطالب غير موجود" });
  if (req.user.role !== ROLES.SUPER_ADMIN && student.branch.toString() !== req.user.branch.toString()) {
    return res.status(403).json({ message: "لا يمكنك تعديل طالب من فرع آخر" });
  }
  deleteOldPhoto(student.photoUrl);
  student.photoUrl = "";
  await student.save();
  res.json(student);
});

module.exports = router;
