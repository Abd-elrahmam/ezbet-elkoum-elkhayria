import React, { useEffect, useState } from "react";
import api from "../api/axios";
import { useSettings, resolveMediaUrl } from "../context/SettingsContext";

const SiteSettings = () => {
  const { settings, reload } = useSettings();
  const [form, setForm] = useState({
    heroTitle: "",
    heroSubtitle: "",
    aboutText: "",
    whatsappNumber: "",
  });
  const [logoFile, setLogoFile] = useState(null);
  const [heroFile, setHeroFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (settings) {
      setForm({
        heroTitle: settings.heroTitle || "",
        heroSubtitle: settings.heroSubtitle || "",
        aboutText: settings.aboutText || "",
        whatsappNumber: settings.whatsappNumber || "",
      });
    }
  }, [settings]);

  const handleSaveText = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await api.put("/settings", form);
      reload();
      setMessage("تم حفظ الإعدادات بنجاح ✅");
    } catch (err) {
      setError(err.response?.data?.message || "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (endpoint, field, file) => {
    if (!file) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const fd = new FormData();
      fd.append(field, file);
      await api.put(endpoint, fd, { headers: { "Content-Type": "multipart/form-data" } });
      reload();
      setMessage("تم رفع الصورة بنجاح ✅");
    } catch (err) {
      setError(err.response?.data?.message || "فشل رفع الصورة");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-sand-900 mb-6">إعدادات الموقع</h1>

      {message && <div className="bg-primary-50 text-primary-700 text-sm rounded-xl px-3 py-2 mb-4">{message}</div>}
      {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-3 py-2 mb-4">{error}</div>}

      <div className="grid md:grid-cols-2 gap-6">
        {/* الشعار */}
        <div className="card">
          <h2 className="font-bold text-sand-800 mb-3">شعار الجمعية</h2>
          <img
            src={settings?.logoUrl ? resolveMediaUrl(settings.logoUrl) : "/logo.jpg"}
            alt="الشعار الحالي"
            className="w-28 h-28 rounded-2xl object-cover border border-sand-200 mb-4"
          />
          <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files[0])} className="input mb-3" />
          <button className="btn-primary" disabled={!logoFile || saving} onClick={() => uploadImage("/settings/logo", "logo", logoFile)}>
            رفع الشعار الجديد
          </button>
        </div>

        {/* صورة الهيرو */}
        <div className="card">
          <h2 className="font-bold text-sand-800 mb-3">صورة الصفحة الرئيسية</h2>
          <img
            src={settings?.heroImageUrl ? resolveMediaUrl(settings.heroImageUrl) : "/logo.jpg"}
            alt="الصورة الحالية"
            className="w-full h-28 rounded-2xl object-cover border border-sand-200 mb-4"
          />
          <input type="file" accept="image/*" onChange={(e) => setHeroFile(e.target.files[0])} className="input mb-3" />
          <button className="btn-primary" disabled={!heroFile || saving} onClick={() => uploadImage("/settings/hero-image", "heroImage", heroFile)}>
            رفع الصورة الجديدة
          </button>
        </div>
      </div>

      <form onSubmit={handleSaveText} className="card mt-6 space-y-4">
        <h2 className="font-bold text-sand-800">النصوص ورقم التواصل</h2>
        <div>
          <label className="label">اسم الجمعية (يظهر في الهيدر والصفحة الرئيسية)</label>
          <input className="input" value={form.heroTitle} onChange={(e) => setForm({ ...form, heroTitle: e.target.value })} />
        </div>
        <div>
          <label className="label">الوصف المختصر</label>
          <input className="input" value={form.heroSubtitle} onChange={(e) => setForm({ ...form, heroSubtitle: e.target.value })} />
        </div>
        <div>
          <label className="label">نبذة عن الجمعية (الصفحة الرئيسية)</label>
          <textarea className="input" rows={3} value={form.aboutText} onChange={(e) => setForm({ ...form, aboutText: e.target.value })} />
        </div>
        <div>
          <label className="label">رقم واتساب تواصل الجمعية (بصيغة دولية بدون +، مثال: 201021330018)</label>
          <input className="input" value={form.whatsappNumber} onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })} />
          <p className="text-xs text-sand-400 mt-1">هو الرقم اللي يظهر لزوار الصفحة الرئيسية وزر التواصل العائم. أما توقيع المطور في تذييل الصفحات فرقمه ثابت ومش قابل للتعديل.</p>
        </div>
        <button className="btn-primary" disabled={saving}>{saving ? "جارِ الحفظ..." : "حفظ الإعدادات"}</button>
      </form>
    </div>
  );
};

export default SiteSettings;
