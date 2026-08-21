const express = require("express");
const Attendance = require("../models/Attendance");
const { protect, scopeToOwnBranch, allowRoles } = require("../middleware/auth");
const { ROLES } = require("../utils/constants");
const { monthRange } = require("../utils/dateRange");

const router = express.Router();
router.use(protect);

// كل السجلات هنا خاصة بالموظفين بس (student يفضل فاضي دايمًا)
router.get("/", async (req, res) => {
  const filter = { employee: { $ne: null } };
  if (req.user.role === ROLES.SUPER_ADMIN) {
    if (req.query.branch) filter.branch = req.query.branch;
  } else {
    filter.branch = req.user.branch;
  }
  if (req.user.role === ROLES.EMPLOYEE) filter.employee = req.user._id; // الموظف يشوف حضوره هو بس
  if (req.query.employee && req.user.role !== ROLES.EMPLOYEE) filter.employee = req.query.employee;
  if (req.query.date) {
    const day = new Date(req.query.date);
    const next = new Date(day);
    next.setDate(day.getDate() + 1);
    filter.date = { $gte: day, $lt: next };
  }
  if (req.query.month) {
    const { start, end } = monthRange(req.query.month);
    filter.date = { $gte: start, $lt: end };
  }
  const records = await Attendance.find(filter)
    .populate("employee", "name")
    .populate("branch", "name")
    .sort({ date: -1 });
  res.json(records);
});

router.post("/", allowRoles(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER), scopeToOwnBranch, async (req, res) => {
  try {
    if (!req.body.employee) return res.status(400).json({ message: "لازم تحدد الموظف" });
    const record = await Attendance.create({ ...req.body, student: null });
    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ message: "فشل تسجيل الحضور", error: err.message });
  }
});

// تسجيل حضور جماعي لكل موظفين الفرع في يوم واحد
router.post("/bulk", allowRoles(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER), scopeToOwnBranch, async (req, res) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: "لا توجد سجلات لحفظها" });
    }
    const branch = req.user.role === ROLES.SUPER_ADMIN ? null : req.user.branch;
    const docs = records.map((r) => ({ ...r, student: null, branch: branch || r.branch }));
    const created = await Attendance.insertMany(docs);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ message: "فشل تسجيل الحضور الجماعي", error: err.message });
  }
});

router.put("/:id", allowRoles(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER), async (req, res) => {
  const record = await Attendance.findById(req.params.id);
  if (!record) return res.status(404).json({ message: "السجل غير موجود" });
  if (req.user.role !== ROLES.SUPER_ADMIN && record.branch.toString() !== req.user.branch.toString()) {
    return res.status(403).json({ message: "لا يمكنك تعديل سجل من فرع آخر" });
  }
  Object.assign(record, req.body);
  await record.save();
  res.json(record);
});

router.delete("/:id", allowRoles(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER), async (req, res) => {
  const record = await Attendance.findById(req.params.id);
  if (!record) return res.status(404).json({ message: "السجل غير موجود" });
  if (req.user.role !== ROLES.SUPER_ADMIN && record.branch.toString() !== req.user.branch.toString()) {
    return res.status(403).json({ message: "لا يمكنك حذف سجل من فرع آخر" });
  }
  await record.deleteOne();
  res.json({ message: "تم حذف السجل" });
});

module.exports = router;
