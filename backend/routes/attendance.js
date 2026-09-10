const express = require("express");
const Attendance = require("../models/Attendance");
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
  if (req.query.date) {
    const day = new Date(req.query.date);
    const next = new Date(day);
    next.setDate(day.getDate() + 1);
    filter.date = { $gte: day, $lt: next };
  }
  const records = await Attendance.find(filter)
    .populate("student", "name")
    .populate("employee", "name")
    .populate("branch", "name")
    .sort({ date: -1 });
  res.json(records);
});

router.post("/", scopeToOwnBranch, async (req, res) => {
  try {
    const record = await Attendance.create(req.body);
    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ message: "فشل تسجيل الحضور", error: err.message });
  }
});

// تسجيل حضور جماعي (كشف فصل كامل في مرة واحدة)
router.post("/bulk", scopeToOwnBranch, async (req, res) => {
  try {
    const { records } = req.body; // مصفوفة من سجلات الحضور
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: "لا توجد سجلات لحفظها" });
    }
    const branch = req.user.role === ROLES.SUPER_ADMIN ? null : req.user.branch;
    const docs = records.map((r) => ({ ...r, branch: branch || r.branch }));
    const created = await Attendance.insertMany(docs);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ message: "فشل تسجيل الحضور الجماعي", error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  const record = await Attendance.findById(req.params.id);
  if (!record) return res.status(404).json({ message: "السجل غير موجود" });
  if (req.user.role !== ROLES.SUPER_ADMIN && record.branch.toString() !== req.user.branch.toString()) {
    return res.status(403).json({ message: "لا يمكنك تعديل سجل من فرع آخر" });
  }
  Object.assign(record, req.body);
  await record.save();
  res.json(record);
});

router.delete("/:id", async (req, res) => {
  const record = await Attendance.findById(req.params.id);
  if (!record) return res.status(404).json({ message: "السجل غير موجود" });
  if (req.user.role !== ROLES.SUPER_ADMIN && record.branch.toString() !== req.user.branch.toString()) {
    return res.status(403).json({ message: "لا يمكنك حذف سجل من فرع آخر" });
  }
  await record.deleteOne();
  res.json({ message: "تم حذف السجل" });
});

module.exports = router;
