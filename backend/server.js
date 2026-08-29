require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const connectDB = require("./config/db");

const app = express();

// السيرفر غالبًا هيشتغل خلف reverse proxy (Nginx/Apache) على الاستضافة،
// فلازم Express يعرف ياخد IP العميل الحقيقي من هيدر X-Forwarded-For
// (مهم عشان rate limiting على /api/auth/login يشتغل صح)
app.set("trust proxy", 1);

connectDB();

// ملاحظة: مينفعش تستخدم origin: "*" مع credentials: true (المتصفح بيرفض الطلب أصلًا).
// CLIENT_URL ممكن يكون رابط واحد أو أكتر مفصولين بفاصلة (مفيد لو عندك دومين وwww. مثلًا)
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // السماح بالطلبات اللي مفيهاش origin (زي Postman أو health checks)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("غير مسموح لهذا المصدر بالوصول (CORS)"));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan("dev"));

// تقديم الصور المرفوعة (الشعار وصور اللاندينج بيج) بشكل ثابت
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/api/health", (req, res) => res.json({ status: "ok", name: "جمعية بلال بن رباح - API" }));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/branches", require("./routes/branches"));
app.use("/api/users", require("./routes/users"));
app.use("/api/students", require("./routes/students"));
app.use("/api/attendance", require("./routes/attendance"));
app.use("/api/payments", require("./routes/payments"));
app.use("/api/expenses", require("./routes/expenses"));
app.use("/api/salaries", require("./routes/salaries"));
app.use("/api/tests", require("./routes/tests"));
app.use("/api/competitions", require("./routes/competitions"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/settings", require("./routes/settings"));
app.use("/api/leaves", require("./routes/leaves"));
app.use("/api/evaluations", require("./routes/evaluations"));
app.use("/api/monthly-attendance", require("./routes/monthlyAttendance"));
app.use("/api/employee-attendance", require("./routes/employeeAttendance"));
app.use("/api/employee-monthly-attendance", require("./routes/employeeMonthlyAttendance"));
app.use("/api/hifz", require("./routes/hifz"));

// معالجة الأخطاء العامة
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "حدث خطأ في السيرفر", error: err.message });
});

// مسار غير موجود
app.use((req, res) => res.status(404).json({ message: "المسار غير موجود" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 السيرفر شغال على المنفذ ${PORT}`));
