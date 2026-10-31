// 图片的可见性清单：images.json 里记着每个文件名是公开还是私密。
// 规则：文章公开 → 它引用的图片公开；文章私密 → 图片私密。
const { getText, putText } = require("./github");

const MANIFEST = "images.json";

async function readManifest() {
  const raw = await getText(MANIFEST);
  if (!raw) return {};
  try {
    const data = JSON.parse(raw);
    return data && typeof data === "object" ? data : {};
  } catch (e) {
    return {};
  }
}

async function writeManifest(map) {
  await putText(MANIFEST, JSON.stringify(map, null, 2) + "\n", "更新图片可见性清单");
}

/** 从正文里找出引用的图片名：/api/image?p=images/xxx.png */
function referencedImages(body) {
  const names = [];
  const re = /\/api\/image\?p=([A-Za-z0-9._/-]+)/g;
  let m;
  while ((m = re.exec(String(body || ""))) !== null) names.push(m[1]);
  return names;
}

async function setVisibility(names, isPublic) {
  if (!names.length) return;
  const map = await readManifest();
  let changed = false;
  for (const name of names) {
    const entry = map[name] || { public: false };
    if (entry.public !== isPublic) {
      map[name] = { public: isPublic };
      changed = true;
    }
  }
  if (changed) await writeManifest(map);
}

async function addImage(name) {
  const map = await readManifest();
  map[name] = { public: false }; // 先按私密处理，保存公开文章时才转公开
  await writeManifest(map);
}

async function isPublicImage(name) {
  const map = await readManifest();
  return !!(map[name] && map[name].public === true);
}

module.exports = { referencedImages, setVisibility, addImage, isPublicImage };
