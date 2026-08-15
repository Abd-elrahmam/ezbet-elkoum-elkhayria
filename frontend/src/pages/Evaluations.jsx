import React, { useEffect, useState } from "react";
import api from "../api/axios";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useAuth } from "../context/AuthContext";

const PERIOD_LABELS = { daily: "يومي", weekly: "أسبوعي", monthly: "شهري" };

const emptyForm = {
  student: "",
  period: "daily",
  rating: "5",
  memorization: "",
  behavior: "",
  participation: "",
  notes: "",
  date: new Date().toISOString().slice(0, 10),
};

const Stars = ({ value }) => (
  <span className="text-amber-500">{"★".repeat(value)}{"☆".repeat(5 - value)}</span>
);

const Evaluations = () => {
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState(null);
  const [error, setError] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("");

  const load = () => {
    setLoading(true);
    const params = {};
    if (filterPeriod) params.period = filterPeriod;
    api.get("/evaluations", { params }).then((res) => setEvaluations(res.data)).finally(() => setLoading(false));
  };

  useEffect(load, [filterPeriod]);
  useEffect(() => {
    api.get("/students").then((res) => setStudents(res.data));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (ev) => {
    setEditing(ev);
    setForm({
      student: ev.student?._id || "",
      period: ev.period,
      rating: String(ev.rating),
      memorization: ev.memorization ? String(ev.memorization) : "",
      behavior: ev.behavior ? String(ev.behavior) : "",
      participation: ev.participation ? String(ev.participation) : "",
      notes: ev.notes || "",
      date: ev.date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    });
    setError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const student = students.find((s) => s._id === form.student);
      const payload = {
        ...form,
        rating: Number(form.rating),
        memorization: form.memorization ? Number(form.memorization) : null,
        behavior: form.behavior ? Number(form.behavior) : null,
        participation: form.participation ? Number(form.participation) : null,
        branch: student?.branch?._id || student?.branch,
        department: student?.department,
      };
      if (editing) {
        await api.put(`/evaluations/${editing._id}`, payload);
      } else {
        await api.post("/evaluations", payload);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "حدث خطأ");
    }
  };

  const handleDelete = async () => {
    await api.delete(`/evaluations/${deleteId}`);
    load();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-sand-900">تقييم الطلاب</h1>
        <button className="btn-primary" onClick={openCreate}>+ إضافة تقييم</button>
      </div>

      <div className="flex gap-3 mb-4">
        <select className="input max-w-[160px]" value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)}>
          <option value="">كل الفترات</option>
          <option value="daily">يومي</option>
          <option value="weekly">أسبوعي</option>
          <option value="monthly">شهري</option>
        </select>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-sand-500 p-4">جارِ التحميل...</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>الطالب</th>
                <th>الفترة</th>
                <th>التقييم العام</th>
                <th>التاريخ</th>
                <th>ملاحظات</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {evaluations.map((ev) => (
                <tr key={ev._id}>
                  <td className="font-semibold">{ev.student?.name}</td>
                  <td>
                    <span className="badge bg-sand-100 text-sand-700">{PERIOD_LABELS[ev.period]}</span>
                  </td>
                  <td><Stars value={ev.rating} /></td>
                  <td>{ev.date?.slice(0, 10)}</td>
                  <td className="text-sand-500">{ev.notes || "—"}</td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn-ghost" onClick={() => openEdit(ev)}>تعديل</button>
                      <button className="btn-ghost text-red-500" onClick={() => setDeleteId(ev._id)}>حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
              {evaluations.length === 0 && (
                <tr><td colSpan={6} className="text-center text-sand-400 py-8">لا توجد تقييمات مسجلة بعد</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "تعديل تقييم الطالب" : "إضافة تقييم للطالب"} wide>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-3 py-2">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">الطالب</label>
              <select className="input" required value={form.student} onChange={(e) => setForm({ ...form, student: e.target.value })}>
                <option value="">اختر الطالب</option>
                {students.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">الفترة</label>
              <select className="input" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}>
                <option value="daily">يومي</option>
                <option value="weekly">أسبوعي</option>
                <option value="monthly">شهري</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">التقييم العام (من 1 إلى 5)</label>
            <select className="input" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })}>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>{"★".repeat(n)} ({n})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">الحفظ</label>
              <select className="input" value={form.memorization} onChange={(e) => setForm({ ...form, memorization: e.target.value })}>
                <option value="">—</option>
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="label">السلوك</label>
              <select className="input" value={form.behavior} onChange={(e) => setForm({ ...form, behavior: e.target.value })}>
                <option value="">—</option>
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="label">المشاركة</label>
              <select className="input" value={form.participation} onChange={(e) => setForm({ ...form, participation: e.target.value })}>
                <option value="">—</option>
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">التاريخ</label>
            <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <label className="label">ملاحظات</label>
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button className="btn-primary w-full justify-center">{editing ? "حفظ التعديلات" : "حفظ التقييم"}</button>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} message="سيتم حذف التقييم. هل أنت متأكد؟" />
    </div>
  );
};

export default Evaluations;
