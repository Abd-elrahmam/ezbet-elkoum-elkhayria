const express = require("express");
const EmployeeAttendance = require("../models/EmployeeAttendance");
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
  if (req.query.employee) filter.employee = req.query.employee;
  if (req.query.date) filter.date = req.query.date;
  if (req.query.month) {
    const range = monthRange(req.query.month);
    if (range) filter.date = { $gte: range.start, $lt: range.end };
  }

  const records = await EmployeeAttendance.find(filter).populate("employee", "name jobTitle");
  res.json(records);
});

// تسجيل حضور جماعي لكل الموظفين في يوم معيّن
router.post("/bulk", scopeToOwnBranch, async (req, res) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: "لا توجد سجلات لحفظها" });
    }
    const branch = req.user.role === ROLES.SUPER_ADMIN ? null : req.user.branch;

    const results = await Promise.all(
      records.map((r) =>
        EmployeeAttendance.findOneAndUpdate(
          { employee: r.employee, date: r.date },
          {
            employee: r.employee,
            branch: branch || r.branch,
            date: r.date,
            status: r.status || "present",
            notes: r.notes || "",
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        )
      )
    );
    res.status(201).json(results);
  } catch (err) {
    res.status(400).json({ message: "فشل حفظ الحضور", error: err.message });
  }
});

module.exports = router;
