// GET /api/image?p=images/xxx.png —— 从私有仓库把图片取出来给浏览器。
// 公开文章引用的图片谁都能取；私密文章引用的图片要登录。
const { getBinary } = require("../lib/github");
const { isPublicImage } = require("../lib/images");
const { isAuthed } = require("../lib/auth");

const TYPES = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

module.exports = async (req, res) => {
  const path = String((req.query && req.query.p) || "");

  if (!/^images\/[A-Za-z0-9._-]+$/.test(path)) {
    res.status(400).send("图片地址不对");
    return;
  }

  const ext = (path.split(".").pop() || "").toLowerCase();
  if (!TYPES[ext]) {
    res.status(400).send("不支持的图片格式");
    return;
  }

  try {
    const isPublic = await isPublicImage(path);
    if (!isPublic && !isAuthed(req)) {
      res.status(404).send("找不到");
      return;
    }

    const file = await getBinary(path);
    if (!file) {
      res.status(404).send("找不到");
      return;
    }

    res.setHeader("Content-Type", TYPES[ext]);
    res.setHeader("Cache-Control", isPublic ? "public, max-age=86400" : "private, no-store");
    res.status(200).send(file.buffer);
  } catch (e) {
    res.status(500).send("读取失败：" + e.message);
  }
};
