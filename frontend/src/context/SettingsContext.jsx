import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios";

const SettingsContext = createContext(null);

const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

export const resolveMediaUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${API_ORIGIN}${url}`;
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = () => {
    setLoading(true);
    api
      .get("/settings")
      .then((res) => setSettings(res.data))
      .catch(() => setSettings({}))
      .finally(() => setLoading(false));
  };

  useEffect(reload, []);

  return (
    <SettingsContext.Provider value={{ settings: settings || {}, loading, reload }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
