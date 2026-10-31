// GET /api/content —— 前台首页用。
// 没登录：只返回公开文案和公开文章。
// 已登录：额外返回私密文章（标了 private 的）。
const { loadAll } = require("../lib/content");
const { isAuthed } = require("../lib/auth");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const authed = isAuthed(req);

  let data;
  try {
    data = await loadAll(false);
  } catch (e) {
    res.status(500).json({ error: "读取内容失败：" + e.message });
    return;
  }

  const posts = authed ? data.posts : data.posts.filter((p) => !p.private);

  res.status(200).json({
    authed,
    site: data.site,
    posts: posts.map((p) => ({
      slug: p.slug,
      title: p.title,
      date: p.date,
      private: p.private,
      body: p.body,
    })),
  });
};
