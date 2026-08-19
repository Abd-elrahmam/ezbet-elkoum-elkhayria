const mongoose = require("mongoose");
const { DEPARTMENTS } = require("../utils/constants");

const hifzSchema = new mongoose.Schema(
  {
    // إما طالب أو موظف (واحد منهم فقط)
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", default: null },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
    department: { type: String, enum: Object.values(DEPARTMENTS), required: true },
    month: { type: String, required: true }, // "2026-08"

    // الحفظ الجديد
    memFromSurah: { type: String, trim: true, default: "" },
    memFromAyah: { type: Number, default: null },
    memToSurah: { type: String, trim: true, default: "" },
    memToAyah: { type: Number, default: null },

    // المتون (نص حر لأنها مش موحّدة زي سور القرآن)
    mutoonFrom: { type: String, trim: true, default: "" },
    mutoonTo: { type: String, trim: true, default: "" },

    // المراجعة
    revisionFrom: { type: String, trim: true, default: "" },
    revisionTo: { type: String, trim: true, default: "" },

    // إضافات مفيدة
    grade: {
      type: String,
      enum: ["excellent", "very_good", "good", "acceptable", "weak", ""],
      default: "",
    },
    newPagesCount: { type: Number, default: null },

    notes: { type: String, trim: true, default: "" },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

hifzSchema.index({ student: 1, month: 1 });
hifzSchema.index({ employee: 1, month: 1 });

module.exports = mongoose.model("Hifz", hifzSchema);