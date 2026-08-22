const { t, isSupportedLanguage, DEFAULT_LANGUAGE } = require("../i18n");

/**
 * Har bir so'rov uchun tilni aniqlaydi va req.t() (tarjima funksiyasi)
 * hamda req.language ni o'rnatadi.
 *
 * Til aniqlash tartibi (birinchi topilgani ishlatiladi):
 *   1. ?lang= query parametri (masalan /api/v1/ai/chat?lang=ru) — eng
 *      aniq, foydalanuvchi/frontend ataylab so'ragan til
 *   2. Autentifikatsiya qilingan foydalanuvchining User.language
 *      maydoni (agar auth middleware'dan keyin ishlatilsa va req.user
 *      mavjud bo'lsa)
 *   3. Accept-Language header (brauzer/mobil qurilma tili)
 *   4. DEFAULT_LANGUAGE (en)
 *
 * Controller'larda shunday ishlatiladi:
 *   res.status(400).json({ error: req.t("auth.invalid_credentials") });
 */
const i18nMiddleware = (req, res, next) => {
  let lang = null;

  if (req.query.lang && isSupportedLanguage(req.query.lang)) {
    lang = req.query.lang;
  } else if (req.user?.language && isSupportedLanguage(req.user.language)) {
    // Eslatma: bu middleware odatda auth'dan OLDIN ishlaydi (chunki u
    // barcha so'rovlarga, hatto login/register kabi auth talab
    // qilmaydigan endpointlarga ham kerak), shuning uchun req.user bu
    // yerda ko'pincha hali mavjud bo'lmaydi. Auth middleware ishlagandan
    // keyin controller ichida req.language ni qayta hisoblash kerak
    // bo'lsa, quyidagi resolveLanguageForUser() dan foydalaning.
    lang = req.user.language;
  } else if (req.headers["accept-language"]) {
    // "ru-RU,ru;q=0.9,en;q=0.8" -> "ru"
    const primaryTag = req.headers["accept-language"].split(",")[0].trim();
    const langCode = primaryTag.split("-")[0].toLowerCase();
    if (isSupportedLanguage(langCode)) {
      lang = langCode;
    }
  }

  req.language = lang || DEFAULT_LANGUAGE;
  req.t = (key, params) => t(key, req.language, params);

  next();
};

/**
 * Auth middleware'dan KEYIN chaqirilishi mumkin bo'lgan yordamchi —
 * agar foydalanuvchi endi aniqlangan bo'lsa (req.user mavjud) va u
 * ?lang= yoki Accept-Language orqali aniq til so'ramagan bo'lsa,
 * uning profilidagi til sozlamasini qo'llaydi.
 */
const applyUserLanguagePreference = (req) => {
  if (req.query.lang && isSupportedLanguage(req.query.lang)) {
    return; // foydalanuvchi ushbu so'rovda aniq til so'ragan — ustuvor
  }
  if (req.user?.language && isSupportedLanguage(req.user.language)) {
    req.language = req.user.language;
    req.t = (key, params) => t(key, req.language, params);
  }
};

module.exports = { i18nMiddleware, applyUserLanguagePreference };
