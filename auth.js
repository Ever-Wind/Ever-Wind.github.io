// 登录与会话。密码校验、签名、cookie 解析，全部在服务器端完成。
const crypto = require("node:crypto");

const COOKIE = "ev_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 天

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("缺少 SESSION_SECRET（至少 32 个字符的随机串）");
  return s;
}

function sign(data) {
  return crypto.createHmac("sha256", secret()).update(data).digest("base64url");
}

function createSessionToken() {
  const payload = Buffer.from(
    JSON.stringify({ sub: "admin", exp: Math.floor(Date.now() / 1000) + MAX_AGE })
  ).toString("base64url");
  return payload + "." + sign(payload);
}

function verifySessionToken(token) {
  if (typeof token !== "string" || token.indexOf(".") < 0) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const want = Buffer.from(sign(payload));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return false;
  try {
    const obj = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (obj.sub !== "admin") return false;
    if (typeof obj.exp !== "number" || obj.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch (e) {
    return false;
  }
}

function readCookie(header, name) {
  if (!header) return null;
  const parts = String(header).split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

/** 请求是否来自已登录的管理员 */
function isAuthed(req) {
  try {
    return verifySessionToken(readCookie(req.headers.cookie, COOKIE));
  } catch (e) {
    return false;
  }
}

function cookieHeader(token) {
  return `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}`;
}

function clearCookieHeader() {
  return `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

/** 校验提交的密码。优先用 ADMIN_PASSWORD_HASH，其次 ADMIN_PASSWORD。 */
function checkPassword(input) {
  if (typeof input !== "string" || input.length === 0) return false;

  const hashed = process.env.ADMIN_PASSWORD_HASH;
  if (hashed) {
    const parts = hashed.split("$");
    if (parts.length !== 3 || parts[0] !== "scrypt") throw new Error("ADMIN_PASSWORD_HASH 格式应为 scrypt$盐$哈希");
    const salt = Buffer.from(parts[1], "hex");
    const want = Buffer.from(parts[2], "hex");
    const got = crypto.scryptSync(input, salt, want.length);
    return want.length === got.length && crypto.timingSafeEqual(want, got);
  }

  const plain = process.env.ADMIN_PASSWORD;
  if (!plain) throw new Error("没有配置登录密码：请设置 ADMIN_PASSWORD_HASH 或 ADMIN_PASSWORD");
  const a = Buffer.from(input);
  const b = Buffer.from(plain);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** 校验账号。默认 admin，可用 ADMIN_USERNAME 改。 */
function checkUsername(input) {
  const want = process.env.ADMIN_USERNAME || "admin";
  const a = Buffer.from(String(input == null ? "" : input));
  const b = Buffer.from(want);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { isAuthed, checkPassword, checkUsername, createSessionToken, cookieHeader, clearCookieHeader, MAX_AGE };
