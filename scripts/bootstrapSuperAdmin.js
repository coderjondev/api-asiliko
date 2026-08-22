/**
 * Birinchi super-admin'ni tayinlash uchun bir martalik CLI skript.
 *
 * Muammo: admin panelning o'zi (grantAdmin) faqat allaqachon
 * ADMINS_WRITE huquqiga ega admin tomonidan chaqirilishi mumkin — lekin
 * loyiha yangi deploy qilinganda hech qanday admin mavjud emas
 * ("tuxum-tovuq" muammosi). Shu skript shu muammoni hal qiladi: server
 * kodidan tashqarida, to'g'ridan-to'g'ri MongoDB'ga ulanib, mavjud
 * foydalanuvchini super_admin preset bilan adminga aylantiradi.
 *
 * Foydalanish:
 *   node scripts/bootstrapSuperAdmin.js user@example.com
 *
 * Talab: foydalanuvchi avval oddiy /api/v1/auth/register orqali
 * ro'yxatdan o'tgan bo'lishi kerak — bu skript parol yaratmaydi,
 * faqat mavjud hisobga admin huquqini beradi.
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const User = require("../src/models/User");
const { ROLE_PRESETS } = require("../src/constants/roles");

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error("Foydalanish: node scripts/bootstrapSuperAdmin.js <email>");
    process.exit(1);
  }

  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI environment o'zgaruvchisi topilmadi (.env faylini tekshiring)");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB ga ulandi");

  const existingSuperAdmins = await User.countDocuments({
    role: "admin",
    permissions: "admins:write",
  });

  const user = await User.findOne({ email: email.toLowerCase().trim() });

  if (!user) {
    console.error(
      `"${email}" bilan foydalanuvchi topilmadi. Avval /api/v1/auth/register orqali ro'yxatdan o'ting.`
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  if (user.role === "admin" && user.permissions.includes("admins:write")) {
    console.log(`"${email}" allaqachon to'liq huquqli admin.`);
    await mongoose.disconnect();
    process.exit(0);
  }

  user.role = "admin";
  user.permissions = ROLE_PRESETS.super_admin;
  await user.save();

  console.log(`✅ "${email}" super-admin qilib tayinlandi.`);
  console.log(`   Berilgan ruxsatlar: ${ROLE_PRESETS.super_admin.join(", ")}`);

  if (existingSuperAdmins > 0) {
    console.log(
      `\nEslatma: tizimda allaqachon ${existingSuperAdmins} ta admins:write huquqiga ega admin bor edi.`
    );
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((error) => {
  console.error("Xatolik:", error.message);
  process.exit(1);
});
