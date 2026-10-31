// GET /api/session —— 只回答"现在是不是登录状态"
const { isAuthed } = require("../lib/auth");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ authed: isAuthed(req) });
};
