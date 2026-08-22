const fs = require("fs");
const path = require("path");

/**
 * Ko'p tillilik (i18n) tizimi — tashqi kutubxonasiz, oddiy kalit-qiymat
 * almashtirish asosida.
 *
 * QO'LLAB-QUVVATLANADIGAN TILLAR: hozircha 12 ta (uz, en, ru, tr, de,
 * fr, es, ar, zh, ja, ko + fallback sifatida en). Kelajakda ko'proq til
 * qo'shish uchun:
 *   1. src/i18n/locales/<til-kodi>.json yarating (masalan "it.json")
 *   2. SUPPORTED_LANGUAGES ro'yxatiga shu kodni qo'shing
 *   3. TAMOM — kodning boshqa hech bir joyiga tegish shart emas.
 *
 * Har bir locale fayli bir xil kalitlar to'plamiga ega bo'lishi kerak
 * (masalan "auth.invalid_credentials"). Agar biror tilda kalit
 * topilmasa, DEFAULT_LANGUAGE (en) dagi qiymat ishlatiladi — foydalanuvchi
 * hech qachon xom kalit nomini ("auth.invalid_credentials") ko'rmaydi.
 */

const SUPPORTED_LANGUAGES = [
  "uz", // O'zbek
  "en", // English
  "ru", // Русский
  "tr", // Türkçe
  "de", // Deutsch
  "fr", // Français
  "es", // Español
  "ar", // العربية
  "zh", // 中文
  "ja", // 日本語
  "ko", // 한국어
];

const DEFAULT_LANGUAGE = "en";

// Barcha locale fayllarini xotiraga yuklab olamiz (server ishga
// tushganda bir marta — har so'rovda diskdan o'qimaslik uchun).
const translations = {};

for (const lang of SUPPORTED_LANGUAGES) {
  const filePath = path.join(__dirname, "locales", `${lang}.json`);
  try {
    translations[lang] = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (error) {
    // Fayl topilmasa yoki JSON buzilgan bo'lsa, bo'sh obyekt bilan
    // davom etamiz — bu til uchun barcha kalitlar DEFAULT_LANGUAGE'ga
    // fallback qiladi (server ishdan to'xtamaydi).
    console.error(`[i18n] "${lang}.json" yuklanmadi: ${error.message}`);
    translations[lang] = {};
  }
}

/**
 * Nested kalitni ("auth.invalid_credentials") obyekt ichidan topadi.
 */
const resolveKey = (obj, key) => {
  return key.split(".").reduce((acc, part) => (acc && typeof acc === "object" ? acc[part] : undefined), obj);
};

/**
 * {{name}} shaklidagi placeholder'larni params bilan almashtiradi.
 */
const interpolate = (template, params) => {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return params[key] !== undefined ? String(params[key]) : match;
  });
};

/**
 * Tarjima qilingan matnni qaytaradi.
 * @param {string} key - "auth.invalid_credentials" kabi nuqta bilan ajratilgan kalit
 * @param {string} lang - til kodi (masalan "uz"); qo'llab-quvvatlanmasa yoki berilmasa DEFAULT_LANGUAGE ishlatiladi
 * @param {object} [params] - {{placeholder}} larni almashtirish uchun qiymatlar
 */
const t = (key, lang = DEFAULT_LANGUAGE, params) => {
  const normalizedLang = SUPPORTED_LANGUAGES.includes(lang) ? lang : DEFAULT_LANGUAGE;

  let value = resolveKey(translations[normalizedLang], key);

  // Kalit shu tilda topilmasa — DEFAULT_LANGUAGE'ga fallback.
  if (value === undefined && normalizedLang !== DEFAULT_LANGUAGE) {
    value = resolveKey(translations[DEFAULT_LANGUAGE], key);
  }

  // Hech qayerda topilmasa — xom kalitni qaytaramiz (bu holat faqat
  // dasturchi xatosi bo'lishi kerak, masalan kalit nomida xato).
  if (value === undefined) {
    console.warn(`[i18n] Kalit topilmadi: "${key}"`);
    return key;
  }

  return interpolate(value, params);
};

const isSupportedLanguage = (lang) => SUPPORTED_LANGUAGES.includes(lang);

module.exports = { t, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, isSupportedLanguage };
