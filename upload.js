// POST /api/upload  { name, dataUrl } —— 上传一张图片到私有仓库
const { putBase64 } = require("../lib/github");
const { addImage } = require("../lib/images");
const { isAuthed } = require("../lib/auth");
const { readJson } = require("../lib/http");

const MAX_BYTES = 3 * 1024 * 1024; // 3MB
const TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

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

  const match = /^data:(image\/[a-z+]+);base64,(.+)$/.exec(String(body.dataUrl || ""));
  if (!match || !TYPES[match[1]]) {
    res.status(400).json({ error: "只支持 png / jpg / webp / gif 图片" });
    return;
  }

  const base64 = match[2].replace(/\s/g, "");
  const bytes = Math.floor((base64.length * 3) / 4);
  if (bytes > MAX_BYTES) {
    res.status(413).json({ error: "图片太大了，请压到 3MB 以内" });
    return;
  }

  const name =
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 8) +
    "." +
    TYPES[match[1]];
  const path = "images/" + name;

  try {
    await putBase64(path, base64, "上传图片：" + name);
    await addImage(path);
    res.status(200).json({ ok: true, url: "/api/image?p=" + path });
  } catch (e) {
    res.status(500).json({ error: "上传失败：" + e.message });
  }
};
