const express = require("express");
const Payment = require("../models/Payment");
const { protect, scopeToOwnBranch, allowRoles } = require("../middleware/auth");
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
    return res.status(403).json({ message: "ليس لديك صلاحية عرض المدفوعات" });
  }
  if (req.query.department) filter.department = req.query.department;
  if (req.query.student) filter.student = req.query.student;
  if (req.query.month) filter.month = req.query.month;

  const payments = await Payment.find(filter)
    .populate("student", "name")
    .populate("branch", "name")
    .sort({ date: -1 });
  res.json(payments);
});

router.post("/", allowRoles(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER), scopeToOwnBranch, async (req, res) => {
  try {
    const payment = await Payment.create({ ...req.body, recordedBy: req.user._id });
    res.status(201).json(payment);
  } catch (err) {
    res.status(400).json({ message: "فشل تسجيل الدفعة", error: err.message });
  }
});

router.put("/:id", allowRoles(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER), async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) return res.status(404).json({ message: "الدفعة غير موجودة" });
  if (req.user.role !== ROLES.SUPER_ADMIN && payment.branch.toString() !== req.user.branch.toString()) {
    return res.status(403).json({ message: "لا يمكنك تعديل دفعة من فرع آخر" });
  }
  Object.assign(payment, req.body);
  await payment.save();
  res.json(payment);
});

router.delete("/:id", allowRoles(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER), async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) return res.status(404).json({ message: "الدفعة غير موجودة" });
  if (req.user.role !== ROLES.SUPER_ADMIN && payment.branch.toString() !== req.user.branch.toString()) {
    return res.status(403).json({ message: "لا يمكنك حذف دفعة من فرع آخر" });
  }
  await payment.deleteOne();
  res.json({ message: "تم حذف الدفعة" });
});

module.exports = router;
