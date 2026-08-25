const mongoose = require("mongoose");
const { DEPARTMENTS, MONTH_TOTAL_DAYS } = require("../utils/constants");

// ملخص شهري لحضور/غياب كل طالب: بيسمح إنك تدخل عدد أيام الحضور
// أو الغياب مباشرة (بدل تسجيل يوم بيوم) على أساس إن الشهر = 20 يوم عمل
const monthlyAttendanceSummarySchema = new mongoose.Schema(
  {
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
    department: { type: String, enum: Object.values(DEPARTMENTS), required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    month: { type: Number, min: 1, max: 12, required: true },
    year: { type: Number, required: true },
    presentDays: { type: Number, min: 0, max: MONTH_TOTAL_DAYS, default: 0 },
    absentDays: { type: Number, min: 0, max: MONTH_TOTAL_DAYS, default: MONTH_TOTAL_DAYS },
    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

monthlyAttendanceSummarySchema.index({ student: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model("MonthlyAttendanceSummary", monthlyAttendanceSummarySchema);
