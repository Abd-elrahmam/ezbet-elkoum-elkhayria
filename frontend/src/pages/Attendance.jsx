import React, { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { usePeriod, MONTH_NAMES } from "../context/PeriodContext";
import { useDepartmentAccess } from "../hooks/useDepartmentAccess";

const MONTH_TOTAL_DAYS = 22;

const todayStr = () => new Date().toISOString().slice(0, 10);

const STATUS_LABELS = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
  excused: "مُعتذر",
};
const STATUS_COLORS = {
  present: "bg-primary-50 text-primary-700",
  absent: "bg-red-50 text-red-600",
  late: "bg-amber-50 text-amber-600",
  excused: "bg-sand-100 text-sand-700",
};

const Attendance = () => {
  const { user } = useAuth();
  const { activeMonth, activeYear, isCustom } = usePeriod();
  const deptAccess = useDepartmentAccess();

  const [tab, setTab] = useState("daily"); // daily | monthly
  const [department, setDepartment] = useState(deptAccess.department || "nursery");
  const [branches, setBranches] = useState([]);
  const [filterBranch, setFilterBranch] = useState("");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState("name");

  const [students, setStudents] = useState([]);

  // تبويب الحضور اليومي
  const [date, setDate] = useState(todayStr());
  const [records, setRecords] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // تبويب الملخص الشهري
  const [month, setMonth] = useState(activeMonth);
  const [year, setYear] = useState(activeYear);
  const [summary, setSummary] = useState({});
  const [savingSummary, setSavingSummary] = useState(false);
  const [summaryMessage, setSummaryMessage] = useState("");
  const [monthTouched, setMonthTouched] = useState(false);

  // 🔄 دالة مساعدة لإعادة جلب الملخص الشهري
  const fetchMonthlySummary = async () => {
    const params = { department, month, year };
    if (filterBranch) params.branch = filterBranch;
    const res = await api.get("/monthly-attendance", { params });
    const map = {};
    res.data.forEach((r) => {
      if (r.student) {
        const id = r.student._id || r.student;
        map[id] = { presentDays: r.presentDays, absentDays: r.absentDays };
      }
    });
    setSummary(map);
  };

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
    if (tab !== "daily") return;
    const params = { department, date };
    if (filterBranch) params.branch = filterBranch;
    api.get("/attendance", { params }).then((res) => {
      const map = {};
      res.data.forEach((r) => {
        if (r.student) map[r.student._id] = r.status;
      });
      setRecords(map);
    });
  }, [department, date, students.length, tab, filterBranch]);

  useEffect(() => {
    if (tab !== "monthly") return;
    fetchMonthlySummary();
  }, [department, month, year, students.length, tab, filterBranch]); // eslint-disable-line react-hooks/exhaustive-deps

  const setStatus = (studentId, status) => {
    setRecords((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setMessage("");
    try {
      const touched = students.filter((s) => records[s._id]);
      const untouched = students.filter((s) => !records[s._id]);

      if (touched.length === 0) {
        setMessage("⚠️ لسه ما سجّلتش حالة أي طالب. دوس على الحالة المناسبة لكل طالب الأول.");
        setSaving(false);
        return;
      }

      const payload = touched.map((s) => ({
        student: s._id,
        branch: s.branch?._id || s.branch,
        department,
        date,
        status: records[s._id],
      }));
      await api.post("/attendance/bulk", { records: payload });

      if (untouched.length > 0) {
        setMessage(
          `تم حفظ حضور ${touched.length} طالب ✅ — تنبيه: ${untouched.length} طالب لسه ما اتسجلش حضورهم: ${untouched
            .map((s) => s.name)
            .join("، ")}`
        );
      } else {
        setMessage("تم حفظ الحضور بنجاح ✅");
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const setSummaryField = (studentId, field, value) => {
    let num = value === "" ? "" : Math.max(0, Math.min(MONTH_TOTAL_DAYS, Number(value)));
    setSummary((prev) => {
      const other = field === "presentDays" ? "absentDays" : "presentDays";
      const otherVal = num === "" ? "" : MONTH_TOTAL_DAYS - num;
      return { ...prev, [studentId]: { ...prev[studentId], [field]: num, [other]: otherVal } };
    });
  };

  // ============================================================
  // حفظ الملخص الشهري:
  // - بيحفظ بس الطلاب اللي المستخدم لمسهم
  // - بعد الحفظ بيعمل fetch تاني عشان الصفحة تتحدّث فورًا
  // ============================================================
  const handleSaveSummary = async () => {
    setSavingSummary(true);
    setSummaryMessage("");
    try {
      const touched = students.filter((s) => {
        const rec = summary[s._id];
        return rec && rec.presentDays !== "" && rec.presentDays != null;
      });

      const untouched = students.filter((s) => {
        const rec = summary[s._id];
        return !rec || rec.presentDays === "" || rec.presentDays == null;
      });

      if (touched.length === 0) {
        setSummaryMessage("⚠️ لسه ما سجّلتش حضور أي طالب. عدّل أيام الحضور/الغياب الأول.");
        setSavingSummary(false);
        return;
      }

      const payload = touched.map((s) => {
        const rec = summary[s._id];
        const present = Number(rec.presentDays) || 0;
        const absent =
          rec.absentDays === "" || rec.absentDays == null
            ? MONTH_TOTAL_DAYS - present
            : Number(rec.absentDays);
        return {
          student: s._id,
          branch: s.branch?._id || s.branch,
          department,
          month,
          year,
          presentDays: present,
          absentDays: absent,
        };
      });

      await api.post("/monthly-attendance/bulk", { records: payload });

      // 🔄 إعادة جلب البيانات بعد الحفظ
      await fetchMonthlySummary();

      if (untouched.length > 0) {
        setSummaryMessage(
          `تم حفظ ${touched.length} طالب ✅ — تنبيه: ${untouched.length} طالب لسه ما اتسجلش حضورهم: ${untouched
            .map((s) => s.name)
            .join("، ")}`
        );
      } else {
        setSummaryMessage("تم حفظ ملخص الحضور الشهري بنجاح ✅");
      }
    } catch (err) {
      setSummaryMessage(err.response?.data?.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setSavingSummary(false);
    }
  };

  const filteredStudents = useMemo(
    () => students.filter((s) => s.name.toLowerCase().includes(search.toLowerCase())),
    [students, search]
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold text-sand-900">الحضور والغياب</h1>
        <div className="flex gap-2 bg-sand-100 rounded-xl p-1">
          <button
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${tab === "daily" ? "bg-white shadow-sm text-primary-700" : "text-sand-500"}`}
            onClick={() => setTab("daily")}
          >
            كشف يومي
          </button>
          <button
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${tab === "monthly" ? "bg-white shadow-sm text-primary-700" : "text-sand-500"}`}
            onClick={() => setTab("monthly")}
          >
            ملخص شهري
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        {deptAccess.locked ? (
          <span className="badge bg-primary-50 text-primary-700">
            {department === "quran" ? "📖 الكتاب" : "🧸 الحضانة"}
          </span>
        ) : (
          <select className="input max-w-[160px]" value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="quran">الكتاب</option>
            <option value="nursery">الحضانة</option>
          </select>
        )}

        {user.role === "super_admin" && (
          <select className="input max-w-[200px]" value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}>
            <option value="">كل الفروع</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </select>
        )}

        <input className="input max-w-xs" placeholder="بحث بالاسم..." value={search} onChange={(e) => setSearch(e.target.value)} />

        <select className="input max-w-[190px]" value={sortMode} onChange={(e) => setSortMode(e.target.value)}>
          <option value="name">ترتيب أبجدي</option>
          <option value="added">ترتيب الإضافة</option>
        </select>

        {tab === "daily" ? (
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        ) : (
          <div className="flex gap-2 items-center">
            <select
              className="input"
              value={month}
              onChange={(e) => { setMonth(Number(e.target.value)); setMonthTouched(true); }}
            >
              {MONTH_NAMES.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
            <input
              type="number"
              className="input w-24"
              value={year}
              onChange={(e) => { setYear(Number(e.target.value)); setMonthTouched(true); }}
            />
            {isCustom && !monthTouched && (
              <span className="text-xs text-primary-700 bg-primary-50 rounded-full px-2 py-1">مأخوذ من الشهر المحدد أعلى الصفحة</span>
            )}
          </div>
        )}
      </div>

      {tab === "daily" && (
        <>
          {message && (
            <div
              className={`text-sm rounded-xl px-3 py-2 mb-4 ${
                message.startsWith("⚠️") || message.includes("تنبيه")
                  ? "bg-amber-50 text-amber-700"
                  : "bg-primary-50 text-primary-700"
              }`}
            >
              {message}
            </div>
          )}
          <div className="card overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>اسم الطالب</th>
                  <th>المدرس</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => (
                  <tr key={s._id} className={!records[s._id] ? "bg-amber-50/40" : ""}>
                    <td className="font-semibold">{s.name}</td>
                    <td>{s.teacher?.name || "—"}</td>
                    <td>
                      <div className="flex gap-1 flex-wrap items-center">
                        {Object.entries(STATUS_LABELS).map(([key, label]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setStatus(s._id, key)}
                            className={`badge cursor-pointer border ${
                              records[s._id] === key
                                ? STATUS_COLORS[key] + " border-transparent"
                                : "bg-white text-sand-400 border-sand-200"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                        {!records[s._id] && (
                          <span className="text-xs text-amber-600 font-semibold">⚠️ لم يُسجَّل بعد</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && (
                  <tr><td colSpan={3} className="text-center text-sand-400 py-8">لا يوجد طلاب مطابقين</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredStudents.length > 0 && (
            <button className="btn-primary mt-4" onClick={handleSaveAll} disabled={saving}>
              {saving ? "جارِ الحفظ..." : "حفظ الحضور"}
            </button>
          )}
        </>
      )}

      {tab === "monthly" && (
        <>
          <p className="text-xs text-sand-400 mb-3">
            الشهر معتمد كـ 22 يوم عمل. .
          </p>
          {summaryMessage && (
            <div
              className={`text-sm rounded-xl px-3 py-2 mb-4 ${
                summaryMessage.startsWith("⚠️") || summaryMessage.includes("تنبيه")
                  ? "bg-amber-50 text-amber-700"
                  : "bg-primary-50 text-primary-700"
              }`}
            >
              {summaryMessage}
            </div>
          )}
          <div className="card overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>اسم الطالب</th>
                  <th>أيام الحضور</th>
                  <th>أيام الغياب</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => {
                  const rec = summary[s._id] || {};
                  const notTouched = rec.presentDays === "" || rec.presentDays == null;
                  return (
                    <tr key={s._id} className={notTouched ? "bg-amber-50/40" : ""}>
                      <td className="font-semibold">
                        {s.name}
                        {notTouched && (
                          <span className="text-xs text-amber-600 font-semibold mr-2">⚠️ لم يُسجَّل</span>
                        )}
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          max={MONTH_TOTAL_DAYS}
                          className="input w-24"
                          value={rec.presentDays ?? ""}
                          onChange={(e) => setSummaryField(s._id, "presentDays", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          max={MONTH_TOTAL_DAYS}
                          className="input w-24"
                          value={rec.absentDays ?? ""}
                          onChange={(e) => setSummaryField(s._id, "absentDays", e.target.value)}
                        />
                      </td>
                    </tr>
                  );
                })}
                {filteredStudents.length === 0 && (
                  <tr><td colSpan={3} className="text-center text-sand-400 py-8">لا يوجد طلاب مطابقين</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredStudents.length > 0 && (
            <button className="btn-primary mt-4" onClick={handleSaveSummary} disabled={savingSummary}>
              {savingSummary ? "جارِ الحفظ..." : "حفظ الملخص الشهري"}
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default Attendance;