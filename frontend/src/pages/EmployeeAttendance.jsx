import React, { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { usePeriod, MONTH_NAMES } from "../context/PeriodContext";

const MONTH_TOTAL_DAYS = 22; // شهر الموظفين 22 يوم عمل (بدل 20 للطلاب)

const EmployeeAttendance = () => {
  const { user } = useAuth();
  const { activeMonth, activeYear, isCustom } = usePeriod();

  const [branches, setBranches] = useState([]);
  const [filterBranch, setFilterBranch] = useState("");
  const [search, setSearch] = useState("");

  const [employees, setEmployees] = useState([]);
  const [month, setMonth] = useState(activeMonth);
  const [year, setYear] = useState(activeYear);
  const [monthTouched, setMonthTouched] = useState(false);
  const [summary, setSummary] = useState({}); // employeeId -> { presentDays, absentDays }
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

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
    const params = { role: "employee" };
    if (filterBranch) params.branch = filterBranch;
    api.get("/users", { params }).then((res) => setEmployees(res.data));
  }, [filterBranch]);

  useEffect(() => {
    const params = { month, year };
    if (filterBranch) params.branch = filterBranch;
    api.get("/employee-monthly-attendance", { params }).then((res) => {
      const map = {};
      res.data.forEach((r) => {
        if (r.employee) map[r.employee._id || r.employee] = { presentDays: r.presentDays, absentDays: r.absentDays };
      });
      setSummary(map);
    });
  }, [month, year, employees.length, filterBranch]);

  // تعديل الحضور أو الغياب بيحسب التاني تلقائي (المجموع = 22 يوم)
  const setSummaryField = (employeeId, field, value) => {
    let num = value === "" ? "" : Math.max(0, Math.min(MONTH_TOTAL_DAYS, Number(value)));
    setSummary((prev) => {
      const other = field === "presentDays" ? "absentDays" : "presentDays";
      const otherVal = num === "" ? "" : MONTH_TOTAL_DAYS - num;
      return { ...prev, [employeeId]: { ...prev[employeeId], [field]: num, [other]: otherVal } };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const payload = employees.map((emp) => {
        const rec = summary[emp._id] || {};
        const present = rec.presentDays === "" || rec.presentDays == null ? 0 : rec.presentDays;
        const absent = rec.absentDays === "" || rec.absentDays == null ? MONTH_TOTAL_DAYS - present : rec.absentDays;
        return {
          employee: emp._id,
          branch: emp.branch?._id || emp.branch,
          month,
          year,
          presentDays: present,
          absentDays: absent,
        };
      });
      await api.post("/employee-monthly-attendance/bulk", { records: payload });
      setMessage("تم حفظ حضور الموظفين بنجاح ✅");
    } catch (err) {
      setMessage(err.response?.data?.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const filteredEmployees = useMemo(
    () => employees.filter((e) => e.name.toLowerCase().includes(search.toLowerCase())),
    [employees, search]
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold text-sand-900">حضور وغياب الموظفين</h1>
      </div>

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        {user.role === "super_admin" && (
          <select className="input max-w-[200px]" value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}>
            <option value="">كل الفروع</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </select>
        )}

        <input className="input max-w-xs" placeholder="بحث بالاسم..." value={search} onChange={(e) => setSearch(e.target.value)} />

        <div className="flex gap-2 items-center">
          <select className="input" value={month} onChange={(e) => { setMonth(Number(e.target.value)); setMonthTouched(true); }}>
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
      </div>

      <p className="text-xs text-sand-400 mb-3">
        شهر الموظفين معتمد كـ 22 يوم عمل. سجّل أيام الحضور أو الغياب وهيتحسبلك التاني تلقائي (المجموع دايمًا 22).
      </p>

      {message && <div className="bg-primary-50 text-primary-700 text-sm rounded-xl px-3 py-2 mb-4">{message}</div>}

      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>اسم الموظف</th>
              <th>أيام الحضور</th>
              <th>أيام الغياب</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((emp) => {
              const rec = summary[emp._id] || {};
              return (
                <tr key={emp._id}>
                  <td className="font-semibold">{emp.name}</td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      max={MONTH_TOTAL_DAYS}
                      className="input w-24"
                      value={rec.presentDays ?? ""}
                      onChange={(e) => setSummaryField(emp._id, "presentDays", e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      max={MONTH_TOTAL_DAYS}
                      className="input w-24"
                      value={rec.absentDays ?? ""}
                      onChange={(e) => setSummaryField(emp._id, "absentDays", e.target.value)}
                    />
                  </td>
                </tr>
              );
            })}
            {filteredEmployees.length === 0 && (
              <tr><td colSpan={3} className="text-center text-sand-400 py-8">لا يوجد موظفون مطابقون</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredEmployees.length > 0 && (
        <button className="btn-primary mt-4" onClick={handleSave} disabled={saving}>
          {saving ? "جارِ الحفظ..." : "حفظ حضور الموظفين"}
        </button>
      )}
    </div>
  );
};

export default EmployeeAttendance;
