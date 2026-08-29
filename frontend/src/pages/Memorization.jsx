import React, { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { usePeriod, MONTH_NAMES } from "../context/PeriodContext";
import { SURAHS } from "../utils/quranSurahs";
import {
  computePagesRange,
  surahNameByNumber,
  initQuranPages,
  isQuranPagesReady,
} from "../utils/quranPages";
import { formatPagesOrJuz, autoGradeFromPercent } from "../utils/quran";
import Modal from "../components/Modal";

const STATUS_OPTIONS = [
  { value: "normal", label: "عادي" },
  { value: "khatm", label: "🌟 ختم القرآن" },
  { value: "review_only", label: "🔁 مراجعة فقط" },
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
  dailyRatePages: 0.5,
  memFromSurah: "",
  memFromAyah: "",
  memToSurah: "",
  memToAyah: "",
  revFromSurah: "",
  revToSurah: "",
  revDailyRatePages: 0.5,
  revGrade: "",
  revGradeMode: "auto",
  mutoonFrom: "",
  mutoonTo: "",
  grade: "",
  gradeMode: "auto", // auto = التقدير بيتحسب لوحده من النسبة | manual = المستخدم اختاره بنفسه
  notes: "",
});

// يحول اسم السورة المخزّن رجوع لرقم عشان يتظبط في الـ select
const surahNumberByName = (name) => {
  const s = SURAHS.find((sr) => sr.name === name);
  return s ? s.number : "";
};

// ثابتة برّه الكومبوننت الأساسية عشان مرجعها ميتغيرش كل ريندر
// (لو اتعرّفت جوه الكومبوننت، React بيعتبرها نوع مختلف كل مرة وبيفصل التركيز من الإنبوت)
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

