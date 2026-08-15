import React, { useEffect, useState } from "react";
import api from "../api/axios";
import Modal from "../components/Modal";
import { useAuth } from "../context/AuthContext";

const STATUS_LABELS = { pending: "قيد المراجعة", approved: "مقبولة", rejected: "مرفوضة" };
const STATUS_COLORS = {
  pending: "bg-amber-50 text-amber-600",
  approved: "bg-primary-50 text-primary-700",
  rejected: "bg-red-50 text-red-600",
};

const emptyForm = { startDate: "", endDate: "", reason: "", status: "pending" };

const LeaveRequests = () => {
  const { user } = useAuth();
  const canReview = user.role === "super_admin" || user.role === "branch_manager";
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const load = () => {
    setLoading(true);
    const params = {};
    if (filterStatus) params.status = filterStatus;
    api.get("/leaves", { params }).then((res) => setRequests(res.data)).finally(() => setLoading(false));
  };

  useEffect(load, [filterStatus]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    setForm({
      startDate: r.startDate?.slice(0, 10) || "",
      endDate: r.endDate?.slice(0, 10) || "",
      reason: r.reason || "",
      status: r.status,
    });
    setError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (editing) {
        await api.put(`/leaves/${editing._id}`, form);
      } else {
        await api.post("/leaves", form);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "حدث خطأ");
    }
  };

  const review = async (id, status) => {
    const reviewNote = status === "rejected" ? window.prompt("سبب الرفض (اختياري):") || "" : "";
    await api.put(`/leaves/${id}/review`, { status, reviewNote });
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("هل تريد حذف هذا الطلب؟")) return;
    await api.delete(`/leaves/${id}`);
    load();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-sand-900">طلبات الإجازة</h1>
        <button className="btn-primary" onClick={openCreate}>+ تقديم طلب إجازة</button>
      </div>

      <div className="flex gap-3 mb-4">
        <select className="input max-w-[160px]" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">كل الحالات</option>
          <option value="pending">قيد المراجعة</option>
          <option value="approved">مقبولة</option>
          <option value="rejected">مرفوضة</option>
        </select>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-sand-500 p-4">جارِ التحميل...</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {canReview && <th>الموظف</th>}
                <th>من</th>
                <th>إلى</th>
                <th>السبب</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r._id}>
                  {canReview && <td className="font-semibold">{r.employee?.name}</td>}
                  <td>{r.startDate?.slice(0, 10)}</td>
                  <td>{r.endDate?.slice(0, 10)}</td>
                  <td className="text-sand-500">{r.reason}</td>
                  <td>
                    <span className={`badge ${STATUS_COLORS[r.status]}`}>{STATUS_LABELS[r.status]}</span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      {canReview && r.status === "pending" && (
                        <>
                          <button className="btn-ghost text-primary-700" onClick={() => review(r._id, "approved")}>قبول</button>
                          <button className="btn-ghost text-red-500" onClick={() => review(r._id, "rejected")}>رفض</button>
                        </>
                      )}
                      {(canReview || r.status === "pending") && (
                        <button className="btn-ghost" onClick={() => openEdit(r)}>تعديل</button>
                      )}
                      {(r.status === "pending" || canReview) && (
                        <button className="btn-ghost text-red-500" onClick={() => handleDelete(r._id)}>حذف</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr><td colSpan={canReview ? 6 : 5} className="text-center text-sand-400 py-8">لا توجد طلبات إجازة</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "تعديل طلب الإجازة" : "تقديم طلب إجازة"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-3 py-2">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">من تاريخ</label>
              <input className="input" type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <label className="label">إلى تاريخ</label>
              <input className="input" type="date" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">سبب الإجازة</label>
            <textarea className="input" rows={3} required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>
          {editing && canReview && (
            <div>
              <label className="label">الحالة</label>
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="pending">قيد المراجعة</option>
                <option value="approved">مقبولة</option>
                <option value="rejected">مرفوضة</option>
              </select>
            </div>
          )}
          <button className="btn-primary w-full justify-center">{editing ? "حفظ التعديلات" : "تقديم الطلب"}</button>
        </form>
      </Modal>
    </div>
  );
};

export default LeaveRequests;
