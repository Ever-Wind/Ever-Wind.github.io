// 读写「私有内容仓库」的唯一入口。
// 所有请求都带 GH_TOKEN，只在服务器（Vercel 函数）里跑，浏览器永远看不到这个 token。
const API = "https://api.github.com";

function cfg() {
  const repo = process.env.CONTENT_REPO; // 形如 Ever-Wind/Private-admin
  const token = process.env.GH_TOKEN;
  if (!repo || !token) throw new Error("缺少环境变量 CONTENT_REPO 或 GH_TOKEN");
  return { repo, token };
}

async function gh(path, init = {}) {
  const { repo, token } = cfg();
  const res = await fetch(`${API}/repos/${repo}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "everwind-site",
      ...(init.headers || {}),
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res;
}

/** 读文本文件，不存在返回 null */
async function getText(path) {
  const res = await gh(`/contents/${path}`, {
    headers: { Accept: "application/vnd.github.raw" },
  });
  return res ? await res.text() : null;
}

/** 读二进制文件，返回 { buffer, sha }，不存在返回 null */
async function getBinary(path) {
  const meta = await gh(`/contents/${path}`);
  if (!meta) return null;
  const res = await gh(`/contents/${path}`, {
    headers: { Accept: "application/vnd.github.raw" },
  });
  return { buffer: Buffer.from(await res.arrayBuffer()), sha: meta.sha };
}

/** base64 内容直接写入（图片也走这里），message 是这次提交的说明 */
async function putBase64(path, base64, message) {
  const existing = await gh(`/contents/${path}`);
  const body = { message, content: base64 };
  if (existing && existing.sha) body.sha = existing.sha;
  await gh(`/contents/${path}`, {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

/** 写文本 */
async function putText(path, text, message) {
  await putBase64(path, Buffer.from(text, "utf8").toString("base64"), message);
}

async function removeFile(path, message) {
  const existing = await gh(`/contents/${path}`);
  if (!existing) return;
  await gh(`/contents/${path}`, {
    method: "DELETE",
    body: JSON.stringify({ message, sha: existing.sha }),
    headers: { "Content-Type": "application/json" },
  });
}

/** 列出目录下的文件，返回 [{name}]，目录不存在返回 [] */
async function listDir(path) {
  const res = await gh(`/contents/${path}`);
  if (!res) return [];
  const items = await res.json();
  return Array.isArray(items) ? items.filter((x) => x.type === "file").map((x) => ({ name: x.name })) : [];
}

module.exports = { getText, getBinary, putBase64, putText, removeFile, listDir };
