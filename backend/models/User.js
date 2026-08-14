const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { ROLES, DEPARTMENTS } = require("../utils/constants");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    photoUrl: { type: String, default: "" },
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },
    phone: { type: String, trim: true },
    role: {
      type: String,
      enum: Object.values(ROLES),
      required: true,
      default: ROLES.EMPLOYEE,
    },
    // الأدمن الرئيسي مش مرتبط بفرع، الباقي مرتبطين بفرع
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null },
    // القسم اللي بيشتغل فيه الموظف/المدير: حضانة أو كتاب أو الاثنين (للمدير)
    department: {
      type: String,
      enum: [...Object.values(DEPARTMENTS), "both"],
      default: "both",
    },
    jobTitle: { type: String, trim: true, default: "" }, // مثال: مدرس، إداري، محاسب
    baseSalary: { type: Number, default: 0 },
    hireDate: { type: Date, default: Date.now },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
