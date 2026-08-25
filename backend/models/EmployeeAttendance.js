const mongoose = require("mongoose");
const { ATTENDANCE_STATUS } = require("../utils/constants");

// حضور الموظفين اليومي (منفصل عن حضور الطلاب)
const employeeAttendanceSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: Object.values(ATTENDANCE_STATUS), default: ATTENDANCE_STATUS.PRESENT },
    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

employeeAttendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("EmployeeAttendance", employeeAttendanceSchema);
