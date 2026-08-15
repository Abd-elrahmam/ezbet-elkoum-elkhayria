const express = require("express");
const Branch = require("../models/Branch");
const Student = require("../models/Student");
const User = require("../models/User");
const Payment = require("../models/Payment");
const Expense = require("../models/Expense");
const Attendance = require("../models/Attendance");
const Evaluation = require("../models/Evaluation");
const Salary = require("../models/Salary");
const LeaveRequest = require("../models/LeaveRequest");
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
    performance: req.user.role === ROLES.SUPER_ADMIN ? await computePerformance(monthStart) : null,
  });
});

// مؤشرات أداء سريعة على مستوى الجمعية كلها (للأدمن الرئيسي فقط)
const computePerformance = async (monthStart) => {
  const [attendanceAgg, evaluationAgg, salaryAgg, leaveAgg] = await Promise.all([
    Attendance.aggregate([
      { $match: { date: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: 1 }, present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } } } },
    ]),
    Evaluation.aggregate([
      { $match: { date: { $gte: monthStart } } },
      { $group: { _id: null, avgRating: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]),
    Salary.aggregate([
      { $match: { month: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}` } },
      { $group: { _id: null, total: { $sum: 1 }, paid: { $sum: { $cond: ["$paid", 1, 0] } } } },
    ]),
    LeaveRequest.aggregate([
      { $match: { createdAt: { $gte: monthStart }, status: { $ne: "pending" } } },
      { $group: { _id: null, total: { $sum: 1 }, approved: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } } } },
    ]),
  ]);

  const attendance = attendanceAgg[0];
  const evaluation = evaluationAgg[0];
  const salary = salaryAgg[0];
  const leave = leaveAgg[0];

  const pct = (num, denom) => (denom ? Math.round((num / denom) * 100) : null);

  return {
    attendanceRate: pct(attendance?.present, attendance?.total),
    evaluationRate: evaluation?.avgRating ? Math.round((evaluation.avgRating / 5) * 100) : null,
    salariesPaidRate: pct(salary?.paid, salary?.total),
    leaveApprovalRate: pct(leave?.approved, leave?.total),
  };
};

module.exports = router;
