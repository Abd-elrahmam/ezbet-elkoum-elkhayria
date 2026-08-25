import React, { useEffect, useState } from "react";
import api from "../api/axios";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useAuth } from "../context/AuthContext";

const emptyForm = {
  student: "",
  department: "nursery",
  type: "weekly",
  title: "",
  score: "",
  maxScore: "100",
  date: new Date().toISOString().slice(0, 10),
  notes: "",
};

const Tests = () => {
  const { user } = useAuth();
  const [tests, setTests] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState(null);
  const [error, setError] = useState("");
  const [filterType, setFilterType] = useState("");

  const canEdit = user.role !== "employee" || true; // المدرسون كمان يسجلوا نتائج طلابهم

  const load = () => {
    setLoading(true);
    const params = {};
    if (filterType) params.type = filterType;
    api.get("/tests", { params }).then((res) => setTests(res.data)).finally(() => setLoading(false));
  };

  useEffect(load, [filterType]);
  useEffect(() => {
    api.get("/students").then((res) => setStudents(res.data));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (t) => {
    setEditing(t);
    setForm({
      student: t.student?._id,
      department: t.department,
      type: t.type,
      title: t.title,
      score: t.score,
      maxScore: t.maxScore,
      date: t.date?.slice(0, 10),
      notes: t.notes || "",
    });
    setError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const student = students.find((s) => s._id === form.student);
      const payload = { ...form, branch: student?.branch?._id || student?.branch };
      if (editing) {
        await api.put(`/tests/${editing._id}`, payload);
      } else {
        await api.post("/tests", payload);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "حدث خطأ");
    }
  };

  const handleDelete = async () => {
    await api.delete(`/tests/${deleteId}`);
    load();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-sand-900">الاختبارات الأسبوعية والشهرية</h1>
        <button className="btn-primary" onClick={openCreate}>+ تسجيل نتيجة اختبار</button>
      </div>

      <div className="flex gap-3 mb-4">
        <select className="input max-w-[160px]" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">كل الأنواع</option>
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
                <th>العنوان</th>
                <th>النوع</th>
                <th>الدرجة</th>
                <th>التاريخ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t._id}>
                  <td className="font-semibold">{t.student?.name}</td>
                  <td>{t.title}</td>
                  <td>
                    <span className="badge bg-sand-100 text-sand-700">{t.type === "weekly" ? "أسبوعي" : "شهري"}</span>
                  </td>
                  <td>{t.score} / {t.maxScore}</td>
                  <td>{t.date?.slice(0, 10)}</td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn-ghost" onClick={() => openEdit(t)}>تعديل</button>
                      <button className="btn-ghost text-red-500" onClick={() => setDeleteId(t._id)}>حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
              {tests.length === 0 && (
                <tr><td colSpan={6} className="text-center text-sand-400 py-8">لا توجد نتائج اختبارات بعد</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "تعديل نتيجة" : "تسجيل نتيجة اختبار"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-3 py-2">{error}</div>}
          <div>
            <label className="label">الطالب</label>
            <select className="input" required value={form.student} onChange={(e) => setForm({ ...form, student: e.target.value })}>
              <option value="">اختر الطالب</option>
              {students.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">القسم</label>
              <select className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                <option value="quran">الكتاب</option>
                <option value="nursery">الحضانة</option>
              </select>
            </div>
            <div>
              <label className="label">النوع</label>
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="weekly">أسبوعي</option>
                <option value="monthly">شهري</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">عنوان الاختبار</label>
            <input className="input" required placeholder="مثال: اختبار سورة البقرة" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">الدرجة</label>
              <input className="input" type="number" required value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} />
            </div>
            <div>
              <label className="label">الدرجة الكلية</label>
              <input className="input" type="number" required value={form.maxScore} onChange={(e) => setForm({ ...form, maxScore: e.target.value })} />
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
          <button className="btn-primary w-full justify-center">{editing ? "حفظ التعديلات" : "تسجيل"}</button>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} message="سيتم حذف نتيجة الاختبار. هل أنت متأكد؟" />
    </div>
  );
};

export default Tests;
