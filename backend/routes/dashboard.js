const express = require("express");
const Branch = require("../models/Branch");
const Student = require("../models/Student");
const User = require("../models/User");
const Payment = require("../models/Payment");
const Expense = require("../models/Expense");
const { protect } = require("../middleware/auth");
const { ROLES } = require("../utils/constants");

const router = express.Router();
router.use(protect);

router.get("/stats", async (req, res) => {
  // الموظف: يشوف بس عدد طلابه هو (المتوزعين عليه) وحسب قسمه
  if (req.user.role === ROLES.EMPLOYEE) {
    const myStudentsCount = await Student.countDocuments({ teacher: req.user._id, active: true });
    return res.json({ role: "employee", myStudentsCount, department: req.user.department });
  }

  const branchFilter = req.user.role === ROLES.SUPER_ADMIN ? {} : { branch: req.user.branch };

  const [branchesCount, studentsCount, employeesCount, nurseryCount, quranCount] = await Promise.all([
    req.user.role === ROLES.SUPER_ADMIN ? Branch.countDocuments() : Promise.resolve(1),
    Student.countDocuments({ ...branchFilter, active: true }),
    User.countDocuments({ ...branchFilter, role: { $ne: ROLES.SUPER_ADMIN }, active: true }),
    Student.countDocuments({ ...branchFilter, department: "nursery", active: true }),
    Student.countDocuments({ ...branchFilter, department: "quran", active: true }),
  ]);

  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [incomeAgg, expenseAgg] = await Promise.all([
    Payment.aggregate([
      { $match: { ...branchFilter, month: monthStr } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Expense.aggregate([
      { $match: { ...branchFilter, date: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  res.json({
    role: req.user.role,
    branchesCount,
    studentsCount,
    employeesCount,
    nurseryCount,
    quranCount,
    incomeThisMonth: incomeAgg[0]?.total || 0,
    expensesThisMonth: expenseAgg[0]?.total || 0,
  });
});

module.exports = router;
