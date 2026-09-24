const express = require("express");
const Hifz = require("../models/Hifz");
const MonthlyAttendanceSummary = require("../models/MonthlyAttendanceSummary");
const { protect, scopeToOwnBranch } = require("../middleware/auth");
const { ROLES } = require("../utils/constants");
const { computePagesRangeByName, findSurahByName } = require("../utils/quranPages");

const router = express.Router();
router.use(protect);

router.get("/", async (req, res) => {
  const filter = {};
  if (req.user.role === ROLES.SUPER_ADMIN) {
    if (req.query.branch) filter.branch = req.query.branch;
  } else {
    filter.branch = req.user.branch;
  }
  if (req.query.department) filter.department = req.query.department;
  if (req.query.student) filter.student = req.query.student;
  if (req.query.employee) filter.employee = req.query.employee;
  if (req.query.month) filter.month = req.query.month;

  const records = await Hifz.find(filter)
    .populate("student", "name")
    .populate("employee", "name")
    .populate("teacher", "name");
  res.json(records);
});

// حفظ جماعي (أو سجل واحد جوه مصفوفة من عنصر واحد) لصفحة تسجيل الحفظ الشهري
router.post("/bulk", scopeToOwnBranch, async (req, res) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: "لا توجد سجلات لحفظها" });
    }
    const branch = req.user.role === ROLES.SUPER_ADMIN ? null : req.user.branch;

    const results = await Promise.all(
      records.map(async (r) => {
        // أيام الحضور: من الطلب، أو تُسحب من ملخص الحضور الشهري (لو الشهر بصيغة YYYY-MM)
        let presentDays = r.presentDays != null ? Number(r.presentDays) : null;
        if (presentDays == null && r.student && r.month) {
          const [y, m] = String(r.month).split("-").map(Number);
          if (y && m) {
            const summary = await MonthlyAttendanceSummary.findOne({ student: r.student, month: m, year: y });
            presentDays = summary ? summary.presentDays : null;
          }
        }

        const status = r.status || "normal";
        const dailyRatePages = r.dailyRatePages != null ? Number(r.dailyRatePages) : null;
        const expectedPages1 =
          status !== "normal"
            ? 0
            : dailyRatePages == null || presentDays == null
            ? null
            : Math.round(dailyRatePages * presentDays * 100) / 100;

        const memCalc1 = status === "normal"
          ? computePagesRangeByName(r.memFromSurah, r.memFromAyah, r.memToSurah, r.memToAyah)
          : { pagesCount: 0 };

        // الفترة الثانية للحفظ (اختيارية) - نفس منطق الفترة الأولى بمعدل ونطاق منفصلين
        const hasPeriod2 = status === "normal" && !!r.hasPeriod2;
        const dailyRatePages2 = hasPeriod2 && r.dailyRatePages2 != null ? Number(r.dailyRatePages2) : null;
        const expectedPages2 =
          !hasPeriod2
            ? 0
            : dailyRatePages2 == null || presentDays == null
            ? null
            : Math.round(dailyRatePages2 * presentDays * 100) / 100;
        const memCalc2 = hasPeriod2
          ? computePagesRangeByName(r.memFromSurah2, r.memFromAyah2, r.memToSurah2, r.memToAyah2)
          : { pagesCount: 0 };

        const expectedPages =
          expectedPages1 == null && expectedPages2 == null
            ? null
            : (expectedPages1 || 0) + (expectedPages2 || 0);
        const totalMemPages = (memCalc1.pagesCount || 0) + (memCalc2.pagesCount || 0);

        // المراجعة بتتحسب بالسورة كاملة (من أول آية في "من سورة" لحد آخر آية في "إلى سورة")
        // مش بآية محددة، لأن المراجعة غالبًا بتكون بالسور/الأجزاء مش بجزء من آية
        const revFromSurahObj = findSurahByName(r.revFromSurah);
        const revToSurahObj = findSurahByName(r.revToSurah);
        const revFromAyah = revFromSurahObj ? 1 : null;
        const revToAyah = revToSurahObj ? revToSurahObj.ayahCount : null;
        const revCalc1 = computePagesRangeByName(r.revFromSurah, revFromAyah, r.revToSurah, revToAyah);

        const revDailyRatePages = r.revDailyRatePages != null ? Number(r.revDailyRatePages) : null;
        const expectedRevisionPages1 =
          revDailyRatePages == null || presentDays == null
            ? null
            : Math.round(revDailyRatePages * presentDays * 100) / 100;

        // الفترة الثانية للمراجعة (اختيارية)
        const hasRevPeriod2 = !!r.hasRevPeriod2;
        const revFromSurahObj2 = findSurahByName(r.revFromSurah2);
        const revToSurahObj2 = findSurahByName(r.revToSurah2);
        const revFromAyah2 = revFromSurahObj2 ? 1 : null;
        const revToAyah2 = revToSurahObj2 ? revToSurahObj2.ayahCount : null;
        const revCalc2 = hasRevPeriod2
          ? computePagesRangeByName(r.revFromSurah2, revFromAyah2, r.revToSurah2, revToAyah2)
          : { pagesCount: 0 };
        const revDailyRatePages2 = hasRevPeriod2 && r.revDailyRatePages2 != null ? Number(r.revDailyRatePages2) : null;
        const expectedRevisionPages2 =
          !hasRevPeriod2
            ? 0
            : revDailyRatePages2 == null || presentDays == null
            ? null
            : Math.round(revDailyRatePages2 * presentDays * 100) / 100;

        const expectedRevisionPages =
          expectedRevisionPages1 == null && expectedRevisionPages2 == null
            ? null
            : (expectedRevisionPages1 || 0) + (expectedRevisionPages2 || 0);
        const totalRevisionPages = (revCalc1.pagesCount || 0) + (revCalc2.pagesCount || 0);

        const query = r.student ? { student: r.student, month: r.month } : { employee: r.employee, month: r.month };

        return Hifz.findOneAndUpdate(
          query,
          {
            student: r.student || null,
            employee: r.employee || null,
            branch: branch || r.branch,
            department: r.department || "quran",
            teacher: r.teacher || null,
            month: r.month,
            status,
            dailyRatePages,
            presentDays,
            expectedPages,
            period1Label: r.period1Label || "",
            memFromSurah: status === "normal" ? r.memFromSurah || "" : "",
            memFromAyah: status === "normal" ? r.memFromAyah || null : null,
            memToSurah: status === "normal" ? r.memToSurah || "" : "",
            memToAyah: status === "normal" ? r.memToAyah || null : null,
            memPages1: memCalc1.pagesCount || 0,
            hasPeriod2,
            period2Label: hasPeriod2 ? r.period2Label || "" : "",
            dailyRatePages2,
            expectedPages2,
            memFromSurah2: hasPeriod2 ? r.memFromSurah2 || "" : "",
            memFromAyah2: hasPeriod2 ? r.memFromAyah2 || null : null,
            memToSurah2: hasPeriod2 ? r.memToSurah2 || "" : "",
            memToAyah2: hasPeriod2 ? r.memToAyah2 || null : null,
            memPages2: memCalc2.pagesCount || 0,
            totalMemPages,
            revPeriod1Label: r.revPeriod1Label || "",
            revFromSurah: r.revFromSurah || "",
            revFromAyah,
            revToSurah: r.revToSurah || "",
            revToAyah,
            revDailyRatePages,
            expectedRevisionPages,
            revPages1: revCalc1.pagesCount || 0,
            hasRevPeriod2,
            revPeriod2Label: hasRevPeriod2 ? r.revPeriod2Label || "" : "",
            revDailyRatePages2,
            expectedRevisionPages2,
            revFromSurah2: hasRevPeriod2 ? r.revFromSurah2 || "" : "",
            revFromAyah2,
            revToSurah2: hasRevPeriod2 ? r.revToSurah2 || "" : "",
            revPages2: revCalc2.pagesCount || 0,
            totalRevisionPages,
            revGrade: r.revGrade || null,
            mutoonFrom: r.mutoonFrom || "",
            mutoonTo: r.mutoonTo || "",
            grade: r.grade || null,
            notes: r.notes || "",
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      })
    );
    res.status(201).json(results);
  } catch (err) {
    res.status(400).json({ message: "فشل حفظ سجلات الحفظ", error: err.message });
  }
});

module.exports = router;
