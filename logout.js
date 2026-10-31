// POST /api/logout —— 清掉登录 cookie
const { clearCookieHeader } = require("../lib/auth");

module.exports = async (req, res) => {
  res.setHeader("Set-Cookie", clearCookieHeader());
  res.status(200).json({ ok: true });
};
