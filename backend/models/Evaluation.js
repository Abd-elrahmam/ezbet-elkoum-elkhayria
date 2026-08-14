const mongoose = require("mongoose");
const { DEPARTMENTS } = require("../utils/constants");

const evaluationSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
    department: { type: String, enum: Object.values(DEPARTMENTS), required: true },
    period: { type: String, enum: ["daily", "weekly", "monthly"], required: true },
    // تقييم عام من 1 إلى 5
    rating: { type: Number, min: 1, max: 5, required: true },
    // تقييمات فرعية اختيارية
    memorization: { type: Number, min: 1, max: 5, default: null },
    behavior: { type: Number, min: 1, max: 5, default: null },
    participation: { type: Number, min: 1, max: 5, default: null },
    notes: { type: String, trim: true, default: "" },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

evaluationSchema.index({ student: 1, date: -1 });

module.exports = mongoose.model("Evaluation", evaluationSchema);
