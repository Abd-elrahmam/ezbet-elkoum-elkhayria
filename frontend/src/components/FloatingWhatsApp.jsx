import React from "react";
import { WhatsAppIcon } from "./Footer";

const FloatingWhatsApp = ({ whatsappNumber = "201021330018" }) => (
  <a
    href={`https://wa.me/${whatsappNumber}`}
    target="_blank"
    rel="noreferrer"
    className="fixed bottom-5 left-5 z-50 w-14 h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg hover:scale-110 transition animate-[pulse_2.5s_ease-in-out_infinite]"
    title="تواصل معنا عبر واتساب"
  >
    <span className="w-7 h-7">
      <WhatsAppIcon />
    </span>
  </a>
);

export default FloatingWhatsApp;