// نفس الفكرة لكن للمراجعة: من سورة - إلى سورة بس، بدون آية
// (المراجعة بتتحسب بالسورة كاملة مش بجزء من آية)
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

  const [department, setDepartment] = useState("quran");
  const [branches, setBranches] = useState([]);
  const [filterBranch, setFilterBranch] = useState("");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState("name");

  const [students, setStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({}); // studentId -> presentDays
  const [records, setRecords] = useState({}); // studentId -> draft fields

  const [month, setMonth] = useState(activeMonth);
  const [year, setYear] = useState(activeYear);
  const [monthTouched, setMonthTouched] = useState(false);
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  const [activeStudent, setActiveStudent] = useState(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // خريطة صفحات المصحف بتتحمّل في الخلفية من main.jsx، وهنا بنتأكد إنها
  // جاهزة فعلًا قبل ما نسمح بحساب عدد الصفحات (عادةً سريعة جدًا لأنها ملف محلي)
  const [pagesReady, setPagesReady] = useState(isQuranPagesReady());
  useEffect(() => {
    if (pagesReady) return;
    let cancelled = false;
    initQuranPages()
      .then(() => {
        if (!cancelled) setPagesReady(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pagesReady]);

  useEffect(() => {
    if (!monthTouched) {
      setMonth(activeMonth);
      setYear(activeYear);
    }
  }, [activeMonth, activeYear]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // سحب أيام الحضور من الملخص الشهري لنفس الشهر/السنة
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

  // سحب سجلات الحفظ المحفوظة سابقًا لنفس الشهر
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
          dailyRatePages: r.dailyRatePages ?? 0.5,
          memFromSurah: surahNumberByName(r.memFromSurah),
          memFromAyah: r.memFromAyah || "",
          memToSurah: surahNumberByName(r.memToSurah),
          memToAyah: r.memToAyah || "",
          revFromSurah: surahNumberByName(r.revFromSurah),
          revToSurah: surahNumberByName(r.revToSurah),
          revDailyRatePages: r.revDailyRatePages ?? 0.5,
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
  useEffect(loadHifz, [department, monthStr, filterBranch]);

  const openStudent = (student) => {
    setActiveStudent(student);
    setDraft(records[student._id] || emptyDraft());
    setSaveMsg("");
  };
  const closeModal = () => setActiveStudent(null);
  const updateDraft = (field, value) =>
    setDraft((prev) => ({ ...prev, [field]: value }));

  // لو حدد "ختم القرآن" أو "مراجعة فقط"، مفيش داعي لبيانات حفظ جديد - نفضّيها
  const updateStatus = (status) => {
    setDraft((prev) => ({
      ...prev,
      status,
      ...(status !== "normal"
        ? { memFromSurah: "", memFromAyah: "", memToSurah: "", memToAyah: "" }
        : {}),
    }));
  };

  const draftCalc = useMemo(() => {
    const presentDays = activeStudent ? attendanceMap[activeStudent._id] : null;
    const dailyRate = Number(draft.dailyRatePages) || 0;
    const expectedPages =
      draft.status === "review_only" || draft.status === "khatm"
        ? 0
        : Math.round(dailyRate * (presentDays || 0) * 100) / 100;

    let memPages = 0;
    if (
      pagesReady &&
      draft.status === "normal" &&
      draft.memFromSurah &&
      draft.memFromAyah &&
      draft.memToSurah &&
      draft.memToAyah
    ) {
      memPages = computePagesRange(
        draft.memFromSurah,
        draft.memFromAyah,
        draft.memToSurah,
        draft.memToAyah,
      ).pagesCount;
    }
    let revPages = 0;
    if (pagesReady && draft.revFromSurah && draft.revToSurah) {
      const toSurahInfo = SURAHS.find(
        (sr) => sr.number === Number(draft.revToSurah),
      );
      const lastAyah = toSurahInfo ? toSurahInfo.ayahCount : 1;
      revPages = computePagesRange(
        draft.revFromSurah,
        1,
        draft.revToSurah,
        lastAyah,
      ).pagesCount;
    }
    const revDailyRate = Number(draft.revDailyRatePages) || 0;
    const expectedRevisionPages =
      Math.round(revDailyRate * (presentDays || 0) * 100) / 100;
    const revPct =
      expectedRevisionPages > 0
        ? Math.round((revPages / expectedRevisionPages) * 100)
        : null;
    const pct =
      expectedPages > 0 ? Math.round((memPages / expectedPages) * 100) : null;
    return {
      presentDays,
      expectedPages,
      memPages,
      revPages,
      pct,
      expectedRevisionPages,
      revPct,
    };
  }, [draft, activeStudent, attendanceMap, pagesReady]);

  // تحديث تقدير الحفظ تلقائيًا من نسبة الحفظ، إلا لو المستخدم اختار تقدير بنفسه
  useEffect(() => {
    if (draft.gradeMode !== "auto") return;
    if (draft.status !== "normal" || draftCalc.pct == null) return;
    const suggested = autoGradeFromPercent(draftCalc.pct);
    if (suggested && suggested !== draft.grade) {
      setDraft((prev) => ({ ...prev, grade: suggested }));
    }
  }, [draftCalc.pct, draft.gradeMode, draft.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // تحديث تقدير المراجعة تلقائيًا من نسبة المراجعة (منفصل تمامًا عن تقييم الحفظ)
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
          dailyRatePages: Number(draft.dailyRatePages) || 0,
          presentDays: attendanceMap[activeStudent._id],
          expectedPages: draftCalc.expectedPages, // ⬅️ جديد
          memFromSurah: surahNameByNumber(draft.memFromSurah),
          memFromAyah: draft.memFromAyah || null,
          memToSurah: surahNameByNumber(draft.memToSurah),
          memToAyah: draft.memToAyah || null,
          totalMemPages: draftCalc.memPages, // ⬅️ جديد
          revFromSurah: surahNameByNumber(draft.revFromSurah),
          revToSurah: surahNameByNumber(draft.revToSurah),
          revDailyRatePages: Number(draft.revDailyRatePages) || 0,
          expectedRevisionPages: draftCalc.expectedRevisionPages, // ⬅️ جديد
          totalRevisionPages: draftCalc.revPages, // ⬅️ جديد
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
      return <span className="badge bg-sky-100 text-sky-700">🔁 مراجعة</span>;
    return <span className="badge bg-primary-50 text-primary-700">مسجّل</span>;
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold text-sand-900">تسجيل الحفظ الشهري</h1>
        {!pagesReady && (
          <span className="text-xs text-sand-400">جارِ تجهيز بيانات صفحات المصحف...</span>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <select
          className="input max-w-[160px]"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
        >
          <option value="quran">الكتاب</option>
          <option value="nursery">الحضانة</option>
        </select>

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

      <div className="card divide-y divide-sand-100 max-h-[65vh] overflow-y-auto p-0">
        {filteredStudents.map((s) => {
          const rec = records[s._id];
          const presentDays = attendanceMap[s._id];
          return (
            <button
              key={s._id}
              type="button"
              onClick={() => openStudent(s)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-right hover:bg-sand-50 transition"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-sand-900 truncate">
                  {s.name}
                </span>
                {statusBadge(rec)}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-sand-400">
                  حضور: {presentDays != null ? presentDays : "—"}
                </span>
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
                <div className="grid grid-cols-2 gap-3 mb-4">
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
                      className="input bg-sand-50"
                      readOnly
                      value={formatPagesOrJuz(draftCalc.expectedPages)}
                    />
                  </div>
                </div>

                {/* الحفظ الجديد */}
                <div className="bg-primary-50/50 rounded-xl p-3 mb-4">
                  <p className="text-sm font-bold text-primary-700 mb-2">
                    📖 الحفظ الجديد
                  </p>
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
                  <div className="input bg-white flex items-center justify-between">
                    <span>
                      المحفوظ فعليًا: {formatPagesOrJuz(draftCalc.memPages)}
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

            {/* المراجعة */}
            <div className="bg-sky-50/50 rounded-xl p-3 mb-4">
              <p className="text-sm font-bold text-sky-700 mb-2">🔁 المراجعة</p>
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
                    value={formatPagesOrJuz(draftCalc.expectedRevisionPages)}
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
              <div className="input bg-white flex items-center justify-between">
                <span>
                  راجع فعليًا: {formatPagesOrJuz(draftCalc.revPages)}
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
