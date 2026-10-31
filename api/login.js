// POST /api/login  { username, password }
const { checkPassword, checkUsername, createSessionToken, cookieHeader } = require("../lib/auth");
const { readJson, ipOf } = require("../lib/http");

// 简易限速：同一 IP 10 分钟内最多试 8 次。函数实例被回收后计数会归零，但足够挡住随手猜。
const WINDOW = 10 * 60 * 1000;
const LIMIT = 8;
const tries = new Map();

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "只接受 POST" });
    return;
  }

  const ip = ipOf(req);
  const now = Date.now();
  const rec = tries.get(ip);
  if (rec && rec.until > now && rec.count >= LIMIT) {
    res.status(429).json({ error: "尝试次数太多，请 10 分钟后再试" });
    return;
  }

  let body;
  try {
    body = await readJson(req);
  } catch (e) {
    res.status(400).json({ error: "请求格式不对" });
    return;
  }

  let okUser = false;
  let ok = false;
  try {
    okUser = checkUsername(body && body.username);
    ok = checkPassword(body && body.password);
  } catch (e) {
    res.status(500).json({ error: e.message });
    return;
  }

  if (!okUser || !ok) {
    const next = rec && rec.until > now ? { count: rec.count + 1, until: rec.until } : { count: 1, until: now + WINDOW };
    tries.set(ip, next);
    // 故意慢一点，降低暴力猜测的速度
    await new Promise((r) => setTimeout(r, 400));
    res.status(401).json({ error: "账号或密码不对" });
    return;
  }

  tries.delete(ip);
  res.setHeader("Set-Cookie", cookieHeader(createSessionToken()));
  res.status(200).json({ ok: true });
};
