const express = require("express");
const Expense = require("../models/Expense");
const { protect, scopeToOwnBranch, allowRoles } = require("../middleware/auth");
const { ROLES } = require("../utils/constants");
const { monthRange } = require("../utils/dateRange");

const router = express.Router();
router.use(protect);

router.get("/", allowRoles(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER), async (req, res) => {
  const filter = {};
  if (req.user.role === ROLES.SUPER_ADMIN) {
    if (req.query.branch) filter.branch = req.query.branch;
  } else {
    filter.branch = req.user.branch;
  }
  if (req.query.category) filter.category = req.query.category;
  if (req.query.month) {
    const { start, end } = monthRange(req.query.month);
    filter.date = { $gte: start, $lt: end };
  }
  const expenses = await Expense.find(filter).populate("branch", "name").sort({ date: -1 });
  res.json(expenses);
});

router.post("/", allowRoles(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER), scopeToOwnBranch, async (req, res) => {
  try {
    const expense = await Expense.create({ ...req.body, recordedBy: req.user._id });
    res.status(201).json(expense);
  } catch (err) {
    res.status(400).json({ message: "فشل تسجيل المصروف", error: err.message });
  }
});

router.put("/:id", allowRoles(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER), async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) return res.status(404).json({ message: "المصروف غير موجود" });
  if (req.user.role !== ROLES.SUPER_ADMIN && expense.branch.toString() !== req.user.branch.toString()) {
    return res.status(403).json({ message: "لا يمكنك تعديل مصروف من فرع آخر" });
  }
  Object.assign(expense, req.body);
  await expense.save();
  res.json(expense);
});

router.delete("/:id", allowRoles(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER), async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) return res.status(404).json({ message: "المصروف غير موجود" });
  if (req.user.role !== ROLES.SUPER_ADMIN && expense.branch.toString() !== req.user.branch.toString()) {
    return res.status(403).json({ message: "لا يمكنك حذف مصروف من فرع آخر" });
  }
  await expense.deleteOne();
  res.json({ message: "تم حذف المصروف" });
});

module.exports = router;