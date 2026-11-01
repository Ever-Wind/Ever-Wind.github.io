// 一个极简的 Markdown 渲染器，首页和后台预览共用。只用浏览器 API，没有依赖。
// 支持：# 标题、**粗体**、*斜体*、`代码`、[链接](地址)、- 列表、空行分段。
(function () {
  function escapeHtml(text) {
    return String(text).replace(/[&<>"]/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch];
    });
  }

  function inline(text) {
    return text
      .replace(
        /!\[([^\]]*)\]\(((?:https?:\/\/|\/)[^\s)]+)\)/g,
        '<img src="$2" alt="$1" loading="lazy">'
      )
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  }

  window.renderMarkdown = function (source) {
    var lines = escapeHtml(source || "").split(/\r?\n/);
    var html = [];
    var para = [];
    var list = null;

    function flushPara() {
      if (para.length) {
        // 单行回车也算换行：每行单独渲染，用 <br> 连起来，只有空行才分段
        html.push("<p>" + para.map(inline).join("<br>") + "</p>");
        para = [];
      }
    }
    function flushList() {
      if (list) {
        html.push("<ul>" + list.join("") + "</ul>");
        list = null;
      }
    }

    lines.forEach(function (raw) {
      var line = raw.trim();
      if (!line) {
        flushPara();
        flushList();
        return;
      }
      var heading = /^(#{1,4})\s+(.*)$/.exec(line);
      if (heading) {
        flushPara();
        flushList();
        var level = heading[1].length + 1;
        html.push("<h" + level + ">" + inline(heading[2]) + "</h" + level + ">");
        return;
      }
      var item = /^[-*]\s+(.*)$/.exec(line);
      if (item) {
        flushPara();
        if (!list) list = [];
        list.push("<li>" + inline(item[1]) + "</li>");
        return;
      }
      flushList();
      para.push(line);
    });

    flushPara();
    flushList();
    return html.join("\n");
  };
})();
