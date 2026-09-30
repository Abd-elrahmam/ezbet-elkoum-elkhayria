const express = require("express");
const Hifz = require("../models/Hifz");
const MonthlyAttendanceSummary = require("../models/MonthlyAttendanceSummary");
const { protect, scopeToOwnBranch } = require("../middleware/auth");
const { ROLES } = require("../utils/constants");
const {
  computePagesRangeByName,
  findSurahByName,
} = require("../utils/quranPages");

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
        // ============ أيام الحضور ============
        let presentDays = r.presentDays != null ? Number(r.presentDays) : null;
        if (presentDays == null && r.student && r.month) {
          const [y, m] = String(r.month).split("-").map(Number);
          if (y && m) {
            const summary = await MonthlyAttendanceSummary.findOne({
              student: r.student,
              month: m,
              year: y,
            });
            presentDays = summary ? summary.presentDays : null;
          }
        }

        const status = r.status || "normal";

        // ============ الحفظ - الفترة الأولى ============
        const dailyRatePages =
          r.dailyRatePages != null ? Number(r.dailyRatePages) : null;
        const expectedPages1 =
          status !== "normal"
            ? 0
            : dailyRatePages == null || presentDays == null
              ? null
              : Math.round(dailyRatePages * presentDays * 100) / 100;

        const memTimes1 = Math.max(1, Number(r.memTimes1) || 1);
        const memCalc1raw =
          status === "normal"
            ? computePagesRangeByName(
                r.memFromSurah,
                r.memFromAyah,
                r.memToSurah,
                r.memToAyah,
              )
            : { pagesCount: 0 };

        const memUnique1 = memCalc1raw.pagesCount || 0; // في المره الواحده
        const memPages1 = memUnique1 * memTimes1; // شاملة التكرار

        // ============ الحفظ - الفترة الثانية (اختيارية) ============
        const hasPeriod2 = status === "normal" && !!r.hasPeriod2;
        const dailyRatePages2 =
          hasPeriod2 && r.dailyRatePages2 != null
            ? Number(r.dailyRatePages2)
            : null;
        const expectedPages2 = !hasPeriod2
          ? 0
          : dailyRatePages2 == null || presentDays == null
            ? null
            : Math.round(dailyRatePages2 * presentDays * 100) / 100;

        const memTimes2 = Math.max(1, Number(r.memTimes2) || 1);
        const memCalc2raw = hasPeriod2
          ? computePagesRangeByName(
              r.memFromSurah2,
              r.memFromAyah2,
              r.memToSurah2,
              r.memToAyah2,
            )
          : { pagesCount: 0 };

        const memUnique2 = memCalc2raw.pagesCount || 0;
        const memPages2 = memUnique2 * memTimes2;

        // ============ إجماليات الحفظ ============
        const expectedPages =
          expectedPages1 == null && expectedPages2 == null
            ? null
            : (expectedPages1 || 0) + (expectedPages2 || 0);

        const totalMemUnique = memUnique1 + memUnique2;
        const totalMemPages = memPages1 + memPages2;

        // نسبة الحفظ (على الفي المره الواحده + cap 150%)
        const rawMemPct =
          expectedPages && expectedPages > 0
            ? Math.round((totalMemUnique / expectedPages) * 100)
            : null;
        const memPct = rawMemPct != null ? Math.min(rawMemPct, 150) : null;

        // ============ المراجعة - الفترة الأولى ============
        const revFromSurahObj = findSurahByName(r.revFromSurah);
        const revToSurahObj = findSurahByName(r.revToSurah);
        const revFromAyah = revFromSurahObj ? 1 : null;
        const revToAyah = revToSurahObj ? revToSurahObj.ayahCount : null;

        const revTimes1 = Math.max(1, Number(r.revTimes1) || 1);
        const revCalc1raw = computePagesRangeByName(
          r.revFromSurah,
          revFromAyah,
          r.revToSurah,
          revToAyah,
        );

        const revUnique1 = revCalc1raw.pagesCount || 0;
        const revPages1 = revUnique1 * revTimes1;

        const revDailyRatePages =
          r.revDailyRatePages != null ? Number(r.revDailyRatePages) : null;
        const expectedRevisionPages1 =
          revDailyRatePages == null || presentDays == null
            ? null
            : Math.round(revDailyRatePages * presentDays * 100) / 100;

        // ============ المراجعة - الفترة الثانية (اختيارية) ============
        const hasRevPeriod2 = !!r.hasRevPeriod2;
        const revFromSurahObj2 = findSurahByName(r.revFromSurah2);
        const revToSurahObj2 = findSurahByName(r.revToSurah2);
        const revFromAyah2 = revFromSurahObj2 ? 1 : null;
        const revToAyah2 = revToSurahObj2 ? revToSurahObj2.ayahCount : null;

        const revTimes2 = Math.max(1, Number(r.revTimes2) || 1);
        const revCalc2raw = hasRevPeriod2
          ? computePagesRangeByName(
              r.revFromSurah2,
              revFromAyah2,
              r.revToSurah2,
              revToAyah2,
            )
          : { pagesCount: 0 };

        const revUnique2 = revCalc2raw.pagesCount || 0;
        const revPages2 = revUnique2 * revTimes2;

        const revDailyRatePages2 =
          hasRevPeriod2 && r.revDailyRatePages2 != null
            ? Number(r.revDailyRatePages2)
            : null;
        const expectedRevisionPages2 = !hasRevPeriod2
          ? 0
          : revDailyRatePages2 == null || presentDays == null
            ? null
            : Math.round(revDailyRatePages2 * presentDays * 100) / 100;

        // ============ إجماليات المراجعة ============
        const expectedRevisionPages =
          expectedRevisionPages1 == null && expectedRevisionPages2 == null
            ? null
            : (expectedRevisionPages1 || 0) + (expectedRevisionPages2 || 0);

        const totalRevUnique = revUnique1 + revUnique2;
        const totalRevisionPages = revPages1 + revPages2;

        // نسبة المراجعة (على الفي المره الواحده + cap 150%)
        const rawRevPct =
          expectedRevisionPages && expectedRevisionPages > 0
            ? Math.round((totalRevUnique / expectedRevisionPages) * 100)
            : null;
        const revPct = rawRevPct != null ? Math.min(rawRevPct, 150) : null;

        // ============ الحفظ في الداتابيز ============
        const query = r.student
          ? { student: r.student, month: r.month }
          : { employee: r.employee, month: r.month };

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
            memTimes1,
            memUnique1,
            memPages1,
            hasPeriod2,
            period2Label: hasPeriod2 ? r.period2Label || "" : "",
            dailyRatePages2,
            expectedPages2,
            memFromSurah2: hasPeriod2 ? r.memFromSurah2 || "" : "",
            memFromAyah2: hasPeriod2 ? r.memFromAyah2 || null : null,
            memToSurah2: hasPeriod2 ? r.memToSurah2 || "" : "",
            memToAyah2: hasPeriod2 ? r.memToAyah2 || null : null,
            memTimes2: hasPeriod2 ? memTimes2 : 1,
            memUnique2,
            memPages2,
            totalMemUnique,
            totalMemPages,
            memPct,
            revPeriod1Label: r.revPeriod1Label || "",
            revFromSurah: r.revFromSurah || "",
            revFromAyah,
            revToSurah: r.revToSurah || "",
            revToAyah,
            revDailyRatePages,
            revTimes1,
            expectedRevisionPages,
            revUnique1,
            revPages1,
            hasRevPeriod2,
            revPeriod2Label: hasRevPeriod2 ? r.revPeriod2Label || "" : "",
            revDailyRatePages2,
            expectedRevisionPages2,
            revFromSurah2: hasRevPeriod2 ? r.revFromSurah2 || "" : "",
            revFromAyah2,
            revToSurah2: hasRevPeriod2 ? r.revToSurah2 || "" : "",
            revTimes2: hasRevPeriod2 ? revTimes2 : 1,
            revUnique2,
            revPages2,
            totalRevUnique,
            totalRevisionPages,
            revPct,
            revGrade: r.revGrade || null,
            mutoonFrom: r.mutoonFrom || "",
            mutoonTo: r.mutoonTo || "",
            grade: r.grade || null,
            notes: r.notes || "",
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
      }),
    );
    res.status(201).json(results);
  } catch (err) {
    res
      .status(400)
      .json({ message: "فشل حفظ سجلات الحفظ", error: err.message });
  }
});

module.exports = router;
