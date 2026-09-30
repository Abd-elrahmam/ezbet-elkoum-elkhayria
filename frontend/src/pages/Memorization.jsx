import React, { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { usePeriod, MONTH_NAMES } from "../context/PeriodContext";
import { SURAHS } from "../utils/quranSurahs";
import { computePagesRange, surahNameByNumber } from "../utils/quranPages";
import { formatPagesOrJuz, autoGradeFromPercent } from "../utils/quran";
import { useDepartmentAccess } from "../hooks/useDepartmentAccess";
import Modal from "../components/Modal";

const STATUS_OPTIONS = [
  { value: "normal", label: "حفظ ومراجعة" },
  // { value: "khatm", label: "🌟 ختم القرآن" },
  { value: "review_only", label: "مراجعة فقط" },
];

const GRADE_OPTIONS = [
  { value: "", label: "بدون تقييم" },
  { value: "excellent", label: "ممتاز" },
  { value: "very_good", label: "جيد جدًا" },
  { value: "good", label: "جيد" },
  { value: "acceptable", label: "مقبول" },
  { value: "weak", label: "ضعيف" },
];

const emptyDraft = () => ({
  status: "normal",
  period1Label: "",
  dailyRatePages: 0.5,
  memFromSurah: "",
  memFromAyah: "",
  memToSurah: "",
  memToAyah: "",
  memTimes1: 1,
  hasPeriod2: false,
  period2Label: "",
  dailyRatePages2: 0.5,
  memFromSurah2: "",
  memFromAyah2: "",
  memToSurah2: "",
  memToAyah2: "",
  memTimes2: 1,
  revPeriod1Label: "",
  revFromSurah: "",
  revToSurah: "",
  revDailyRatePages: 0.5,
  revTimes1: 1,
  hasRevPeriod2: false,
  revPeriod2Label: "",
  revFromSurah2: "",
  revToSurah2: "",
  revDailyRatePages2: 0.5,
  revTimes2: 1,
  revGrade: "",
  revGradeMode: "auto",
  mutoonFrom: "",
  mutoonTo: "",
  grade: "",
  gradeMode: "auto",
  notes: "",
});

// يحول اسم السورة المخزّن رجوع لرقم عشان يتظبط في الـ select
const surahNumberByName = (name) => {
  const s = SURAHS.find((sr) => sr.name === name);
  return s ? s.number : "";
};

const SurahAyahPicker = ({ label, surahValue, ayahValue, onSurah, onAyah }) => (
  <div className="grid grid-cols-2 gap-2">
    <div>
      <label className="label">{label} - سورة</label>
      <select
        className="input"
        value={surahValue}
        onChange={(e) => onSurah(e.target.value)}
      >
        <option value="">اختر السورة</option>
        {SURAHS.map((sr) => (
          <option key={sr.number} value={sr.number}>
            {sr.number}. {sr.name}
          </option>
        ))}
      </select>
    </div>
    <div>
      <label className="label">آية</label>
      <input
        type="number"
        min={1}
        className="input"
        value={ayahValue}
        onChange={(e) => onAyah(e.target.value)}
      />
    </div>
  </div>
);

const SurahOnlyPicker = ({ label, surahValue, onSurah }) => (
  <div>
    <label className="label">{label} - سورة</label>
    <select
      className="input"
      value={surahValue}
      onChange={(e) => onSurah(e.target.value)}
    >
      <option value="">اختر السورة</option>
      {SURAHS.map((sr) => (
        <option key={sr.number} value={sr.number}>
          {sr.number}. {sr.name}
        </option>
      ))}
    </select>
  </div>
);

const Memorization = () => {
  const { user } = useAuth();
  const { activeMonth, activeYear, isCustom } = usePeriod();
  const deptAccess = useDepartmentAccess();

  const [department, setDepartment] = useState(
    deptAccess.department || "quran",
  );
  const [branches, setBranches] = useState([]);
  const [filterBranch, setFilterBranch] = useState("");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState("name");

  const [students, setStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [records, setRecords] = useState({});

  const [month, setMonth] = useState(activeMonth);
  const [year, setYear] = useState(activeYear);
  const [monthTouched, setMonthTouched] = useState(false);
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  const [activeStudent, setActiveStudent] = useState(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    if (!monthTouched) {
      setMonth(activeMonth);
      setYear(activeYear);
    }
  }, [activeMonth, activeYear]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (deptAccess.locked && department !== deptAccess.department) {
      setDepartment(deptAccess.department);
    }
  }, [deptAccess.locked, deptAccess.department]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user.role === "super_admin") {
      api.get("/branches").then((res) => setBranches(res.data));
    }
  }, [user.role]);

  useEffect(() => {
    const params = { department, sort: sortMode };
    if (filterBranch) params.branch = filterBranch;
    api.get("/students", { params }).then((res) => setStudents(res.data));
  }, [department, filterBranch, sortMode]);

  useEffect(() => {
    const params = { department, month, year };
    if (filterBranch) params.branch = filterBranch;
    api.get("/monthly-attendance", { params }).then((res) => {
      const map = {};
      res.data.forEach((r) => {
        if (r.student) map[r.student._id || r.student] = r.presentDays;
      });
      setAttendanceMap(map);
    });
  }, [department, month, year, filterBranch]);

  const loadHifz = () => {
    const params = { department, month: monthStr };
    if (filterBranch) params.branch = filterBranch;
    api.get("/hifz", { params }).then((res) => {
      const map = {};
      res.data.forEach((r) => {
        const id = r.student?._id || r.student;
        if (!id) return;
        map[id] = {
          status: r.status || "normal",
          period1Label: r.period1Label || "",
          dailyRatePages: r.dailyRatePages ?? 0.5,
          memFromSurah: surahNumberByName(r.memFromSurah),
          memFromAyah: r.memFromAyah || "",
          memToSurah: surahNumberByName(r.memToSurah),
          memToAyah: r.memToAyah || "",
          memTimes1: r.memTimes1 || 1,
          hasPeriod2: !!r.hasPeriod2,
          period2Label: r.period2Label || "",
          dailyRatePages2: r.dailyRatePages2 ?? 0.5,
          memFromSurah2: surahNumberByName(r.memFromSurah2),
          memFromAyah2: r.memFromAyah2 || "",
          memToSurah2: surahNumberByName(r.memToSurah2),
          memToAyah2: r.memToAyah2 || "",
          memTimes2: r.memTimes2 || 1,
          revPeriod1Label: r.revPeriod1Label || "",
          revFromSurah: surahNumberByName(r.revFromSurah),
          revToSurah: surahNumberByName(r.revToSurah),
          revDailyRatePages: r.revDailyRatePages ?? 0.5,
          revTimes1: r.revTimes1 || 1,
          hasRevPeriod2: !!r.hasRevPeriod2,
          revPeriod2Label: r.revPeriod2Label || "",
          revFromSurah2: surahNumberByName(r.revFromSurah2),
          revToSurah2: surahNumberByName(r.revToSurah2),
          revDailyRatePages2: r.revDailyRatePages2 ?? 0.5,
          revTimes2: r.revTimes2 || 1,
          revGrade: r.revGrade || "",
          revGradeMode: r.revGrade ? "manual" : "auto",
          mutoonFrom: r.mutoonFrom || "",
          mutoonTo: r.mutoonTo || "",
          grade: r.grade || "",
          gradeMode: r.grade ? "manual" : "auto",
          notes: r.notes || "",
        };
      });
      setRecords(map);
    });
  };
  const [attendanceWarning, setAttendanceWarning] = useState("");

  useEffect(loadHifz, [department, monthStr, filterBranch]);
  useEffect(
    () => setAttendanceWarning(""),
    [department, monthStr, filterBranch],
  );

  const openStudent = (student) => {
    const presentDays = attendanceMap[student._id];
    if (presentDays == null) {
      setAttendanceWarning(
        `⚠️ لازم تسجّل حضور "${student.name}" في شهر ${MONTH_NAMES[month - 1]} ${year} الأول من صفحة "الحضور والغياب"، وبعدين ترجع تسجّل حفظه.`,
      );
      return;
    }
    setAttendanceWarning("");
    setActiveStudent(student);
    setDraft(records[student._id] || emptyDraft());
    setSaveMsg("");
  };
  const closeModal = () => setActiveStudent(null);
  const updateDraft = (field, value) =>
    setDraft((prev) => ({ ...prev, [field]: value }));

  const updateStatus = (status) => {
    setDraft((prev) => ({
      ...prev,
      status,
      ...(status !== "normal"
        ? { memFromSurah: "", memFromAyah: "", memToSurah: "", memToAyah: "" }
        : {}),
    }));
  };

  // ============================================================
  // الحساب الرئيسي (معدّل):
  // - memUnique = الصفحات الفي المره الواحده (بدون تكرار)
  // - memPages  = الصفحات شاملة التكرار
  // - النسبة (pct) بتتحسب على الفي المره الواحده + cap عند 150%
  // ============================================================
  const draftCalc = useMemo(() => {
    const presentDays = activeStudent ? attendanceMap[activeStudent._id] : null;
    const isNormal = draft.status === "normal";
    const days = presentDays || 0;

    // ============ الحفظ - الفترة الأولى ============
    const dailyRate1 = Number(draft.dailyRatePages) || 0;
    const expectedPages1 = isNormal
      ? Math.round(dailyRate1 * days * 100) / 100
      : 0;

    let memUnique1 = 0;
    let memPages1 = 0;
    if (
      isNormal &&
      draft.memFromSurah &&
      draft.memFromAyah &&
      draft.memToSurah &&
      draft.memToAyah
    ) {
      memUnique1 = computePagesRange(
        draft.memFromSurah,
        draft.memFromAyah,
        draft.memToSurah,
        draft.memToAyah,
      ).pagesCount;
      const times1 = Math.max(1, Number(draft.memTimes1) || 1);
      memPages1 = memUnique1 * times1;
    }

    // ============ الحفظ - الفترة الثانية ============
    const dailyRate2 = Number(draft.dailyRatePages2) || 0;
    const expectedPages2 =
      isNormal && draft.hasPeriod2
        ? Math.round(dailyRate2 * days * 100) / 100
        : 0;

    let memUnique2 = 0;
    let memPages2 = 0;
    if (
      isNormal &&
      draft.hasPeriod2 &&
      draft.memFromSurah2 &&
      draft.memFromAyah2 &&
      draft.memToSurah2 &&
      draft.memToAyah2
    ) {
      memUnique2 = computePagesRange(
        draft.memFromSurah2,
        draft.memFromAyah2,
        draft.memToSurah2,
        draft.memToAyah2,
      ).pagesCount;
      const times2 = Math.max(1, Number(draft.memTimes2) || 1);
      memPages2 = memUnique2 * times2;
    }

    const expectedPages = expectedPages1 + expectedPages2;
    const memUnique = memUnique1 + memUnique2;
    const memPages = memPages1 + memPages2;

    // النسبة على الفي المره الواحده + cap 150%
    const rawPct =
      expectedPages > 0 ? Math.round((memUnique / expectedPages) * 100) : null;
    const pct = rawPct != null ? Math.min(rawPct, 150) : null;

    // ============ المراجعة - الفترة الأولى ============
    let revUnique1 = 0;
    let revPages1 = 0;
    if (draft.revFromSurah && draft.revToSurah) {
      const toSurahInfo = SURAHS.find(
        (sr) => sr.number === Number(draft.revToSurah),
      );
      const lastAyah = toSurahInfo ? toSurahInfo.ayahCount : 1;
      revUnique1 = computePagesRange(
        draft.revFromSurah,
        1,
        draft.revToSurah,
        lastAyah,
      ).pagesCount;
      const revTimes1 = Math.max(1, Number(draft.revTimes1) || 1);
      revPages1 = revUnique1 * revTimes1;
    }
    const revDailyRate1 = Number(draft.revDailyRatePages) || 0;
    const expectedRevisionPages1 = Math.round(revDailyRate1 * days * 100) / 100;

    // ============ المراجعة - الفترة الثانية ============
    let revUnique2 = 0;
    let revPages2 = 0;
    if (draft.hasRevPeriod2 && draft.revFromSurah2 && draft.revToSurah2) {
      const toSurahInfo2 = SURAHS.find(
        (sr) => sr.number === Number(draft.revToSurah2),
      );
      const lastAyah2 = toSurahInfo2 ? toSurahInfo2.ayahCount : 1;
      revUnique2 = computePagesRange(
        draft.revFromSurah2,
        1,
        draft.revToSurah2,
        lastAyah2,
      ).pagesCount;
      const revTimes2 = Math.max(1, Number(draft.revTimes2) || 1);
      revPages2 = revUnique2 * revTimes2;
    }
    const revDailyRate2 = Number(draft.revDailyRatePages2) || 0;
    const expectedRevisionPages2 = draft.hasRevPeriod2
      ? Math.round(revDailyRate2 * days * 100) / 100
      : 0;

    const expectedRevisionPages =
      expectedRevisionPages1 + expectedRevisionPages2;
    const revUnique = revUnique1 + revUnique2;
    const revPages = revPages1 + revPages2;

    const rawRevPct =
      expectedRevisionPages > 0
        ? Math.round((revUnique / expectedRevisionPages) * 100)
        : null;
    const revPct = rawRevPct != null ? Math.min(rawRevPct, 150) : null;

    return {
      presentDays,
      // الحفظ
      expectedPages,
      memPages,
      memUnique,
      pct,
      rawPct,
      expectedPages1,
      memPages1,
      memUnique1,
      expectedPages2,
      memPages2,
      memUnique2,
      // المراجعة
      expectedRevisionPages,
      revPages,
      revUnique,
      revPct,
      rawRevPct,
      expectedRevisionPages1,
      revPages1,
      revUnique1,
      expectedRevisionPages2,
      revPages2,
      revUnique2,
    };
  }, [draft, activeStudent, attendanceMap]);

  // تحديث تقدير الحفظ تلقائيًا من نسبة الحفظ (على الفي المره الواحده)
  useEffect(() => {
    if (draft.gradeMode !== "auto") return;
    if (draft.status !== "normal" || draftCalc.pct == null) return;
    const suggested = autoGradeFromPercent(draftCalc.pct);
    if (suggested && suggested !== draft.grade) {
      setDraft((prev) => ({ ...prev, grade: suggested }));
    }
  }, [draftCalc.pct, draft.gradeMode, draft.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // تحديث تقدير المراجعة تلقائيًا (على الفي المره الواحده)
  useEffect(() => {
    if (draft.revGradeMode !== "auto") return;
    if (draftCalc.revPct == null) return;
    const suggested = autoGradeFromPercent(draftCalc.revPct);
    if (suggested && suggested !== draft.revGrade) {
      setDraft((prev) => ({ ...prev, revGrade: suggested }));
    }
  }, [draftCalc.revPct, draft.revGradeMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGradeChange = (value) => {
    setDraft((prev) => ({ ...prev, grade: value, gradeMode: "manual" }));
  };
  const resetGradeToAuto = () => {
    const suggested =
      draftCalc.pct != null ? autoGradeFromPercent(draftCalc.pct) : "";
    setDraft((prev) => ({ ...prev, grade: suggested, gradeMode: "auto" }));
  };

  const handleRevGradeChange = (value) => {
    setDraft((prev) => ({ ...prev, revGrade: value, revGradeMode: "manual" }));
  };
  const resetRevGradeToAuto = () => {
    const suggested =
      draftCalc.revPct != null ? autoGradeFromPercent(draftCalc.revPct) : "";
    setDraft((prev) => ({
      ...prev,
      revGrade: suggested,
      revGradeMode: "auto",
    }));
  };

  const handleSaveDraft = async () => {
    if (!activeStudent) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const payload = [
        {
          student: activeStudent._id,
          branch: activeStudent.branch?._id || activeStudent.branch,
          department,
          teacher: activeStudent.teacher?._id || activeStudent.teacher || null,
          month: monthStr,
          status: draft.status,
          period1Label: draft.period1Label || "",
          dailyRatePages: Number(draft.dailyRatePages) || 0,
          presentDays: attendanceMap[activeStudent._id],
          memFromSurah: surahNameByNumber(draft.memFromSurah),
          memFromAyah: draft.memFromAyah || null,
          memToSurah: surahNameByNumber(draft.memToSurah),
          memToAyah: draft.memToAyah || null,
          memTimes1: Number(draft.memTimes1) || 1,
          hasPeriod2: !!draft.hasPeriod2,
          period2Label: draft.period2Label || "",
          dailyRatePages2: Number(draft.dailyRatePages2) || 0,
          memFromSurah2: surahNameByNumber(draft.memFromSurah2),
          memFromAyah2: draft.memFromAyah2 || null,
          memToSurah2: surahNameByNumber(draft.memToSurah2),
          memToAyah2: draft.memToAyah2 || null,
          memTimes2: Number(draft.memTimes2) || 1,
          revPeriod1Label: draft.revPeriod1Label || "",
          revFromSurah: surahNameByNumber(draft.revFromSurah),
          revToSurah: surahNameByNumber(draft.revToSurah),
          revDailyRatePages: Number(draft.revDailyRatePages) || 0,
          revTimes1: Number(draft.revTimes1) || 1,
          hasRevPeriod2: !!draft.hasRevPeriod2,
          revPeriod2Label: draft.revPeriod2Label || "",
          revFromSurah2: surahNameByNumber(draft.revFromSurah2),
          revToSurah2: surahNameByNumber(draft.revToSurah2),
          revDailyRatePages2: Number(draft.revDailyRatePages2) || 0,
          revTimes2: Number(draft.revTimes2) || 1,
          revGrade: draft.revGrade || null,
          mutoonFrom: draft.mutoonFrom || "",
          mutoonTo: draft.mutoonTo || "",
          grade: draft.grade || null,
          notes: draft.notes || "",
        },
      ];
      await api.post("/hifz/bulk", { records: payload });
      setRecords((prev) => ({ ...prev, [activeStudent._id]: draft }));
      setSaveMsg("تم الحفظ بنجاح ✅");
      setTimeout(() => setActiveStudent(null), 700);
    } catch (err) {
      setSaveMsg(err.response?.data?.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = useMemo(
    () =>
      students.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [students, search],
  );

  const statusBadge = (rec) => {
    if (!rec) return null;
    if (rec.status === "khatm")
      return <span className="badge bg-amber-100 text-amber-700">🌟 ختم</span>;
    if (rec.status === "review_only")
      return <span className="badge bg-sky-100 text-sky-700">مراجعة</span>;
    return <span className="badge bg-primary-50 text-primary-700">مسجّل</span>;
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold text-sand-900">تسجيل الحفظ الشهري</h1>
      </div>

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        {deptAccess.locked ? (
          <span className="badge bg-primary-50 text-primary-700">
            {department === "quran" ? "📖 الكتاب" : "🧸 الحضانة"}
          </span>
        ) : (
          <select
            className="input max-w-[160px]"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="quran">الكتاب</option>
            <option value="nursery">الحضانة</option>
          </select>
        )}

        {user.role === "super_admin" && (
          <select
            className="input max-w-[200px]"
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
          >
            <option value="">كل الفروع</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>
        )}

        <input
          className="input max-w-xs"
          placeholder="بحث بالاسم..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="input max-w-[190px]"
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value)}
        >
          <option value="name">ترتيب أبجدي</option>
          <option value="added">ترتيب الإضافة</option>
        </select>

        <div className="flex gap-2 items-center">
          <select
            className="input"
            value={month}
            onChange={(e) => {
              setMonth(Number(e.target.value));
              setMonthTouched(true);
            }}
          >
            {MONTH_NAMES.map((m, i) => (
              <option key={i + 1} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <input
            type="number"
            className="input w-24"
            value={year}
            onChange={(e) => {
              setYear(Number(e.target.value));
              setMonthTouched(true);
            }}
          />
          {isCustom && !monthTouched && (
            <span className="text-xs text-primary-700 bg-primary-50 rounded-full px-2 py-1">
              مأخوذ من الشهر المحدد أعلى الصفحة
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-sand-400 mb-3">
        دوس على اسم الطالب لفتح فورم الحفظ الخاص بيه. أيام الحضور مسحوبة
        تلقائيًا من الملخص الشهري للحضور. حساب عدد الصفحات من نطاق السورة/الآية
        تقريبي (والصفحات اللي أكتر من 20 بتتحول لعرض بالأجزاء).
      </p>

      {attendanceWarning && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-xl px-3 py-2 mb-3">
          {attendanceWarning}
        </div>
      )}

      <div className="card divide-y divide-sand-100 max-h-[65vh] overflow-y-auto p-0">
        {filteredStudents.map((s) => {
          const rec = records[s._id];
          const presentDays = attendanceMap[s._id];
          const noAttendance = presentDays == null;
          return (
            <button
              key={s._id}
              type="button"
              onClick={() => openStudent(s)}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-right transition ${noAttendance ? "bg-amber-50/40 hover:bg-amber-50" : "hover:bg-sand-50"}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-sand-900 truncate">
                  {s.name}
                </span>
                {statusBadge(rec)}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {noAttendance ? (
                  <span className="text-xs text-amber-600 font-semibold">
                    ⚠️ لم يُسجَّل الحضور
                  </span>
                ) : (
                  <span className="text-xs text-sand-400">
                    حضور: {presentDays}
                  </span>
                )}
                <span className="text-sand-300">›</span>
              </div>
            </button>
          );
        })}
        {filteredStudents.length === 0 && (
          <div className="text-center text-sand-400 py-8">
            لا يوجد طلاب مطابقين
          </div>
        )}
      </div>

      <Modal
        open={!!activeStudent}
        onClose={closeModal}
        title={activeStudent ? `تسجيل حفظ: ${activeStudent.name}` : ""}
        wide
      >
        {activeStudent && (
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="badge bg-sand-100 text-sand-600">
                أيام الحضور:{" "}
                {draftCalc.presentDays != null
                  ? draftCalc.presentDays
                  : "غير مسجلة"}
              </span>
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateStatus(opt.value)}
                  className={`badge cursor-pointer border ${
                    draft.status === opt.value
                      ? opt.value === "khatm"
                        ? "bg-amber-500 text-white border-transparent"
                        : opt.value === "review_only"
                          ? "bg-sky-500 text-white border-transparent"
                          : "bg-primary-600 text-white border-transparent"
                      : "bg-white text-sand-400 border-sand-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {draft.status === "normal" && (
              <>
                {/* الحفظ الجديد - الفترة الأولى */}
                <div className="bg-primary-50/50 rounded-xl p-3 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-primary-700">
                      📖 الحفظ الجديد
                      {draft.hasPeriod2 ? " - الفترة الأولى" : ""}
                    </p>
                  </div>
                  {draft.hasPeriod2 && (
                    <input
                      className="input mb-2"
                      placeholder="اسم الفترة (مثال: الصباحية)"
                      value={draft.period1Label}
                      onChange={(e) =>
                        updateDraft("period1Label", e.target.value)
                      }
                    />
                  )}
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <div>
                      <label className="label">معدل الحفظ اليومي (صفحة)</label>
                      <input
                        type="number"
                        step="0.25"
                        min={0}
                        className="input"
                        value={draft.dailyRatePages}
                        onChange={(e) =>
                          updateDraft("dailyRatePages", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="label">المتوقع هذا الشهر</label>
                      <input
                        className="input bg-white"
                        readOnly
                        value={formatPagesOrJuz(draftCalc.expectedPages1)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <SurahAyahPicker
                      label="من"
                      surahValue={draft.memFromSurah}
                      ayahValue={draft.memFromAyah}
                      onSurah={(v) => updateDraft("memFromSurah", v)}
                      onAyah={(v) => updateDraft("memFromAyah", v)}
                    />
                    <SurahAyahPicker
                      label="إلى"
                      surahValue={draft.memToSurah}
                      ayahValue={draft.memToAyah}
                      onSurah={(v) => updateDraft("memToSurah", v)}
                      onAyah={(v) => updateDraft("memToAyah", v)}
                    />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="label whitespace-nowrap mb-0">
                      عدد المرات
                    </label>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      className="input w-20"
                      value={draft.memTimes1}
                      onChange={(e) =>
                        updateDraft(
                          "memTimes1",
                          Math.max(1, Number(e.target.value) || 1),
                        )
                      }
                    />
                    <span className="text-xs text-sand-400">
                      (لو حفظ نفس النطاق أكتر من مرة)
                    </span>
                  </div>
                  <div className="input bg-white flex items-center justify-between">
                    <span>
                      المحفوظ فعليًا: {formatPagesOrJuz(draftCalc.memPages1)}
                      {draftCalc.memUnique1 !== draftCalc.memPages1 && (
                        <span className="text-xs text-sand-400 mr-2">
                          (في المره الواحده:{" "}
                          {formatPagesOrJuz(draftCalc.memUnique1)})
                        </span>
                      )}
                      {draftCalc.expectedPages1 > 0
                        ? ` من ${formatPagesOrJuz(draftCalc.expectedPages1)} متوقعة`
                        : ""}
                    </span>
                  </div>
                </div>

                {!draft.hasPeriod2 ? (
                  <button
                    type="button"
                    className="text-sm text-primary-600 hover:underline mb-4"
                    onClick={() => updateDraft("hasPeriod2", true)}
                  >
                    ＋ إضافة فترة حفظ تانية (مسائية مثلاً)
                  </button>
                ) : (
                  <div className="bg-primary-50/50 rounded-xl p-3 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold text-primary-700">
                        📖 الحفظ الجديد - الفترة الثانية
                      </p>
                      <button
                        type="button"
                        className="text-xs text-red-500 hover:underline"
                        onClick={() => updateDraft("hasPeriod2", false)}
                      >
                        ✕ حذف الفترة التانية
                      </button>
                    </div>
                    <input
                      className="input mb-2"
                      placeholder="اسم الفترة (مثال: المسائية)"
                      value={draft.period2Label}
                      onChange={(e) =>
                        updateDraft("period2Label", e.target.value)
                      }
                    />
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <div>
                        <label className="label">
                          معدل الحفظ اليومي (صفحة)
                        </label>
                        <input
                          type="number"
                          step="0.25"
                          min={0}
                          className="input"
                          value={draft.dailyRatePages2}
                          onChange={(e) =>
                            updateDraft("dailyRatePages2", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className="label">المتوقع هذا الشهر</label>
                        <input
                          className="input bg-white"
                          readOnly
                          value={formatPagesOrJuz(draftCalc.expectedPages2)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <SurahAyahPicker
                        label="من"
                        surahValue={draft.memFromSurah2}
                        ayahValue={draft.memFromAyah2}
                        onSurah={(v) => updateDraft("memFromSurah2", v)}
                        onAyah={(v) => updateDraft("memFromAyah2", v)}
                      />
                      <SurahAyahPicker
                        label="إلى"
                        surahValue={draft.memToSurah2}
                        ayahValue={draft.memToAyah2}
                        onSurah={(v) => updateDraft("memToSurah2", v)}
                        onAyah={(v) => updateDraft("memToAyah2", v)}
                      />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <label className="label whitespace-nowrap mb-0">
                        عدد المرات
                      </label>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        className="input w-20"
                        value={draft.memTimes2}
                        onChange={(e) =>
                          updateDraft(
                            "memTimes2",
                            Math.max(1, Number(e.target.value) || 1),
                          )
                        }
                      />
                      <span className="text-xs text-sand-400">
                        (لو حفظ نفس النطاق أكتر من مرة)
                      </span>
                    </div>
                    <div className="input bg-white flex items-center justify-between">
                      <span>
                        المحفوظ فعليًا: {formatPagesOrJuz(draftCalc.memPages2)}
                        {draftCalc.memUnique2 !== draftCalc.memPages2 && (
                          <span className="text-xs text-sand-400 mr-2">
                            (في المره الواحده:{" "}
                            {formatPagesOrJuz(draftCalc.memUnique2)})
                          </span>
                        )}
                        {draftCalc.expectedPages2 > 0
                          ? ` من ${formatPagesOrJuz(draftCalc.expectedPages2)} متوقعة`
                          : ""}
                      </span>
                    </div>
                  </div>
                )}

                {/* إجمالي الحفظ */}
                <div className="input bg-primary-50 border border-primary-200 flex items-center justify-between mb-4">
                  <span className="font-semibold text-primary-800">
                    إجمالي الحفظ: {formatPagesOrJuz(draftCalc.memPages)}
                    {draftCalc.memUnique !== draftCalc.memPages && (
                      <span className="text-xs text-primary-600 mr-2">
                        (في المره الواحده:{" "}
                        {formatPagesOrJuz(draftCalc.memUnique)})
                      </span>
                    )}
                    {draftCalc.expectedPages > 0
                      ? ` من ${formatPagesOrJuz(draftCalc.expectedPages)} متوقعة`
                      : ""}
                  </span>
                  {draftCalc.pct != null && (
                    <span
                      className={`badge ${draftCalc.pct >= 100 ? "bg-primary-50 text-primary-700" : draftCalc.pct >= 50 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600"}`}
                    >
                      {draftCalc.pct}%
                    </span>
                  )}
                </div>
              </>
            )}

            {draft.status !== "normal" && (
              <div className="bg-sand-50 text-sand-500 text-sm rounded-xl px-3 py-2 mb-4">
                {draft.status === "khatm"
                  ? "الطالب ختم القرآن - مفيش حفظ جديد مطلوب، سجّل المراجعة بس."
                  : "الحالة مراجعة فقط - مفيش مقدار حفظ جديد متوقع، سجّل المراجعة بس."}
              </div>
            )}

            {/* المراجعة - الفترة الأولى */}
            <div className="bg-sky-50/50 rounded-xl p-3 mb-3">
              <p className="text-sm font-bold text-sky-700 mb-2">
                المراجعة{draft.hasRevPeriod2 ? " - الفترة الأولى" : ""}
              </p>
              {draft.hasRevPeriod2 && (
                <input
                  className="input mb-2"
                  placeholder="اسم الفترة (مثال: الصباحية)"
                  value={draft.revPeriod1Label}
                  onChange={(e) =>
                    updateDraft("revPeriod1Label", e.target.value)
                  }
                />
              )}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="label">معدل المراجعة اليومي (صفحة)</label>
                  <input
                    type="number"
                    step="0.25"
                    min={0}
                    className="input"
                    value={draft.revDailyRatePages}
                    onChange={(e) =>
                      updateDraft("revDailyRatePages", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="label">المتوقع مراجعته هذا الشهر</label>
                  <input
                    className="input bg-white"
                    readOnly
                    value={formatPagesOrJuz(draftCalc.expectedRevisionPages1)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-2">
                <SurahOnlyPicker
                  label="من"
                  surahValue={draft.revFromSurah}
                  onSurah={(v) => updateDraft("revFromSurah", v)}
                />
                <SurahOnlyPicker
                  label="إلى"
                  surahValue={draft.revToSurah}
                  onSurah={(v) => updateDraft("revToSurah", v)}
                />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <label className="label whitespace-nowrap mb-0">
                  عدد مرات المراجعة
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  className="input w-20"
                  value={draft.revTimes1}
                  onChange={(e) =>
                    updateDraft(
                      "revTimes1",
                      Math.max(1, Number(e.target.value) || 1),
                    )
                  }
                />
                <span className="text-xs text-sand-400">
                  ( إذا راجع النطاق نفسه أكثر من مرة، مثل مراجعة سورة البقرة
                  مرتين)
                </span>
              </div>
              <div className="input bg-white flex items-center justify-between">
                <span>
                  راجع فعليًا: {formatPagesOrJuz(draftCalc.revPages1)}
                  {draftCalc.revUnique1 !== draftCalc.revPages1 && (
                    <span className="text-xs text-sand-400 mr-2">
                      (في المره الواحده:{" "}
                      {formatPagesOrJuz(draftCalc.revUnique1)})
                    </span>
                  )}
                  {draftCalc.expectedRevisionPages1 > 0
                    ? ` من ${formatPagesOrJuz(draftCalc.expectedRevisionPages1)} متوقعة`
                    : ""}
                </span>
              </div>
            </div>

            {!draft.hasRevPeriod2 ? (
              <button
                type="button"
                className="text-sm text-sky-600 hover:underline mb-4"
                onClick={() => updateDraft("hasRevPeriod2", true)}
              >
                ＋ إضافة فترة مراجعة تانية (مسائية مثلاً)
              </button>
            ) : (
              <div className="bg-sky-50/50 rounded-xl p-3 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-sky-700">
                    المراجعة - الفترة الثانية
                  </p>
                  <button
                    type="button"
                    className="text-xs text-red-500 hover:underline"
                    onClick={() => updateDraft("hasRevPeriod2", false)}
                  >
                    ✕ حذف الفترة التانية
                  </button>
                </div>
                <input
                  className="input mb-2"
                  placeholder="اسم الفترة (مثال: المسائية)"
                  value={draft.revPeriod2Label}
                  onChange={(e) =>
                    updateDraft("revPeriod2Label", e.target.value)
                  }
                />
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="label">معدل المراجعة اليومي (صفحة)</label>
                    <input
                      type="number"
                      step="0.25"
                      min={0}
                      className="input"
                      value={draft.revDailyRatePages2}
                      onChange={(e) =>
                        updateDraft("revDailyRatePages2", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="label">المتوقع مراجعته هذا الشهر</label>
                    <input
                      className="input bg-white"
                      readOnly
                      value={formatPagesOrJuz(draftCalc.expectedRevisionPages2)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <SurahOnlyPicker
                    label="من"
                    surahValue={draft.revFromSurah2}
                    onSurah={(v) => updateDraft("revFromSurah2", v)}
                  />
                  <SurahOnlyPicker
                    label="إلى"
                    surahValue={draft.revToSurah2}
                    onSurah={(v) => updateDraft("revToSurah2", v)}
                  />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="label whitespace-nowrap mb-0">
                    عدد مرات المراجعة
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    className="input w-20"
                    value={draft.revTimes2}
                    onChange={(e) =>
                      updateDraft(
                        "revTimes2",
                        Math.max(1, Number(e.target.value) || 1),
                      )
                    }
                  />
                  <span className="text-xs text-sand-400">
                    (لو راجع نفس النطاق أكتر من مرة)
                  </span>
                </div>
                <div className="input bg-white flex items-center justify-between">
                  <span>
                    راجع فعليًا: {formatPagesOrJuz(draftCalc.revPages2)}
                    {draftCalc.revUnique2 !== draftCalc.revPages2 && (
                      <span className="text-xs text-sand-400 mr-2">
                        (في المره الواحده:{" "}
                        {formatPagesOrJuz(draftCalc.revUnique2)})
                      </span>
                    )}
                    {draftCalc.expectedRevisionPages2 > 0
                      ? ` من ${formatPagesOrJuz(draftCalc.expectedRevisionPages2)} متوقعة`
                      : ""}
                  </span>
                </div>
              </div>
            )}

            {/* إجمالي المراجعة */}
            <div className="input bg-sky-50 border border-sky-200 flex items-center justify-between mb-4">
              <span className="font-semibold text-sky-800">
                إجمالي المراجعة: {formatPagesOrJuz(draftCalc.revPages)}
                {draftCalc.revUnique !== draftCalc.revPages && (
                  <span className="text-xs text-sky-600 mr-2">
                    (في المره الواحده: {formatPagesOrJuz(draftCalc.revUnique)})
                  </span>
                )}
                {draftCalc.expectedRevisionPages > 0
                  ? ` من ${formatPagesOrJuz(draftCalc.expectedRevisionPages)} متوقعة`
                  : ""}
              </span>
              {draftCalc.revPct != null && (
                <span
                  className={`badge ${draftCalc.revPct >= 100 ? "bg-primary-50 text-primary-700" : draftCalc.revPct >= 50 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600"}`}
                >
                  {draftCalc.revPct}%
                </span>
              )}
            </div>

            {/* المتون */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="label">من متن</label>
                <input
                  className="input"
                  value={draft.mutoonFrom}
                  onChange={(e) => updateDraft("mutoonFrom", e.target.value)}
                  placeholder="مثال: بداية الأجرومية"
                />
              </div>
              <div>
                <label className="label">إلى متن</label>
                <input
                  className="input"
                  value={draft.mutoonTo}
                  onChange={(e) => updateDraft("mutoonTo", e.target.value)}
                  placeholder="مثال: باب الفاعل"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <div className="flex items-center justify-between">
                  <label className="label">
                    تقييم الحفظ{" "}
                    {draft.gradeMode === "auto" && draftCalc.pct != null && (
                      <span className="text-primary-600">(تلقائي)</span>
                    )}
                  </label>
                  {draft.gradeMode === "manual" && draftCalc.pct != null && (
                    <button
                      type="button"
                      onClick={resetGradeToAuto}
                      className="text-xs text-primary-600 hover:underline"
                    >
                      🔄 تلقائي
                    </button>
                  )}
                </div>
                <select
                  className="input"
                  value={draft.grade}
                  onChange={(e) => handleGradeChange(e.target.value)}
                >
                  {GRADE_OPTIONS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="label">
                    تقييم المراجعة{" "}
                    {draft.revGradeMode === "auto" &&
                      draftCalc.revPct != null && (
                        <span className="text-primary-600">(تلقائي)</span>
                      )}
                  </label>
                  {draft.revGradeMode === "manual" &&
                    draftCalc.revPct != null && (
                      <button
                        type="button"
                        onClick={resetRevGradeToAuto}
                        className="text-xs text-primary-600 hover:underline"
                      >
                        🔄 تلقائي
                      </button>
                    )}
                </div>
                <select
                  className="input"
                  value={draft.revGrade}
                  onChange={(e) => handleRevGradeChange(e.target.value)}
                >
                  {GRADE_OPTIONS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="label">ملاحظات</label>
              <input
                className="input"
                value={draft.notes}
                onChange={(e) => updateDraft("notes", e.target.value)}
              />
            </div>

            {saveMsg && (
              <div className="bg-primary-50 text-primary-700 text-sm rounded-xl px-3 py-2 mb-3">
                {saveMsg}
              </div>
            )}

            <button
              className="btn-primary w-full justify-center"
              onClick={handleSaveDraft}
              disabled={saving}
            >
              {saving ? "جارِ الحفظ..." : "حفظ"}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Memorization;
