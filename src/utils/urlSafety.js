const dns = require("dns").promises;
const net = require("net");

/**
 * Webhook va boshqa foydalanuvchi-belgilagan URL'larni SSRF hujumlaridan
 * himoyalash uchun tekshiruv. Server nomidan foydalanuvchi tomonidan
 * yozilgan har qanday manzilga so'rov yuborishdan oldin shu funksiyani
 * chaqiring.
 *
 * Bloklanadigan holatlar:
 *  - http/https bo'lmagan protokollar (file://, ftp://, gopher:// va h.k.)
 *  - localhost / loopback (127.0.0.0/8, ::1)
 *  - private tarmoq oralig'lari (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
 *  - link-local va cloud metadata manzili (169.254.0.0/16 — shu jumladan
 *    169.254.169.254, AWS/GCP/Azure metadata endpoint)
 *  - IPv6 unique-local va link-local (fc00::/7, fe80::/10)
 *  - DNS orqali yuqoridagi manzillarga rezolyutsiya bo'ladigan hostnamelar
 *    (DNS rebinding hujumidan himoya)
 */

const PRIVATE_IPV4_RANGES = [
  { start: "0.0.0.0", end: "0.255.255.255" },
  { start: "10.0.0.0", end: "10.255.255.255" },
  { start: "100.64.0.0", end: "100.127.255.255" }, // CGNAT
  { start: "127.0.0.0", end: "127.255.255.255" }, // loopback
  { start: "169.254.0.0", end: "169.254.255.255" }, // link-local / cloud metadata
  { start: "172.16.0.0", end: "172.31.255.255" },
  { start: "192.0.0.0", end: "192.0.0.255" },
  { start: "192.168.0.0", end: "192.168.255.255" },
  { start: "198.18.0.0", end: "198.19.255.255" },
  { start: "224.0.0.0", end: "255.255.255.255" }, // multicast/reserved
];

function ipv4ToLong(ip) {
  return ip
    .split(".")
    .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function isPrivateIPv4(ip) {
  const value = ipv4ToLong(ip);
  return PRIVATE_IPV4_RANGES.some(
    (range) => value >= ipv4ToLong(range.start) && value <= ipv4ToLong(range.end)
  );
}

function isPrivateIPv6(ip) {
  const lower = ip.toLowerCase();
  if (lower === "::1") return true; // loopback
  if (lower.startsWith("::ffff:")) {
    // IPv4-mapped IPv6 — ichidagi IPv4 manzilni tekshiramiz
    const mapped = lower.split(":").pop();
    if (net.isIPv4(mapped)) return isPrivateIPv4(mapped);
  }
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local (fc00::/7)
  if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) {
    return true; // link-local (fe80::/10)
  }
  return false;
}

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) return isPrivateIPv4(ip);
  if (net.isIPv6(ip)) return isPrivateIPv6(ip);
  return true; // aniqlanmagan format — xavfsizlik uchun bloklaymiz
}

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * @param {string} rawUrl
 * @returns {Promise<{ safe: boolean, reason?: string }>}
 */
async function isUrlSafeForOutboundRequest(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { safe: false, reason: "URL formati noto'g'ri" };
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return { safe: false, reason: "Faqat http:// yoki https:// protokollariga ruxsat berilgan" };
  }

  const hostname = parsed.hostname;

  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    return { safe: false, reason: "localhost manzillariga so'rov yuborish taqiqlangan" };
  }

  // Agar hostname to'g'ridan-to'g'ri IP bo'lsa
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      return { safe: false, reason: "Xususiy/ichki IP manzillarga so'rov yuborish taqiqlangan" };
    }
    return { safe: true };
  }

  // Hostname bo'lsa — DNS rebinding'dan himoyalanish uchun barcha
  // rezolyutsiya qilingan IP'larni tekshiramiz
  let addresses;
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch {
    return { safe: false, reason: "Hostname DNS orqali aniqlanmadi" };
  }

  if (addresses.length === 0) {
    return { safe: false, reason: "Hostname uchun IP manzil topilmadi" };
  }

  for (const { address } of addresses) {
    if (isPrivateIp(address)) {
      return { safe: false, reason: `Hostname xususiy IP manzilga (${address}) rezolyutsiya bo'ladi` };
    }
  }

  return { safe: true };
}

module.exports = { isUrlSafeForOutboundRequest };
