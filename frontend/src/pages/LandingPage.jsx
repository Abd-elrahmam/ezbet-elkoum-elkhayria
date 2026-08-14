import React from "react";
import { Link } from "react-router-dom";
import { useSettings, resolveMediaUrl } from "../context/SettingsContext";
import Footer from "../components/Footer";
import FloatingWhatsApp from "../components/FloatingWhatsApp";

const todayArabic = () =>
  new Date().toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

const FEATURES = [
  { icon: "🕌", title: "قسم تحفيظ القرآن (الكتاب)", desc: "برنامج تحفيظ متكامل بمتابعة يومية وأسبوعية وشهرية لكل طالب." },
  { icon: "🧸", title: "قسم الحضانة", desc: "رعاية وتعليم مبكر للأطفال في بيئة آمنة ومناسبة." },
  { icon: "👨‍🏫", title: "متابعة دقيقة", desc: "توزيع الطلاب على المدرسين مع تقييمات دورية لمتابعة التقدم." },
  { icon: "🏢", title: "فروع متعددة", desc: "شبكة فروع تخدم أبناء المنطقة بنفس معايير الجودة." },
];

const LandingPage = () => {
  const { settings, loading } = useSettings();
  const logoSrc = settings?.logoUrl ? resolveMediaUrl(settings.logoUrl) : "/logo.jpg";
  const heroSrc = settings?.heroImageUrl ? resolveMediaUrl(settings.heroImageUrl) : "/logo.jpg";

  return (
    <div className="min-h-screen bg-sand-50 flex flex-col" dir="rtl">
      {/* الهيدر */}
      <header className="bg-white/80 backdrop-blur border-b border-sand-100 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoSrc} alt="الشعار" className="w-11 h-11 rounded-full object-cover border border-sand-200" />
            <div>
              <div className="font-bold text-sand-900 leading-tight text-sm sm:text-base">
                {settings?.heroTitle || "جمعية العلوم الخيرية بعزبة الكوم"}
              </div>
              <div className="text-xs text-sand-500">{settings?.heroSubtitle || "نظام إدارة الحضانة والكتاب"}</div>
            </div>
          </div>
          <Link to="/login" className="btn-primary">
            تسجيل الدخول
          </Link>
        </div>
      </header>

      {/* التاريخ */}
      <div className="bg-primary-600 text-white text-center text-xs sm:text-sm py-1.5">{todayArabic()}</div>

      {/* الهيرو */}
      <section className="max-w-6xl mx-auto px-4 py-14 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <span className="badge bg-primary-50 text-primary-700 mb-4">المشهرة برقم 1841 لسنة 2012</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-sand-900 leading-tight mb-4">
            {settings?.heroTitle || "جمعية العلوم الخيرية بعزبة الكوم"}
          </h1>
          <p className="text-sand-600 text-lg leading-relaxed mb-6">
            {settings?.aboutText ||
              "جمعية خيرية تُعنى بتحفيظ القرآن الكريم ورعاية الأطفال، تضم فروعًا متعددة تخدم أبناء المنطقة."}
          </p>
          <div className="flex gap-3">
            <Link to="/login" className="btn-primary">
              دخول النظام
            </Link>
            <a href={`https://wa.me/${settings?.whatsappNumber || "201021330018"}`} target="_blank" rel="noreferrer" className="btn-secondary">
              تواصل معنا
            </a>
          </div>
        </div>
        <div className="relative">
          <div className="absolute inset-0 bg-primary-200 rounded-3xl rotate-3" />
          <img
            src={heroSrc}
            alt="جمعية العلوم الخيرية"
            className="relative rounded-3xl shadow-xl w-full aspect-square object-cover border-4 border-white"
          />
        </div>
      </section>

      {/* المميزات */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold text-sand-900 text-center mb-8">خدماتنا</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="card text-center">
              <div className="text-4xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-sand-800 mb-1">{f.title}</h3>
              <p className="text-sand-500 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* دعوة لتسجيل الدخول */}
      <section className="max-w-4xl mx-auto px-4 py-14">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 to-primary-800 text-white text-center px-6 py-12 shadow-xl">
          {/* زخرفة خلفية */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
          <div className="absolute -bottom-14 -left-14 w-56 h-56 bg-white/10 rounded-full" />

          <div className="relative">
            <span className="inline-block text-4xl mb-3">🤝</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">هل أنت موظف أو مدير فرع؟</h2>
            <p className="text-primary-50/90 text-lg mb-7">سجّل دخولك للوصول إلى لوحة التحكم الخاصة بك</p>
            <Link
              to="/login"
              className="btn bg-white text-primary-700 hover:bg-primary-50 hover:scale-105 transition-transform inline-flex px-8 py-3 text-base font-bold shadow-md"
            >
              تسجيل الدخول ←
            </Link>
          </div>
        </div>
      </section>

      <div className="flex-1" />
      <Footer whatsappNumber={settings?.whatsappNumber} />
      <FloatingWhatsApp whatsappNumber={settings?.whatsappNumber} />
    </div>
  );
};

export default LandingPage;
