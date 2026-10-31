// POST /api/post —— 后台保存 / 删除文章、保存首页文案。全部要求已登录。
const { putText, removeFile } = require("../lib/github");
const { buildPost, isValidSlug, parseTags } = require("../lib/posts");
const { invalidate } = require("../lib/content");
const { referencedImages, setVisibility } = require("../lib/images");
const { isAuthed } = require("../lib/auth");
const { readJson } = require("../lib/http");

function cleanDate(value) {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : new Date().toISOString().slice(0, 10);
}

module.exports = async (req, res) => {
  if (!isAuthed(req)) {
    res.status(401).json({ error: "没有登录" });
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "只接受 POST" });
    return;
  }

  let body;
  try {
    body = await readJson(req);
  } catch (e) {
    res.status(400).json({ error: "请求格式不对" });
    return;
  }

  const action = body && body.action;

  try {
    if (action === "save") {
      const slug = String(body.slug || "").trim();
      if (!isValidSlug(slug)) {
        res.status(400).json({ error: "地址只能用字母、数字和连字符，例如 my-first-post" });
        return;
      }
      const post = {
        title: String(body.title || "").trim() || slug,
        date: cleanDate(body.date),
        isPrivate: body.isPrivate === true,
        tags: Array.isArray(body.tags) ? body.tags : parseTags(body.tags),
        body: String(body.body || ""),
      };
      await putText("posts/" + slug + ".md", buildPost(post), (post.isPrivate ? "私密" : "公开") + "文章：" + post.title);
      await setVisibility(referencedImages(post.body), !post.isPrivate);
      invalidate();
      res.status(200).json({ ok: true, slug });
      return;
    }

    if (action === "delete") {
      const slug = String(body.slug || "").trim();
      if (!isValidSlug(slug)) {
        res.status(400).json({ error: "文章地址不合法" });
        return;
      }
      await removeFile("posts/" + slug + ".md", "删除文章：" + slug);
      invalidate();
      res.status(200).json({ ok: true });
      return;
    }

    if (action === "site") {
      const links = Array.isArray(body.links)
        ? body.links
            .filter((l) => l && typeof l.label === "string" && typeof l.href === "string")
            .map((l) => ({ label: l.label.slice(0, 30), href: l.href.slice(0, 300) }))
        : [];
      const site = {
        name: String(body.name || "").trim().slice(0, 40) || "Ever-Wind",
        tagline: String(body.tagline || "").trim().slice(0, 200),
        now: String(body.now || "").trim().slice(0, 200),
        links,
      };
      await putText("site.json", JSON.stringify(site, null, 2) + "\n", "更新首页文案");
      invalidate();
      res.status(200).json({ ok: true });
      return;
    }

    res.status(400).json({ error: "未知操作" });
  } catch (e) {
    res.status(500).json({ error: "保存失败：" + e.message });
  }
};
