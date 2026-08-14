require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const connectDB = require("./config/db");

const app = express();

connectDB();

app.use(cors({ origin: process.env.CLIENT_URL || "*", credentials: true }));
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

// معالجة الأخطاء العامة
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "حدث خطأ في السيرفر", error: err.message });
});

// مسار غير موجود
app.use((req, res) => res.status(404).json({ message: "المسار غير موجود" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 السيرفر شغال على المنفذ ${PORT}`));
