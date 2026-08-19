import React, { useState } from "react";
import { NavLink, useNavigate, Link } from "react-router-dom";
import { useAuth, ROLE_LABELS } from "../context/AuthContext";
import { useSettings, resolveMediaUrl } from "../context/SettingsContext";
import Footer from "./Footer";
import FloatingWhatsApp from "./FloatingWhatsApp";

const NAV_ITEMS = [
  { to: "/dashboard", label: "لوحة التحكم", icon: "🏠", roles: ["super_admin", "branch_manager", "employee"] },
  { to: "/branches", label: "الفروع", icon: "🏢", roles: ["super_admin"] },
  { to: "/students", label: "الطلاب", icon: "🎓", roles: ["super_admin", "branch_manager", "employee"] },
  { to: "/employees", label: "الموظفون", icon: "👥", roles: ["super_admin", "branch_manager"] },
  { to: "/attendance", label: "الحضور والغياب", icon: "📋", roles: ["super_admin", "branch_manager", "employee"] },
  { to: "/tests", label: "الاختبارات", icon: "📝", roles: ["super_admin", "branch_manager", "employee"] },
  { to: "/evaluations", label: "تقييم الطلاب", icon: "⭐", roles: ["super_admin", "branch_manager", "employee"] },
  { to: "/hifz", label: "الحفظ الشهري", icon: "📖", roles: ["super_admin", "branch_manager", "employee"] },
  { to: "/competitions", label: "مسابقات الموظفين", icon: "🏆", roles: ["super_admin", "branch_manager"] },
  { to: "/leaves", label: "طلبات الإجازة", icon: "🗓️", roles: ["super_admin", "branch_manager", "employee"] },
  { to: "/payments", label: "المدفوعات", icon: "💵", roles: ["super_admin", "branch_manager"] },
  { to: "/expenses", label: "المصروفات", icon: "🧾", roles: ["super_admin", "branch_manager"] },
  { to: "/salaries", label: "الرواتب", icon: "💰", roles: ["super_admin", "branch_manager", "employee"] },
  { to: "/reports", label: "التقارير", icon: "🖨️", roles: ["super_admin", "branch_manager"] },
  { to: "/settings", label: "إعدادات الموقع", icon: "⚙️", roles: ["super_admin"] },
];

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const logoSrc = settings?.logoUrl ? resolveMediaUrl(settings.logoUrl) : "/logo.jpg";

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user?.role));

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-sand-50 print:bg-white" dir="rtl">
      {/* الشريط الجانبي - ثابت في مكانه (fixed) بارتفاع الشاشة، وقائمة الروابط جواه بس هي اللي بتسكرول */}
      <aside
        className={`print:hidden fixed z-30 inset-y-0 right-0 w-64 h-screen bg-white border-l border-sand-100 flex flex-col transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        }`}
      >
        {/* اللوجو ثابت أعلى السايدبار - يودي للصفحة الرئيسية */}
        <Link to="/" className="p-5 border-b border-sand-100 flex-shrink-0 block hover:bg-sand-50 transition">
          <div className="flex items-center gap-2">
            <img src={logoSrc} alt="الشعار" className="w-10 h-10 rounded-xl object-cover border border-sand-200" />
            <div>
              <div className="font-bold text-sand-900 leading-tight text-sm">{settings?.heroTitle || "جمعية العلوم الخيرية"}</div>
              <div className="text-xs text-sand-500">{settings?.heroSubtitle || "نظام إدارة الحضانة والكتاب"}</div>
            </div>
          </div>
        </Link>

        {/* قائمة الروابط - المنطقة الوحيدة القابلة للسكرول في كل التخطيط */}
        <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/dashboard"}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? "bg-primary-600 text-white shadow-sm"
                    : "text-sand-600 hover:bg-sand-50"
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* بيانات المستخدم ثابتة أسفل السايدبار */}
        <div className="p-3 border-t border-sand-100 flex-shrink-0">
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="w-9 h-9 rounded-full bg-sand-200 flex items-center justify-center text-sand-700 font-bold">
              {user?.name?.charAt(0) || "؟"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-sand-800 truncate">{user?.name}</div>
              <div className="text-xs text-sand-500">{ROLE_LABELS[user?.role]}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-secondary w-full mt-2 justify-center">
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* المحتوى - بيبدأ بعد مساحة السايدبار الثابت، وبيسكرول مع الصفحة كلها بشكل طبيعي */}
      <div className="lg:mr-64 print:mr-0 min-h-screen flex flex-col">
        <header className="print:hidden lg:hidden bg-white border-b border-sand-100 p-4 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="btn-ghost">
            ☰ القائمة
          </button>
          <div className="font-bold text-sand-800">{settings?.heroTitle || "جمعية العلوم الخيرية"}</div>
        </header>

        <div className="print:hidden bg-primary-600 text-white text-center text-xs sm:text-sm py-1.5">
          {new Date().toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </div>

        {/* المحتوى الأساسي - بيسكرول طبيعي مع الصفحة، مش جواه هو */}
        <main className="flex-1 p-4 lg:p-8 print:p-0">
          <div className="max-w-7xl w-full mx-auto">{children}</div>
        </main>

        {/* الفوتر جزء من تدفق الصفحة، بيظهر في آخرها بعد المحتوى */}
        <div className="print:hidden">
          <Footer whatsappNumber={settings?.whatsappNumber} />
        </div>
      </div>

      <div className="print:hidden">
        <FloatingWhatsApp whatsappNumber={settings?.whatsappNumber} />
      </div>
    </div>
  );
};

export default Layout;