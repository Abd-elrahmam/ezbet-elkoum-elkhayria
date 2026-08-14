const express = require("express");
const Salary = require("../models/Salary");
const { protect, allowRoles } = require("../middleware/auth");
const { ROLES } = require("../utils/constants");

const router = express.Router();
router.use(protect);

router.get("/", async (req, res) => {
  const filter = {};
  if (req.user.role === ROLES.SUPER_ADMIN) {
    if (req.query.branch) filter.branch = req.query.branch;
  } else if (req.user.role === ROLES.BRANCH_MANAGER) {
    filter.branch = req.user.branch;
  } else {
    filter.employee = req.user._id; // الموظف يشوف مرتبه هو بس
  }
  if (req.query.employee && req.user.role !== ROLES.EMPLOYEE) filter.employee = req.query.employee;
  if (req.query.month) filter.month = req.query.month;

  const salaries = await Salary.find(filter)
    .populate("employee", "name jobTitle")
    .populate("branch", "name")
    .sort({ month: -1 });
  res.json(salaries);
});

router.post("/", allowRoles(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER), async (req, res) => {
  try {
    if (req.user.role === ROLES.BRANCH_MANAGER && req.body.employee === req.user._id.toString()) {
      return res.status(403).json({ message: "لا يمكنك تسجيل راتب لنفسك" });
    }
    const payload = { ...req.body, recordedBy: req.user._id };
    if (req.user.role === ROLES.BRANCH_MANAGER) payload.branch = req.user.branch;
    const salary = await Salary.create(payload);
    res.status(201).json(salary);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "تم بالفعل تسجيل راتب هذا الموظف لهذا الشهر" });
    }
    res.status(400).json({ message: "فشل تسجيل الراتب", error: err.message });
  }
});

router.put("/:id", allowRoles(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER), async (req, res) => {
  const salary = await Salary.findById(req.params.id);
  if (!salary) return res.status(404).json({ message: "سجل الراتب غير موجود" });
  if (req.user.role !== ROLES.SUPER_ADMIN && salary.branch.toString() !== req.user.branch.toString()) {
    return res.status(403).json({ message: "لا يمكنك تعديل راتب من فرع آخر" });
  }
  if (req.user.role === ROLES.BRANCH_MANAGER && salary.employee.toString() === req.user._id.toString()) {
    return res.status(403).json({ message: "لا يمكنك تعديل راتبك الخاص" });
  }
  Object.assign(salary, req.body);
  await salary.save();
  res.json(salary);
});

router.delete("/:id", allowRoles(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER), async (req, res) => {
  const salary = await Salary.findById(req.params.id);
  if (!salary) return res.status(404).json({ message: "سجل الراتب غير موجود" });
  if (req.user.role !== ROLES.SUPER_ADMIN && salary.branch.toString() !== req.user.branch.toString()) {
    return res.status(403).json({ message: "لا يمكنك حذف راتب من فرع آخر" });
  }
  if (req.user.role === ROLES.BRANCH_MANAGER && salary.employee.toString() === req.user._id.toString()) {
    return res.status(403).json({ message: "لا يمكنك حذف راتبك الخاص" });
  }
  await salary.deleteOne();
  res.json({ message: "تم حذف سجل الراتب" });
});

module.exports = router;
