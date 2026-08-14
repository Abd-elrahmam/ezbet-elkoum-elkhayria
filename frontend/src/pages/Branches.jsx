import React, { useEffect, useState } from "react";
import api from "../api/axios";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";

const emptyForm = { name: "", address: "", phone: "", hasNursery: true, hasQuran: true, notes: "" };

const Branches = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState(null);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    api.get("/branches").then((res) => setBranches(res.data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (branch) => {
    setEditing(branch);
    setForm({
      name: branch.name,
      address: branch.address || "",
      phone: branch.phone || "",
      hasNursery: branch.hasNursery,
      hasQuran: branch.hasQuran,
      notes: branch.notes || "",
    });
    setError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (editing) {
        await api.put(`/branches/${editing._id}`, form);
      } else {
        await api.post("/branches", form);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "حدث خطأ");
    }
  };

  const handleDelete = async () => {
    await api.delete(`/branches/${deleteId}`);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-sand-900">إدارة الفروع</h1>
        <button className="btn-primary" onClick={openCreate}>
          + إضافة فرع
        </button>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-sand-500 p-4">جارِ التحميل...</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>اسم الفرع</th>
                <th>العنوان</th>
                <th>الهاتف</th>
                <th>الأقسام</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b._id}>
                  <td className="font-semibold">{b.name}</td>
                  <td>{b.address || "—"}</td>
                  <td>{b.phone || "—"}</td>
                  <td>
                    {b.hasNursery && <span className="badge bg-primary-50 text-primary-700 ml-1">حضانة</span>}
                    {b.hasQuran && <span className="badge bg-sand-100 text-sand-700">كتاب</span>}
                  </td>
                  <td>
                    <span className={`badge ${b.active ? "bg-primary-50 text-primary-700" : "bg-red-50 text-red-600"}`}>
                      {b.active ? "نشط" : "متوقف"}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn-ghost" onClick={() => openEdit(b)}>تعديل</button>
                      <button className="btn-ghost text-red-500" onClick={() => setDeleteId(b._id)}>حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
              {branches.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-sand-400 py-8">
                    لا توجد فروع بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "تعديل الفرع" : "إضافة فرع"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-3 py-2">{error}</div>}
          <div>
            <label className="label">اسم الفرع</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">العنوان</label>
            <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <label className="label">الهاتف</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-sand-700">
              <input type="checkbox" checked={form.hasNursery} onChange={(e) => setForm({ ...form, hasNursery: e.target.checked })} />
              يوجد قسم حضانة
            </label>
            <label className="flex items-center gap-2 text-sm text-sand-700">
              <input type="checkbox" checked={form.hasQuran} onChange={(e) => setForm({ ...form, hasQuran: e.target.checked })} />
              يوجد قسم كتاب
            </label>
          </div>
          <div>
            <label className="label">ملاحظات</label>
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button className="btn-primary w-full justify-center">{editing ? "حفظ التعديلات" : "إضافة الفرع"}</button>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} message="سيتم حذف الفرع نهائيًا. هل أنت متأكد؟" />
    </div>
  );
};

export default Branches;
