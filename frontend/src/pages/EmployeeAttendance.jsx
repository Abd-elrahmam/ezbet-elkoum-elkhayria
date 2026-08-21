import React, { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const todayStr = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => new Date().toISOString().slice(0, 7);

const STATUS_LABELS = { present: "حاضر", absent: "غائب", late: "متأخر", excused: "مُعتذر" };
const STATUS_COLORS = {
  present: "bg-primary-50 text-primary-700",
  absent: "bg-red-50 text-red-600",
  late: "bg-amber-50 text-amber-600",
  excused: "bg-sand-100 text-sand-700",
};

const EmployeeAttendance = () => {
  const { user } = useAuth();
  const canManage = user.role !== "employee";

  const [date, setDate] = useState(todayStr());
  const [employees, setEmployees] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState(currentMonth());

  useEffect(() => {
    if (canManage) {
      api.get("/users", { params: { role: "employee" } }).then((res) => setEmployees(res.data));
    }
  }, []);

  useEffect(() => {
    if (canManage) {
      api.get("/employee-attendance", { params: { date } }).then((res) => {
        const map = {};
        res.data.forEach((r) => { if (r.employee) map[r.employee._id] = r.status; });
        setStatuses(map);
      });
    }
  }, [date]);

  const loadRecords = () => {
    setLoading(true);
    const params = {};
    if (filterMonth) params.month = filterMonth;
    api.get("/employee-attendance", { params }).then((res) => setRecords(res.data)).finally(() => setLoading(false));
  };
  useEffect(loadRecords, [filterMonth]);

  const setStatus = (employeeId, status) => {
    setStatuses((prev) => ({ ...prev, [employeeId]: status }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setMessage("");
    try {
      const payload = employees.map((e) => ({
        employee: e._id,
        branch: e.branch?._id || e.branch,
        date,
        status: statuses[e._id] || "present",
      }));
      await api.post("/employee-attendance/bulk", { records: payload });
      setMessage("تم حفظ حضور الموظفين بنجاح ✅");
      loadRecords();
    } catch (err) {
      setMessage(err.response?.data?.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-sand-900 mb-6">حضور وغياب الموظفين (يومي)</h1>

      {canManage && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <input type="date" className="input max-w-[200px]" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {message && <div className="bg-primary-50 text-primary-700 text-sm rounded-xl px-3 py-2 mb-4">{message}</div>}

          <div className="card overflow-x-auto mb-6">
            <table className="data-table">
              <thead>
                <tr>
                  <th>اسم الموظف</th>
                  <th>الوظيفة</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e._id}>
                    <td className="font-semibold">{e.name}</td>
                    <td>{e.jobTitle || "—"}</td>
                    <td>
                      <div className="flex gap-1 flex-wrap">
                        {Object.entries(STATUS_LABELS).map(([key, label]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setStatus(e._id, key)}
                            className={`badge cursor-pointer border ${
                              (statuses[e._id] || "present") === key
                                ? STATUS_COLORS[key] + " border-transparent"
                                : "bg-white text-sand-400 border-sand-200"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr><td colSpan={3} className="text-center text-sand-400 py-8">لا يوجد موظفون</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {employees.length > 0 && (
            <button className="btn-primary mb-8" onClick={handleSaveAll} disabled={saving}>
              {saving ? "جارِ الحفظ..." : "حفظ حضور اليوم"}
            </button>
          )}
        </>
      )}

      <h2 className="font-bold text-sand-800 mb-3">{canManage ? "سجل الحضور" : "سجل حضوري"}</h2>
      <div className="flex gap-3 mb-4">
        <input type="month" className="input max-w-[180px]" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} />
      </div>
      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-sand-500 p-4">جارِ التحميل...</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {canManage && <th>الموظف</th>}
                <th>التاريخ</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r._id}>
                  {canManage && <td className="font-semibold">{r.employee?.name}</td>}
                  <td>{r.date?.slice(0, 10)}</td>
                  <td><span className={`badge ${STATUS_COLORS[r.status]}`}>{STATUS_LABELS[r.status]}</span></td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr><td colSpan={canManage ? 3 : 2} className="text-center text-sand-400 py-8">لا توجد سجلات</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default EmployeeAttendance;
