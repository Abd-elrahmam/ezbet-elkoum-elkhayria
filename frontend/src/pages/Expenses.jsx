import React, { useEffect, useState } from "react";
import api from "../api/axios";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";

const emptyForm = {
  category: "",
  amount: "",
  department: "general",
  date: new Date().toISOString().slice(0, 10),
  description: "",
};

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState(null);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    api.get("/expenses").then((res) => setExpenses(res.data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/expenses", form);
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "حدث خطأ");
    }
  };

  const handleDelete = async () => {
    await api.delete(`/expenses/${deleteId}`);
    load();
  };

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-sand-900">المصروفات</h1>
        <button className="btn-primary" onClick={openCreate}>+ تسجيل مصروف</button>
      </div>

      <p className="text-sand-500 text-sm mb-4">الإجمالي: <strong className="text-red-600">{total.toLocaleString("ar-EG")} جنيه</strong></p>

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-sand-500 p-4">جارِ التحميل...</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>البند</th>
                <th>القسم</th>
                <th>المبلغ</th>
                <th>التاريخ</th>
                <th>الوصف</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e._id}>
                  <td className="font-semibold">{e.category}</td>
                  <td>{e.department === "nursery" ? "حضانة" : e.department === "quran" ? "كتاب" : "عام"}</td>
                  <td>{e.amount.toLocaleString("ar-EG")} جنيه</td>
                  <td>{e.date?.slice(0, 10)}</td>
                  <td className="text-sand-500">{e.description || "—"}</td>
                  <td>
                    <button className="btn-ghost text-red-500" onClick={() => setDeleteId(e._id)}>حذف</button>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr><td colSpan={6} className="text-center text-sand-400 py-8">لا توجد مصروفات مسجلة</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="تسجيل مصروف جديد">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-3 py-2">{error}</div>}
          <div>
            <label className="label">بند المصروف</label>
            <input className="input" required placeholder="مثال: إيجار، صيانة، أدوات" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">المبلغ</label>
              <input className="input" type="number" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <label className="label">القسم</label>
              <select className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                <option value="general">عام</option>
                <option value="quran">كتاب</option>
                <option value="nursery">حضانة</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">التاريخ</label>
            <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <label className="label">الوصف</label>
            <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <button className="btn-primary w-full justify-center">تسجيل المصروف</button>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} message="سيتم حذف المصروف نهائيًا. هل أنت متأكد؟" />
    </div>
  );
};

export default Expenses;
