// 统一的内容读取 + 20 秒缓存（避免每次刷新都把私有仓库读一遍）
const { getText, listDir } = require("./github");
const { parsePost } = require("./posts");

const TTL = 15000;
let cache = { at: 0, data: null };

function defaultSite() {
  return {
    name: "Ever-Wind",
    tagline: "hello everyone",
    now: "",
    links: [],
  };
}

async function loadAll(force) {
  if (!force && cache.data && Date.now() - cache.at < TTL) return cache.data;

  const siteRaw = await getText("site.json");
  let site = defaultSite();
  if (siteRaw) {
    try {
      const parsed = JSON.parse(siteRaw);
      site = {
        name: typeof parsed.name === "string" ? parsed.name : site.name,
        tagline: typeof parsed.tagline === "string" ? parsed.tagline : site.tagline,
        now: typeof parsed.now === "string" ? parsed.now : "",
        links: Array.isArray(parsed.links)
          ? parsed.links
              .filter((l) => l && typeof l.label === "string" && typeof l.href === "string")
              .map((l) => ({ label: l.label, href: l.href }))
          : [],
      };
    } catch (e) {
      // site.json 被写坏了也不至于整站打不开，先用默认文案
    }
  }

  const files = await listDir("posts");
  const posts = (
    await Promise.all(
      files.map(async (file) => {
        const raw = await getText("posts/" + file.name);
        return raw == null ? null : parsePost(file.name, raw);
      })
    )
  ).filter(Boolean);

  posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const data = { site, posts };
  cache = { at: Date.now(), data };
  return data;
}

function invalidate() {
  cache = { at: 0, data: null };
}

module.exports = { loadAll, invalidate };
