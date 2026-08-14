import React, { useEffect, useState } from "react";
import api from "../api/axios";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";

const currentMonth = () => new Date().toISOString().slice(0, 7);

const emptyForm = {
  student: "",
  amount: "",
  month: currentMonth(),
  date: new Date().toISOString().slice(0, 10),
  method: "cash",
  notes: "",
};

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState(null);
  const [error, setError] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  const load = () => {
    setLoading(true);
    const params = {};
    if (filterMonth) params.month = filterMonth;
    api.get("/payments", { params }).then((res) => setPayments(res.data)).finally(() => setLoading(false));
  };

  useEffect(load, [filterMonth]);
  useEffect(() => {
    api.get("/students").then((res) => setStudents(res.data));
  }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const student = students.find((s) => s._id === form.student);
      await api.post("/payments", { ...form, branch: student?.branch?._id || student?.branch, department: student?.department });
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "حدث خطأ");
    }
  };

  const handleDelete = async () => {
    await api.delete(`/payments/${deleteId}`);
    load();
  };

  const total = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-sand-900">المدفوعات (رسوم الطلاب)</h1>
        <button className="btn-primary" onClick={openCreate}>+ تسجيل دفعة</button>
      </div>

      <div className="flex gap-3 mb-4 items-center">
        <input type="month" className="input max-w-[180px]" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} />
        <span className="text-sand-500 text-sm">الإجمالي: <strong className="text-primary-700">{total.toLocaleString("ar-EG")} جنيه</strong></span>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-sand-500 p-4">جارِ التحميل...</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>الطالب</th>
                <th>الشهر</th>
                <th>المبلغ</th>
                <th>طريقة الدفع</th>
                <th>التاريخ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p._id}>
                  <td className="font-semibold">{p.student?.name}</td>
                  <td>{p.month}</td>
                  <td>{p.amount.toLocaleString("ar-EG")} جنيه</td>
                  <td>{p.method === "cash" ? "نقدًا" : p.method === "transfer" ? "تحويل" : "أخرى"}</td>
                  <td>{p.date?.slice(0, 10)}</td>
                  <td>
                    <button className="btn-ghost text-red-500" onClick={() => setDeleteId(p._id)}>حذف</button>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={6} className="text-center text-sand-400 py-8">لا توجد مدفوعات مسجلة</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="تسجيل دفعة جديدة">
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
              <label className="label">المبلغ</label>
              <input className="input" type="number" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <label className="label">الشهر</label>
              <input className="input" type="month" required value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">التاريخ</label>
              <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="label">طريقة الدفع</label>
              <select className="input" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                <option value="cash">نقدًا</option>
                <option value="transfer">تحويل</option>
                <option value="other">أخرى</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">ملاحظات</label>
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button className="btn-primary w-full justify-center">تسجيل الدفعة</button>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} message="سيتم حذف الدفعة نهائيًا. هل أنت متأكد؟" />
    </div>
  );
};

export default Payments;
