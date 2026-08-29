import React from "react";

const WhatsAppIcon = () => (
  <svg viewBox="0 0 32 32" className="w-5 h-5 fill-current">
    <path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.386.7 4.607 1.902 6.472L4 29l7.71-1.87A11.94 11.94 0 0016 27c6.627 0 12-5.373 12-12S22.627 3 16.001 3zm0 21.8c-1.98 0-3.83-.58-5.386-1.578l-.386-.24-4.573 1.11 1.147-4.46-.253-.396A9.77 9.77 0 016.2 15c0-5.404 4.397-9.8 9.8-9.8 5.404 0 9.8 4.396 9.8 9.8s-4.396 9.8-9.799 9.8zm5.372-7.34c-.294-.147-1.74-.859-2.01-.958-.27-.098-.467-.147-.663.148-.196.294-.76.958-.932 1.155-.171.196-.343.22-.637.073-.294-.147-1.242-.458-2.366-1.46-.874-.78-1.464-1.744-1.636-2.038-.171-.294-.018-.453.129-.6.132-.132.294-.343.441-.514.147-.172.196-.294.294-.49.098-.196.049-.368-.024-.515-.073-.147-.663-1.598-.909-2.188-.24-.575-.484-.497-.663-.507l-.564-.01c-.196 0-.515.073-.784.368-.27.294-1.03 1.007-1.03 2.457 0 1.45 1.055 2.851 1.202 3.048.147.196 2.077 3.17 5.033 4.445.703.303 1.252.484 1.68.62.706.225 1.348.193 1.856.117.566-.085 1.74-.711 1.985-1.398.245-.687.245-1.276.171-1.398-.073-.123-.269-.196-.564-.343z" />
  </svg>
);

const DEVELOPER_NAME = "عبدالرحمن فضل";
const DEVELOPER_WHATSAPP = "201021330018"; // رقم ثابت، مش قابل للتعديل من لوحة الإعدادات

const Footer = ({ whatsappNumber = "201021330018" }) => {
  return (
    <footer className="border-t border-sand-100 bg-white/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs sm:text-sm">
        <p className="text-sand-500">
          © {new Date().getFullYear()} جمعية بلال بن رباح — جميع الحقوق محفوظة
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sand-400">تم التصميم والتطوير بواسطة</span>
          <span className="font-bold bg-gradient-to-l from-primary-600 to-primary-800 bg-clip-text text-transparent">
            {DEVELOPER_NAME}
          </span>
          <a
            href={`https://wa.me/${DEVELOPER_WHATSAPP}`}
            target="_blank"
            rel="noreferrer"
            className="w-7 h-7 rounded-full bg-[#25D366] text-white flex items-center justify-center hover:scale-110 transition shadow-sm"
            title="تواصل مع المطور عبر واتساب"
          >
            <WhatsAppIcon />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
export { WhatsAppIcon };
