const mongoose = require("mongoose");
const { EMPLOYEE_MONTH_TOTAL_DAYS } = require("../utils/constants");

// ملخص شهري لحضور/غياب كل موظف (زي الطلاب بالظبط، بس الشهر هنا 22 يوم عمل)
const employeeMonthlyAttendanceSchema = new mongoose.Schema(
  {
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    month: { type: Number, min: 1, max: 12, required: true },
    year: { type: Number, required: true },
    presentDays: { type: Number, min: 0, max: EMPLOYEE_MONTH_TOTAL_DAYS, default: 0 },
    absentDays: { type: Number, min: 0, max: EMPLOYEE_MONTH_TOTAL_DAYS, default: EMPLOYEE_MONTH_TOTAL_DAYS },
    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

employeeMonthlyAttendanceSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model("EmployeeMonthlyAttendance", employeeMonthlyAttendanceSchema);
