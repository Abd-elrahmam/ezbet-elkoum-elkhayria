const express = require("express");
const MonthlyAttendance = require("../models/MonthlyAttendance");
const Student = require("../models/Student");
const { protect, scopeToOwnBranch } = require("../middleware/auth");
const { ROLES } = require("../utils/constants");

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
  if (req.query.student) filter.student = req.query.student;
  if (req.query.employee) filter.employee = req.query.employee;
  if (req.query.month) filter.month = req.query.month;

  if (req.user.role === ROLES.EMPLOYEE) {
    // الموظف يشوف: سجلاته الشخصية + سجلات طلابه المتوزعين عليه
    const myStudents = await Student.find({ teacher: req.user._id }).select("_id");
    const myStudentIds = myStudents.map((s) => s._id);
    filter.$or = [{ employee: req.user._id }, { student: { $in: myStudentIds } }];
  }

  const records = await MonthlyAttendance.find(filter)
    .populate("student", "name")
    .populate("employee", "name")
    .populate("branch", "name")
    .sort({ month: -1 });
  res.json(records);
});

// إضافة سجل حضور: الأدمن ومدير الفرع لأي طالب، والموظف لطلابه هو بس
router.post("/", scopeToOwnBranch, async (req, res) => {
  try {
    const { student, employee, month } = req.body;
    if (!student && !employee) {
      return res.status(400).json({ message: "لازم تحدد طالب أو موظف" });
    }
    if (req.user.role === ROLES.EMPLOYEE) {
      if (!student) {
        return res.status(403).json({ message: "لا يمكنك تسجيل حضورك أنت، فقط حضور طلابك" });
      }
      const targetStudent = await Student.findById(student).select("teacher");
      if (targetStudent?.teacher?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "لا يمكنك تسجيل حضور لطالب غير متوزع عليك" });
      }
    }
    const existing = await MonthlyAttendance.findOne(student ? { student, month } : { employee, month });
    if (existing) {
      return res.status(400).json({ message: "يوجد سجل حضور بالفعل لنفس الشهر، عدّل السجل الموجود بدل إضافة سجل جديد" });
    }
    const record = await MonthlyAttendance.create({ ...req.body, recordedBy: req.user._id });
    res.status(201).json(record);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "يوجد سجل حضور بالفعل لنفس الشهر" });
    }
    res.status(400).json({ message: "فشل تسجيل الحضور", error: err.message });
  }
});

// تعديل/حذف: الأدمن ومدير الفرع فقط (الموظف يقدر يضيف بس، مش يعدل أو يحذف)
router.put("/:id", async (req, res) => {
  if (req.user.role === ROLES.EMPLOYEE) {
    return res.status(403).json({ message: "ليس لديك صلاحية تعديل الحضور، تواصل مع مدير الفرع" });
  }
  const record = await MonthlyAttendance.findById(req.params.id);
  if (!record) return res.status(404).json({ message: "السجل غير موجود" });
  if (req.user.role !== ROLES.SUPER_ADMIN && record.branch.toString() !== req.user.branch.toString()) {
    return res.status(403).json({ message: "لا يمكنك تعديل سجل من فرع آخر" });
  }
  Object.assign(record, req.body);
  await record.save();
  res.json(record);
});

router.delete("/:id", async (req, res) => {
  if (req.user.role === ROLES.EMPLOYEE) {
    return res.status(403).json({ message: "ليس لديك صلاحية حذف الحضور، تواصل مع مدير الفرع" });
  }
  const record = await MonthlyAttendance.findById(req.params.id);
  if (!record) return res.status(404).json({ message: "السجل غير موجود" });
  if (req.user.role !== ROLES.SUPER_ADMIN && record.branch.toString() !== req.user.branch.toString()) {
    return res.status(403).json({ message: "لا يمكنك حذف سجل من فرع آخر" });
  }
  await record.deleteOne();
  res.json({ message: "تم حذف السجل" });
});

module.exports = router;
