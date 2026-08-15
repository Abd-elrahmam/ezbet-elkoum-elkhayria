const express = require("express");
const Evaluation = require("../models/Evaluation");
const { protect, scopeToOwnBranch } = require("../middleware/auth");
const { ROLES } = require("../utils/constants");
const { monthRange } = require("../utils/dateRange");

const router = express.Router();
router.use(protect);

router.get("/", async (req, res) => {
  const filter = {};
  if (req.user.role === ROLES.SUPER_ADMIN) {
    if (req.query.branch) filter.branch = req.query.branch;
  } else {
    filter.branch = req.user.branch;
  }
  if (req.user.role === ROLES.EMPLOYEE) filter.teacher = req.user._id; // المدرس يشوف تقييماته بس
  if (req.query.student) filter.student = req.query.student;
  if (req.query.period) filter.period = req.query.period;
  if (req.query.month) {
    const { start, end } = monthRange(req.query.month);
    filter.date = { $gte: start, $lt: end };
  }

  const evaluations = await Evaluation.find(filter)
    .populate("student", "name")
    .populate("teacher", "name")
    .populate("branch", "name")
    .sort({ date: -1 });
  res.json(evaluations);
});

router.post("/", scopeToOwnBranch, async (req, res) => {
  try {
    const evaluation = await Evaluation.create({ ...req.body, teacher: req.body.teacher || req.user._id });
    res.status(201).json(evaluation);
  } catch (err) {
    res.status(400).json({ message: "فشل تسجيل التقييم", error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  const evaluation = await Evaluation.findById(req.params.id);
  if (!evaluation) return res.status(404).json({ message: "التقييم غير موجود" });
  if (req.user.role === ROLES.EMPLOYEE && evaluation.teacher.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "لا يمكنك تعديل تقييم مدرس آخر" });
  }
  if (req.user.role !== ROLES.SUPER_ADMIN && evaluation.branch.toString() !== req.user.branch.toString()) {
    return res.status(403).json({ message: "لا يمكنك تعديل تقييم من فرع آخر" });
  }
  Object.assign(evaluation, req.body);
  await evaluation.save();
  res.json(evaluation);
});

router.delete("/:id", async (req, res) => {
  const evaluation = await Evaluation.findById(req.params.id);
  if (!evaluation) return res.status(404).json({ message: "التقييم غير موجود" });
  if (req.user.role === ROLES.EMPLOYEE && evaluation.teacher.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "لا يمكنك حذف تقييم مدرس آخر" });
  }
  if (req.user.role !== ROLES.SUPER_ADMIN && evaluation.branch.toString() !== req.user.branch.toString()) {
    return res.status(403).json({ message: "لا يمكنك حذف تقييم من فرع آخر" });
  }
  await evaluation.deleteOne();
  res.json({ message: "تم حذف التقييم" });
});

module.exports = router;
