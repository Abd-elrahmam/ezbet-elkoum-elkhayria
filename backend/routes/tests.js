const express = require("express");
const Test = require("../models/Test");
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
  if (req.query.type) filter.type = req.query.type;
  if (req.user.role === ROLES.EMPLOYEE) filter.examiner = req.user._id;

  const tests = await Test.find(filter)
    .populate("student", "name")
    .populate("examiner", "name")
    .populate("branch", "name")
    .sort({ date: -1 });
  res.json(tests);
});

router.post("/", scopeToOwnBranch, async (req, res) => {
  try {
    const test = await Test.create({ ...req.body, examiner: req.body.examiner || req.user._id });
    res.status(201).json(test);
  } catch (err) {
    res.status(400).json({ message: "فشل تسجيل الاختبار", error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  const test = await Test.findById(req.params.id);
  if (!test) return res.status(404).json({ message: "الاختبار غير موجود" });
  if (req.user.role !== ROLES.SUPER_ADMIN && test.branch.toString() !== req.user.branch.toString()) {
    return res.status(403).json({ message: "لا يمكنك تعديل اختبار من فرع آخر" });
  }
  Object.assign(test, req.body);
  await test.save();
  res.json(test);
});

router.delete("/:id", async (req, res) => {
  const test = await Test.findById(req.params.id);
  if (!test) return res.status(404).json({ message: "الاختبار غير موجود" });
  if (req.user.role !== ROLES.SUPER_ADMIN && test.branch.toString() !== req.user.branch.toString()) {
    return res.status(403).json({ message: "لا يمكنك حذف اختبار من فرع آخر" });
  }
  await test.deleteOne();
  res.json({ message: "تم حذف الاختبار" });
});

module.exports = router;
