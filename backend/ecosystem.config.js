// ملف تشغيل الباك إند بـ PM2 (لو الاستضافة نوع VPS أو Cloud بتدعم Node مباشرة).
// PM2 بيخلي السيرفر يشتغل في الخلفية، يعيد تشغيله تلقائيًا لو حصله كراش،
// ويشتغل تاني تلقائيًا لو السيرفر نفسه اتعمله ريستارت.
//
// طريقة الاستخدام على السيرفر:
//   npm install -g pm2
//   cd backend && npm install --production
//   pm2 start ecosystem.config.js
//   pm2 save
//   pm2 startup   (يخلي PM2 يشتغل تلقائيًا بعد ريستارت السيرفر)

module.exports = {
  apps: [
    {
      name: "bilal-nursery-api",
      script: "server.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
