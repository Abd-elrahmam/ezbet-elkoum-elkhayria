import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { SettingsProvider } from "./context/SettingsContext.jsx";
import { PeriodProvider } from "./context/PeriodContext.jsx";
import { initQuranPages } from "./utils/quranPages";
import "./index.css";

// خريطة صفحات المصحف بقت ملف محلي (مش رابط خارجي)، فتحميلها سريع وموثوق.
// مع ذلك، التطبيق كله ميتفهش لتحميلها: بيتم تحميلها في الخلفية بمجرد الإقلاع،
// وصفحة "الحفظ الشهري" (الوحيدة اللي محتاجاها فعليًا) بتتأكد إنها جاهزة بنفسها
// قبل ما تستخدمها (شوف initQuranPages() جوه Memorization.jsx). بالطريقة دي، أي
// مشكلة مستقبلية في تحميل الملف ده هتأثر بس على صفحة الحفظ، مش على التطبيق كله.
initQuranPages().catch((error) => {
  console.error("تعذر تحميل خريطة صفحات المصحف:", error);
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <SettingsProvider>
        <AuthProvider>
          <PeriodProvider>
            <App />
          </PeriodProvider>
        </AuthProvider>
      </SettingsProvider>
    </BrowserRouter>
  </React.StrictMode>
);