import React, { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

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
  const [department, setDepartment] = useState("nursery");
  const [date, setDate] = useState(todayStr());
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState({}); // studentId -> status
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.get("/students", { params: { department } }).then((res) => setStudents(res.data));
  }, [department]);

  useEffect(() => {
    api.get("/attendance", { params: { department, date } }).then((res) => {
      const map = {};
      res.data.forEach((r) => {
        if (r.student) map[r.student._id] = r.status;
      });
      setRecords(map);
    });
  }, [department, date, students.length]);

  const setStatus = (studentId, status) => {
    setRecords((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setMessage("");
    try {
      const payload = students.map((s) => ({
        student: s._id,
        branch: s.branch?._id || s.branch,
        department,
        date,
        status: records[s._id] || "present",
      }));
      await api.post("/attendance/bulk", { records: payload });
      setMessage("تم حفظ الحضور بنجاح ✅");
    } catch (err) {
      setMessage(err.response?.data?.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-sand-900">الحضور والغياب</h1>
        <div className="flex gap-2">
          <select className="input" value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="nursery">الحضانة</option>
            <option value="quran">الكتاب</option>
          </select>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      {message && <div className="bg-primary-50 text-primary-700 text-sm rounded-xl px-3 py-2 mb-4">{message}</div>}

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
            {students.map((s) => (
              <tr key={s._id}>
                <td className="font-semibold">{s.name}</td>
                <td>{s.teacher?.name || "—"}</td>
                <td>
                  <div className="flex gap-1 flex-wrap">
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setStatus(s._id, key)}
                        className={`badge cursor-pointer border ${
                          (records[s._id] || "present") === key
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
            {students.length === 0 && (
              <tr><td colSpan={3} className="text-center text-sand-400 py-8">لا يوجد طلاب في هذا القسم</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {students.length > 0 && (
        <button className="btn-primary mt-4" onClick={handleSaveAll} disabled={saving}>
          {saving ? "جارِ الحفظ..." : "حفظ الحضور"}
        </button>
      )}
    </div>
  );
};

export default Attendance;
