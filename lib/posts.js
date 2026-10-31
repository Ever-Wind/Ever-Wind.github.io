// 文章文件的读写格式：YAML 头部 + Markdown 正文。
// 头部四行固定：title / date / private / tags
function oneLine(value) {
  return String(value == null ? "" : value).replace(/\r?\n/g, " ").trim();
}

function parseTags(value) {
  return String(value == null ? "" : value)
    .replace(/^\[|\]$/g, "")
    .split(/[,，]/)
    .map((t) => t.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean)
    .slice(0, 4);
}

function parsePost(fileName, raw) {
  const slug = fileName.replace(/\.md$/i, "");
  const text = String(raw || "");
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  const meta = {};
  let body = text;
  if (match) {
    for (const line of match[1].split(/\r?\n/)) {
      const idx = line.indexOf(":");
      if (idx < 0) continue;
      const key = line.slice(0, idx).trim();
      let value = line.slice(idx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      meta[key] = value;
    }
    body = match[2].replace(/^\r?\n/, "");
  }
  return {
    slug,
    title: meta.title || slug,
    date: meta.date || "",
    private: String(meta.private).toLowerCase() === "true",
    tags: parseTags(meta.tags),
    body,
  };
}

function buildPost(post) {
  return [
    "---",
    "title: " + oneLine(post.title),
    "date: " + oneLine(post.date),
    "private: " + (post.isPrivate ? "true" : "false"),
    "tags: " + oneLine(parseTags(post.tags).join(",")),
    "---",
    "",
    String(post.body || "").replace(/\r\n/g, "\n"),
  ].join("\n");
}

function isValidSlug(slug) {
  return typeof slug === "string" && /^[a-zA-Z0-9][a-zA-Z0-9-]{0,59}$/.test(slug);
}

module.exports = { parsePost, buildPost, isValidSlug, parseTags };
