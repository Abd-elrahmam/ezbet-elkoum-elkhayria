const mongoose = require("mongoose");
const { DEPARTMENTS, ATTENDANCE_STATUS } = require("../utils/constants");

const attendanceSchema = new mongoose.Schema(
  {
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
    department: { type: String, enum: Object.values(DEPARTMENTS), required: true },
    // إما طالب أو موظف (واحد منهم فقط)
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", default: null },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    date: { type: Date, required: true, default: Date.now },
    status: {
      type: String,
      enum: Object.values(ATTENDANCE_STATUS),
      required: true,
      default: ATTENDANCE_STATUS.PRESENT,
    },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

attendanceSchema.index({ student: 1, date: 1 });
attendanceSchema.index({ employee: 1, date: 1 });

module.exports = mongoose.model("Attendance", attendanceSchema);
