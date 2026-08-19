const mongoose = require("mongoose");
const { DEPARTMENTS } = require("../utils/constants");

const monthlyAttendanceSchema = new mongoose.Schema(
  {
    // إما طالب أو موظف (واحد منهم فقط)
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", default: null },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
    department: { type: String, enum: Object.values(DEPARTMENTS), required: true },
    month: { type: String, required: true }, // "2026-08"

    presentDays: { type: Number, required: true, default: 0, min: 0 },
    absentDays: { type: Number, required: true, default: 0, min: 0 },
    lateDays: { type: Number, default: 0, min: 0 },
    excusedDays: { type: Number, default: 0, min: 0 },

    notes: { type: String, trim: true, default: "" },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// منع تكرار سجل لنفس الطالب أو نفس الموظف في نفس الشهر
monthlyAttendanceSchema.index(
  { student: 1, month: 1 },
  { unique: true, partialFilterExpression: { student: { $type: "objectId" } } }
);
monthlyAttendanceSchema.index(
  { employee: 1, month: 1 },
  { unique: true, partialFilterExpression: { employee: { $type: "objectId" } } }
);

module.exports = mongoose.model("MonthlyAttendance", monthlyAttendanceSchema);