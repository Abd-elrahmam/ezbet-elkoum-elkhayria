const express = require("express");
const Hifz = require("../models/Hifz");
const Student = require("../models/Student");
const { protect, scopeToOwnBranch } = require("../middleware/auth");
const { ROLES } = require("../utils/constants");

const router = express.Router();
router.use(protect);

// يتأكد إن سجل الحفظ ده خاص بموظف معين: إما هو اللي سجله، أو الطالب متوزع عليه
const isOwnedByEmployee = async (record, employeeId) => {
  if (record.recordedBy?.toString() === employeeId.toString()) return true;
  if (record.employee?.toString() === employeeId.toString()) return true;
  if (record.student) {
    const student = await Student.findById(record.student).select("teacher");
    if (student?.teacher?.toString() === employeeId.toString()) return true;
  }
  return false;
};

router.get("/", async (req, res) => {
  const filter = {};
  if (req.user.role === ROLES.SUPER_ADMIN) {
    if (req.query.branch) filter.branch = req.query.branch;
  } else {
    filter.branch = req.user.branch;
  }

  if (req.user.role === ROLES.EMPLOYEE) {
    // الموظف يشوف: سجلات حفظه هو + كل سجلات الحفظ بتاعة طلابه المتوزعين عليه
    const myStudents = await Student.find({ teacher: req.user._id }).select("_id");
    const myStudentIds = myStudents.map((s) => s._id);
    filter.$or = [{ employee: req.user._id }, { student: { $in: myStudentIds } }];
  }
  if (req.query.student) filter.student = req.query.student;
  if (req.query.employee) filter.employee = req.query.employee;
  if (req.query.month) filter.month = req.query.month;

  const records = await Hifz.find(filter)
    .populate("student", "name")
    .populate("employee", "name")
    .populate("branch", "name")
    .sort({ month: -1, createdAt: -1 });
  res.json(records);
});

router.post("/", scopeToOwnBranch, async (req, res) => {
  try {
    const { student, employee, month } = req.body;
    if (!student && !employee) {
      return res.status(400).json({ message: "لازم تحدد طالب أو موظف" });
    }
    // الموظف يقدر يسجل حفظ لطلابه هو بس (المتوزعين عليه)
    if (req.user.role === ROLES.EMPLOYEE && student) {
      const targetStudent = await Student.findById(student).select("teacher");
      if (targetStudent?.teacher?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "لا يمكنك تسجيل حفظ لطالب غير متوزع عليك" });
      }
    }
    const existing = await Hifz.findOne(student ? { student, month } : { employee, month });
    if (existing) {
      return res.status(400).json({ message: "يوجد سجل حفظ بالفعل لنفس الشهر، عدّل السجل الموجود بدل إضافة سجل جديد" });
    }
    const record = await Hifz.create({ ...req.body, recordedBy: req.user._id });
    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ message: "فشل تسجيل الحفظ", error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  const record = await Hifz.findById(req.params.id);
  if (!record) return res.status(404).json({ message: "السجل غير موجود" });
  if (req.user.role !== ROLES.SUPER_ADMIN && record.branch.toString() !== req.user.branch.toString()) {
    return res.status(403).json({ message: "لا يمكنك تعديل سجل من فرع آخر" });
  }
  if (req.user.role === ROLES.EMPLOYEE && !(await isOwnedByEmployee(record, req.user._id))) {
    return res.status(403).json({ message: "لا يمكنك تعديل هذا السجل" });
  }
  Object.assign(record, req.body);
  await record.save();
  res.json(record);
});

router.delete("/:id", async (req, res) => {
  const record = await Hifz.findById(req.params.id);
  if (!record) return res.status(404).json({ message: "السجل غير موجود" });
  if (req.user.role !== ROLES.SUPER_ADMIN && record.branch.toString() !== req.user.branch.toString()) {
    return res.status(403).json({ message: "لا يمكنك حذف سجل من فرع آخر" });
  }
  if (req.user.role === ROLES.EMPLOYEE && !(await isOwnedByEmployee(record, req.user._id))) {
    return res.status(403).json({ message: "لا يمكنك حذف هذا السجل" });
  }
  await record.deleteOne();
  res.json({ message: "تم حذف السجل" });
});

module.exports = router;