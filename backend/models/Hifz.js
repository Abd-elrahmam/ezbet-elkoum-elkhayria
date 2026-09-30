const mongoose = require("mongoose");
const { DEPARTMENTS } = require("../utils/constants");

const GRADES = ["excellent", "very_good", "good", "acceptable", "weak"];
const HIFZ_STATUS = ["normal", "khatm", "review_only"];

// سجل الحفظ الشهري: حفظ جديد + مراجعة + متون، لطالب أو موظف (مدرس بيحفظ هو كمان)
const hifzSchema = new mongoose.Schema(
  {
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },
    department: {
      type: String,
      enum: Object.values(DEPARTMENTS),
      default: "quran",
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    month: { type: String, required: true }, // "YYYY-MM"

    status: { type: String, enum: HIFZ_STATUS, default: "normal" },

    // معدل الحفظ اليومي (صفحة) وأيام الحضور
    dailyRatePages: { type: Number, min: 0, default: null },
    presentDays: { type: Number, min: 0, default: null },
    expectedPages: { type: Number, min: 0, default: null },

    // ========== الحفظ الجديد - الفترة الأولى ==========
    period1Label: { type: String, trim: true, default: "" },
    memFromSurah: { type: String, trim: true, default: "" },
    memFromAyah: { type: Number, default: null },
    memToSurah: { type: String, trim: true, default: "" },
    memToAyah: { type: Number, default: null },
    memTimes1: { type: Number, min: 1, default: 1 },
    memUnique1: { type: Number, min: 0, default: 0 }, // 🆕 الصفحات الفي المره الواحده بدون تكرار
    memPages1: { type: Number, min: 0, default: 0 }, // شاملة التكرار

    // ========== الحفظ الجديد - الفترة الثانية ==========
    hasPeriod2: { type: Boolean, default: false },
    period2Label: { type: String, trim: true, default: "" },
    dailyRatePages2: { type: Number, min: 0, default: null },
    expectedPages2: { type: Number, min: 0, default: null },
    memFromSurah2: { type: String, trim: true, default: "" },
    memFromAyah2: { type: Number, default: null },
    memToSurah2: { type: String, trim: true, default: "" },
    memToAyah2: { type: Number, default: null },
    memTimes2: { type: Number, min: 1, default: 1 },
    memUnique2: { type: Number, min: 0, default: 0 }, // 🆕
    memPages2: { type: Number, min: 0, default: 0 },

    // ========== إجماليات الحفظ ==========
    totalMemUnique: { type: Number, min: 0, default: 0 }, // 🆕 إجمالي الحفظ الفريد
    totalMemPages: { type: Number, min: 0, default: 0 }, // شاملة التكرار
    memPct: { type: Number, min: 0, max: 150, default: null }, // 🆕 نسبة الحفظ (cap 150%)

    // ========== المراجعة - الفترة الأولى ==========
    revPeriod1Label: { type: String, trim: true, default: "" },
    revFromSurah: { type: String, trim: true, default: "" },
    revFromAyah: { type: Number, default: null },
    revToSurah: { type: String, trim: true, default: "" },
    revToAyah: { type: Number, default: null },
    revDailyRatePages: { type: Number, min: 0, default: null },
    revTimes1: { type: Number, min: 1, default: 1 },
    expectedRevisionPages: { type: Number, min: 0, default: null },
    revUnique1: { type: Number, min: 0, default: 0 }, // 🆕
    revPages1: { type: Number, min: 0, default: 0 },

    // ========== المراجعة - الفترة الثانية ==========
    hasRevPeriod2: { type: Boolean, default: false },
    revPeriod2Label: { type: String, trim: true, default: "" },
    revDailyRatePages2: { type: Number, min: 0, default: null },
    expectedRevisionPages2: { type: Number, min: 0, default: null },
    revFromSurah2: { type: String, trim: true, default: "" },
    revToSurah2: { type: String, trim: true, default: "" },
    revTimes2: { type: Number, min: 1, default: 1 },
    revUnique2: { type: Number, min: 0, default: 0 }, // 🆕
    revPages2: { type: Number, min: 0, default: 0 },

    // ========== إجماليات المراجعة ==========
    totalRevUnique: { type: Number, min: 0, default: 0 }, // 🆕
    totalRevisionPages: { type: Number, min: 0, default: 0 },
    revPct: { type: Number, min: 0, max: 150, default: null }, // 🆕

    revGrade: { type: String, enum: [...GRADES, null], default: null },

    // المتون
    mutoonFrom: { type: String, trim: true, default: "" },
    mutoonTo: { type: String, trim: true, default: "" },

    grade: { type: String, enum: [...GRADES, null], default: null },
    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

hifzSchema.index({ student: 1, month: 1 }, { unique: true, sparse: true });
hifzSchema.index({ employee: 1, month: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Hifz", hifzSchema);
module.exports.GRADES = GRADES;
module.exports.HIFZ_STATUS = HIFZ_STATUS;
