const mongoose = require("mongoose");
const { DEPARTMENTS } = require("../utils/constants");

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    photoUrl: { type: String, default: "" },
    age: { type: Number },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
    department: { type: String, enum: Object.values(DEPARTMENTS), required: true },
    // المدرس المسؤول عن الطالب (توزيع الطلاب على المدرسين)
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    guardianName: { type: String, trim: true },
    guardianPhone: { type: String, trim: true },
    address: { type: String, trim: true },
    monthlyFee: { type: Number, default: 0 },
    enrollDate: { type: Date, default: Date.now },
    notes: { type: String, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Student", studentSchema);
