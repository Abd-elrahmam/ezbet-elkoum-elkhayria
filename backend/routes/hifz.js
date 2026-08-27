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
        // أيام الحضور: من الطلب، أو تُسحب من ملخص الحضور الشهري (لو الشهر بصيغة YYYY-MM)
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
        const dailyRatePages =
          r.dailyRatePages != null ? Number(r.dailyRatePages) : null;
        // نعتمد على الأرقام اللي حسبها الفرونت وعرضها للمستخدم لحظة التسجيل،
        // ونحسب بأنفسنا بس كـ fallback لو الطلب جاي من مصدر تاني ملبعتش القيم دي
        const expectedPages =
          r.expectedPages != null
            ? Number(r.expectedPages)
            : status !== "normal"
              ? 0
              : dailyRatePages == null || presentDays == null
                ? null
                : Math.round(dailyRatePages * presentDays * 100) / 100;

        const memCalc =
          r.totalMemPages != null
            ? { pagesCount: Number(r.totalMemPages) }
            : status === "normal"
              ? computePagesRangeByName(
                  r.memFromSurah,
                  r.memFromAyah,
                  r.memToSurah,
                  r.memToAyah,
                )
              : { pagesCount: 0 };

        // المراجعة بتتحسب بالسورة كاملة (من أول آية في "من سورة" لحد آخر آية في "إلى سورة")
        // مش بآية محددة، لأن المراجعة غالبًا بتكون بالسور/الأجزاء مش بجزء من آية
        const revFromSurahObj = findSurahByName(r.revFromSurah);
        const revToSurahObj = findSurahByName(r.revToSurah);
        const revFromAyah = revFromSurahObj ? 1 : null;
        const revToAyah = revToSurahObj ? revToSurahObj.ayahCount : null;
        const revCalc = computePagesRangeByName(
          r.revFromSurah,
          revFromAyah,
          r.revToSurah,
          revToAyah,
        );

        const revDailyRatePages =
          r.revDailyRatePages != null ? Number(r.revDailyRatePages) : null;
        const expectedRevisionPages =
          r.expectedRevisionPages != null
            ? Number(r.expectedRevisionPages)
            : revDailyRatePages == null || presentDays == null
              ? null
              : Math.round(revDailyRatePages * presentDays * 100) / 100;

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
            memFromSurah: status === "normal" ? r.memFromSurah || "" : "",
            memFromAyah: status === "normal" ? r.memFromAyah || null : null,
            memToSurah: status === "normal" ? r.memToSurah || "" : "",
            memToAyah: status === "normal" ? r.memToAyah || null : null,
            totalMemPages: memCalc.pagesCount || 0,
            revFromSurah: r.revFromSurah || "",
            revFromAyah,
            revToSurah: r.revToSurah || "",
            revToAyah,
            revDailyRatePages,
            expectedRevisionPages,
            totalRevisionPages:
              r.totalRevisionPages != null
                ? Number(r.totalRevisionPages)
                : revCalc.pagesCount || 0,
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
