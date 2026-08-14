const mongoose = require("mongoose");
const { DEPARTMENTS, TEST_TYPES } = require("../utils/constants");

const testSchema = new mongoose.Schema(
  {
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
    department: { type: String, enum: Object.values(DEPARTMENTS), required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    type: { type: String, enum: Object.values(TEST_TYPES), required: true },
    title: { type: String, required: true, trim: true }, // مثال: اختبار سورة البقرة
    score: { type: Number, required: true },
    maxScore: { type: Number, required: true, default: 100 },
    date: { type: Date, default: Date.now },
    examiner: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // المدرس الممتحِن
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Test", testSchema);
