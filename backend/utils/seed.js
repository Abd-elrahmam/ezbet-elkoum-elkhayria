const User = require("../models/User");
const Branch = require("../models/Branch");
const { ROLES } = require("./constants");

const runSeed = async () => {
  const existingAdmin = await User.findOne({ role: ROLES.SUPER_ADMIN });
  if (existingAdmin) {
    console.log("⚠️  يوجد أدمن رئيسي بالفعل:", existingAdmin.username);
  } else {
    const admin = await User.create({
      name: process.env.SUPER_ADMIN_NAME || "المدير العام",
      username: process.env.SUPER_ADMIN_USERNAME || "admin",
      password: process.env.SUPER_ADMIN_PASSWORD || "Admin@12345",
      role: ROLES.SUPER_ADMIN,
      department: "both",
    });
    console.log("✅ تم إنشاء الأدمن الرئيسي:");
    console.log("   اسم المستخدم:", admin.username);
  }

  const branchesCount = await Branch.countDocuments();
  if (branchesCount === 0) {
    const branchNames = [
      "الفرع الرئيسي",
      "فرع 2",
      "فرع 3",
      "فرع 4",
      "فرع 5",
      "فرع 6",
      "فرع 7",
      "فرع 8",
      "فرع 9",
      "فرع 10",
    ];
    await Branch.insertMany(branchNames.map((name) => ({ name, hasNursery: true, hasQuran: true })));
    console.log(`✅ تم إنشاء ${branchNames.length} فروع تجريبية (عدّل أسماءها من النظام)`);
  } else {
    console.log("⚠️  توجد فروع بالفعل، تم تخطي إنشاء فروع تجريبية");
  }

  console.log("🎉 تمت التهيئة بنجاح");
};

// تشغيل مباشر عن طريق npm run seed (لسه شغالة برضو لو الكونسول اشتغل)
if (require.main === module) {
  require("dotenv").config();
  const connectDB = require("../config/db");
  connectDB()
    .then(runSeed)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ فشل التهيئة:", err);
      process.exit(1);
    });
}

module.exports = runSeed;