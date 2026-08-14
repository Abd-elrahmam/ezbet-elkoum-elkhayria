import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSettings, resolveMediaUrl } from "../context/SettingsContext";
import Footer from "../components/Footer";
import FloatingWhatsApp from "../components/FloatingWhatsApp";

const Login = () => {
  const { settings } = useSettings();
  const logoSrc = settings?.logoUrl ? resolveMediaUrl(settings.logoUrl) : "/logo.jpg";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "فشل تسجيل الدخول، تحقق من البيانات");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-sand-50 flex flex-col" dir="rtl">
      <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="text-sand-400 text-sm hover:text-sand-600 mb-4 inline-block">→ الرجوع للصفحة الرئيسية</Link>
        <div className="text-center mb-8">
          <img src={logoSrc} alt="الشعار" className="w-16 h-16 rounded-2xl object-cover mx-auto mb-3 border border-sand-200" />
          <h1 className="text-xl font-bold text-sand-900">{settings?.heroTitle || "جمعية العلوم الخيرية بعزبة الكوم"}</h1>
          <p className="text-sand-500 text-sm mt-1">{settings?.heroSubtitle || "نظام إدارة الحضانة والكتاب"}</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-xl px-3 py-2">{error}</div>
          )}
          <div>
            <label className="label">اسم المستخدم</label>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="label">كلمة المرور</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button className="btn-primary w-full justify-center" disabled={loading}>
            {loading ? "جارِ الدخول..." : "تسجيل الدخول"}
          </button>
        </form>
      </div>
      </div>
      <Footer whatsappNumber={settings?.whatsappNumber} />
      <FloatingWhatsApp whatsappNumber={settings?.whatsappNumber} />
    </div>
  );
};

export default Login;
