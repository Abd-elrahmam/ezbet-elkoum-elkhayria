import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { SettingsProvider } from "./context/SettingsContext.jsx";
import { PeriodProvider } from "./context/PeriodContext.jsx";
import { initQuranPages } from "./utils/quranPages";
import "./index.css";
async function startApp() {
  try {
    await initQuranPages();

    ReactDOM.createRoot(
      document.getElementById("root")
    ).render(
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
  } catch (error) {
    console.error("Failed to initialize Quran pages:", error);

    document.getElementById("root").innerHTML = `
      <div style="
        padding: 40px;
        text-align: center;
        direction: rtl;
        font-family: sans-serif;
      ">
        <h2>تعذر تحميل بيانات صفحات المصحف</h2>
        <p>تأكد من اتصال الإنترنت ثم أعد تحميل الصفحة.</p>
      </div>
    `;
  }
}

startApp();