import React, { useEffect, useState } from "react";
import api from "../api/axios";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useAuth } from "../context/AuthContext";

const currentMonth = () => new Date().toISOString().slice(0, 7);

const emptyForm = {
  student: "",
  month: currentMonth(),
  presentDays: "",
  absentDays: "",
  lateDays: "0",
  excusedDays: "0",
  notes: "",
};

// صفحة الحضور والغياب الشهري - خاصة بالطلاب فقط
// (الموظفين لهم صفحة منفصلة "حضور الموظفين" يومية)
const Attendance = () => {
  const { user } = useAuth();
  const canManage = user.role !== "employee"; // الأدمن ومدير الفرع بس يقدروا يعدلوا/يحذفوا
  const [records, setRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState(null);
  const [error, setError] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  const load = () => {
    setLoading(true);
    const params = {};
    if (filterMonth) params.month = filterMonth;
    api.get("/monthly-attendance", { params }).then((res) => setRecords(res.data.filter((r) => r.student))).finally(() => setLoading(false));
  };

  useEffect(load, [filterMonth]);
  useEffect(() => {
    // الموظف هيشوف طلابه هو بس تلقائيًا (الباك اند بيقيدها)
    api.get("/students").then((res) => setStudents(res.data));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    setForm({
      student: r.student?._id || "",
      month: r.month,
      presentDays: r.presentDays,
      absentDays: r.absentDays,
      lateDays: r.lateDays || 0,
      excusedDays: r.excusedDays || 0,
      notes: r.notes || "",
    });
    setError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const studentObj = students.find((s) => s._id === form.student);

      const payload = {
        student: form.student,
        branch: studentObj?.branch?._id || studentObj?.branch,
        department: studentObj?.department,
        month: form.month,
        presentDays: Number(form.presentDays),
        absentDays: Number(form.absentDays),
        lateDays: Number(form.lateDays) || 0,
        excusedDays: Number(form.excusedDays) || 0,
        notes: form.notes,
      };

      if (editing) {
        await api.put(`/monthly-attendance/${editing._id}`, payload);
      } else {
        await api.post("/monthly-attendance", payload);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "حدث خطأ");
    }
  };

  const handleDelete = async () => {
    await api.delete(`/monthly-attendance/${deleteId}`);
    load();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-sand-900">الحضور والغياب الشهري (الطلاب)</h1>
        <button className="btn-primary" onClick={openCreate}>+ إضافة سجل حضور</button>
      </div>

      {!canManage && (
        <div className="bg-primary-50 text-primary-700 text-sm rounded-xl px-3 py-2 mb-4">
          تقدر تضيف سجلات حضور جديدة لطلابك، لكن التعديل والحذف متاحين لمدير الفرع أو الأدمن فقط.
        </div>
      )}

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
                <th>اسم الطالب</th>
                <th>الشهر</th>
                <th>أيام الحضور</th>
                <th>أيام الغياب</th>
                <th>تأخير</th>
                <th>عذر</th>
                {canManage && <th></th>}
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r._id}>
                  <td className="font-semibold">{r.student?.name}</td>
                  <td>{r.month}</td>
                  <td className="text-primary-700 font-bold">{r.presentDays}</td>
                  <td className="text-red-600 font-bold">{r.absentDays}</td>
                  <td>{r.lateDays || 0}</td>
                  <td>{r.excusedDays || 0}</td>
                  {canManage && (
                    <td>
                      <div className="flex gap-2">
                        <button className="btn-ghost" onClick={() => openEdit(r)}>تعديل</button>
                        <button className="btn-ghost text-red-500" onClick={() => setDeleteId(r._id)}>حذف</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {records.length === 0 && (
                <tr><td colSpan={7} className="text-center text-sand-400 py-8">لا توجد سجلات حضور بعد</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "تعديل سجل الحضور" : "إضافة سجل حضور شهري"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-3 py-2">{error}</div>}

          <div>
            <label className="label">الطالب</label>
            <select className="input" required disabled={!!editing} value={form.student} onChange={(e) => setForm({ ...form, student: e.target.value })}>
              <option value="">اختر الطالب</option>
              {students.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">الشهر</label>
            <input className="input" type="month" required disabled={!!editing} value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">عدد أيام الحضور</label>
              <input className="input" type="number" min={0} required value={form.presentDays} onChange={(e) => setForm({ ...form, presentDays: e.target.value })} />
            </div>
            <div>
              <label className="label">عدد أيام الغياب</label>
              <input className="input" type="number" min={0} required value={form.absentDays} onChange={(e) => setForm({ ...form, absentDays: e.target.value })} />
            </div>
            <div>
              <label className="label">أيام التأخير (اختياري)</label>
              <input className="input" type="number" min={0} value={form.lateDays} onChange={(e) => setForm({ ...form, lateDays: e.target.value })} />
            </div>
            <div>
              <label className="label">أيام بعذر (اختياري)</label>
              <input className="input" type="number" min={0} value={form.excusedDays} onChange={(e) => setForm({ ...form, excusedDays: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="label">ملاحظات</label>
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <button className="btn-primary w-full justify-center">{editing ? "حفظ التعديلات" : "حفظ السجل"}</button>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} message="سيتم حذف سجل الحضور. هل أنت متأكد؟" />
    </div>
  );
};

export default Attendance;
