const express = require("express");
const EmployeeMonthlyAttendance = require("../models/EmployeeMonthlyAttendance");
const { protect, scopeToOwnBranch } = require("../middleware/auth");
const { ROLES, EMPLOYEE_MONTH_TOTAL_DAYS } = require("../utils/constants");

const router = express.Router();
router.use(protect);

router.get("/", async (req, res) => {
  const filter = {};
  if (req.user.role === ROLES.SUPER_ADMIN) {
    if (req.query.branch) filter.branch = req.query.branch;
  } else {
    filter.branch = req.user.branch;
  }
  // يقبل الشهر بصيغة "YYYY-MM" أو رقم شهر + سنة منفصلين
  if (req.query.month) {
    const raw = String(req.query.month);
    if (raw.includes("-")) {
      const [y, m] = raw.split("-").map(Number);
      if (m) filter.month = m;
      if (y) filter.year = y;
    } else {
      filter.month = Number(raw);
      if (req.query.year) filter.year = Number(req.query.year);
    }
  } else if (req.query.year) {
    filter.year = Number(req.query.year);
  }
  if (req.query.employee) filter.employee = req.query.employee;

  const records = await EmployeeMonthlyAttendance.find(filter).populate("employee", "name");
  res.json(records);
});

// حفظ جماعي: كل سجل بياخد presentDays أو absentDays، والتاني بيتحسب تلقائي (المجموع = 22)
router.post("/bulk", scopeToOwnBranch, async (req, res) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: "لا توجد سجلات لحفظها" });
    }
    const branch = req.user.role === ROLES.SUPER_ADMIN ? null : req.user.branch;

    const results = await Promise.all(
      records.map((r) => {
        let present = Number(r.presentDays);
        let absent = Number(r.absentDays);
        if (Number.isNaN(present) && !Number.isNaN(absent)) present = EMPLOYEE_MONTH_TOTAL_DAYS - absent;
        if (Number.isNaN(absent) && !Number.isNaN(present)) absent = EMPLOYEE_MONTH_TOTAL_DAYS - present;
        present = Math.min(Math.max(present || 0, 0), EMPLOYEE_MONTH_TOTAL_DAYS);
        absent = Math.min(Math.max(absent || 0, 0), EMPLOYEE_MONTH_TOTAL_DAYS);

        return EmployeeMonthlyAttendance.findOneAndUpdate(
          { employee: r.employee, month: r.month, year: r.year },
          {
            employee: r.employee,
            branch: branch || r.branch,
            month: r.month,
            year: r.year,
            presentDays: present,
            absentDays: absent,
            notes: r.notes || "",
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      })
    );
    res.status(201).json(results);
  } catch (err) {
    res.status(400).json({ message: "فشل حفظ ملخص حضور الموظفين", error: err.message });
  }
});

module.exports = router;
