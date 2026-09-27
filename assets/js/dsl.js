/* ==========================================================================
   dsl.js — a tiny content DSL plus its renderer.
   Content files call DOC.register({ ... }) at parse time; app.js renders
   whatever is registered. Classic scripts (no ES modules) so the site also
   works when opened straight from the filesystem.
   ========================================================================== */
(function (global) {
  "use strict";

  var chapters = [];

  /* ---------- text helpers ---------------------------------------------- */

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** Resolve a {en,bn} (or plain string, or array) value for one language. */
  function L(x, lang) {
    // Content is authored as flat {en, bn} pairs; a value that is itself a pair
    // (easy to create when merging drafts) is unwrapped rather than handed back
    // to a caller that expects text.
    while (x != null && typeof x === "object" && !Array.isArray(x) &&
           (x[lang] != null || x.en != null || x.bn != null)) {
      x = x[lang] != null ? x[lang] : x.en != null ? x.en : x.bn;
    }
    if (x == null) return "";
    if (Array.isArray(x)) return x.map(function (v) { return L(v, lang); }).join(" ");
    if (typeof x === "object") {
      if (x[lang] != null) return L(x[lang], lang);
      return x.en != null ? L(x.en, lang) : x.bn != null ? L(x.bn, lang) : "";
    }
    return String(x);
  }

  /** Remove the inline markdown that carries no meaning as plain text. */
  function strip(s) {
    return String(s)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
      .replace(/[`*_~]/g, "");
  }

  /** Strip markup down to readable plain text (both languages concatenated). */
  function plain(x) {
    if (x == null) return "";
    if (Array.isArray(x)) return x.map(plain).join(" ");
    if (typeof x === "object") {
      if (x.en != null && x.bn != null) return plain(x.en) + " " + plain(x.bn);
      if (x.en != null) return plain(x.en);
      if (x.bn != null) return plain(x.bn);
      return "";
    }
    return strip(x).replace(/\s+/g, " ").trim();
  }

  /* Structural block fields: never prose, so never counted or indexed. */
  var NOT_PROSE = {
    t: 1, id: 1, cls: 1, kind: 1, lvl: 1, num: 1, tone: 1, primary: 1, part: 1,
    ext: 1, only: 1, ordered: 1, hr: 1, lead: 1, words: 1
  };

  /**
   * Plain text of an arbitrary value tree (a whole block, a chapter) in one
   * language. Used for reading time, word counts and the search index, so
   * those never mix the two languages together.
   */
  function plainLang(x, lang) {
    var out = [];
    (function walk(v) {
      if (v == null) return;
      if (Array.isArray(v)) { v.forEach(walk); return; }
      if (typeof v === "object") {
        if (v[lang] != null) return walk(v[lang]);
        if (v.en != null) return walk(v.en);
        if (v.bn != null) return walk(v.bn);
        Object.keys(v).forEach(function (k) { if (!NOT_PROSE[k]) walk(v[k]); });
        return;
      }
      out.push(strip(String(v)));
    })(x);
    return out.join(" ").replace(/\s+/g, " ").trim();
  }

  /* ---------- inline markdown (safe: everything is escaped first) -------- */

  /**
   * Resolve a link target for one language. An href may be a bare string
   * ("#/en/limiting") or an {en, bn} pair; the language segment is always
   * rewritten to the language actually being rendered, so a cross-reference
   * never silently drops the reader into the other language.
   */
  function hrefFor(href, lang) {
    var s = L(href, lang);
    var m = /^#\/(en|bn)\//.exec(s);
    // m[0] is "#/en/": everything after it is the bare route, so the language
    // segment has to be rebuilt with its own trailing slash.
    return m ? "#/" + lang + "/" + s.slice(m[0].length) : s;
  }

  function link(href, lang) {
    var target = hrefFor(href, lang);
    var external = /^https?:/i.test(target);
    return '<a href="' + esc(target) + '"' + (external ? ' target="_blank" rel="noopener"' : "") + ">";
  }

  function md(src) {
    var text = L(src, md.lang || "en");
    // Code spans are lifted out before emphasis is applied, so **bold** and
    // *italic* can wrap a code span instead of being split by it. They are
    // escaped too, which the previous per-chunk version did not do.
    var codes = [];
    var out = "";
    text.split("`").forEach(function (chunk, i) {
      if (i % 2 === 1) {
        codes.push(esc(chunk));
        out += "\u0000" + (codes.length - 1) + "\u0000";
        return;
      }
      out += esc(chunk);
    });
    out = out
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>")
      .replace(/~~([^~]+)~~/g, "<del>$1</del>")
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, label, href) {
        return link(href, md.lang || "en") + label + "</a>";
      });
    return out.replace(/\u0000(\d+)\u0000/g, function (_, n) { return "<code>" + codes[n] + "</code>"; });
  }

  function mdIn(lang, src) {
    var prev = md.lang;
    md.lang = lang;
    try { return md(src); } finally { md.lang = prev; }
  }

  /* ---------- callout icons ---------------------------------------------- */

  var ICON = {
    note: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
    key: '<svg viewBox="0 0 24 24"><circle cx="8" cy="12" r="4"/><path d="M12 12h9M17 12v3M20 12v2"/></svg>',
    tip: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 1 3.5 10.9c-.6.5-1 1.1-1.1 1.8l-.1.3H9.7l-.1-.3c-.1-.7-.5-1.3-1.1-1.8A6 6 0 0 1 12 3Z"/></svg>',
    warn: '<svg viewBox="0 0 24 24"><path d="M12 4.5 21 19.5H3L12 4.5Z"/><path d="M12 10v4M12 17h.01"/></svg>',
    danger: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5M12 16h.01"/></svg>'
  };

  var KIND_CLASS = {
    note: "callout-note", key: "callout-key", tip: "callout-tip",
    warn: "callout-warn", danger: "callout-danger"
  };

  var DEFAULT_CALLOUT_TITLE = {
    note: { en: "Note", bn: "লক্ষ্য করুন" },
    key: { en: "Key idea", bn: "মূল ধারণা" },
    tip: { en: "Tip", bn: "টিপ" },
    warn: { en: "Watch out", bn: "সতর্কতা" },
    danger: { en: "Important", bn: "গুরুত্বপূর্ণ" }
  };

  /* ---------- block renderers -------------------------------------------- */

  function cell(v, lang) { return mdIn(lang, v); }

  var R = {
    h: function (b, lang) {
      var lvl = b.lvl || 2;
      var id = b.id ? ' id="' + esc(b.id) + '"' : "";
      var cls = b.cls ? ' class="' + esc(b.cls) + '"' : "";
      return "<h" + lvl + id + cls + ">" + mdIn(lang, b.text) + "</h" + lvl + ">";
    },

    p: function (b, lang) {
      // A blank line inside a leaf means the Bengali side merged two source
      // paragraphs; render them as paragraphs rather than running them together.
      return String(L(b.text, lang))
        .split(/\n{2,}/)
        .filter(function (s) { return s.trim(); })
        .map(function (s) {
          return "<p" + (b.cls ? ' class="' + esc(b.cls) + '"' : "") + ">" + mdIn(lang, s) + "</p>";
        })
        .join("");
    },

    ul: function (b, lang) {
      return list(b, lang, "ul");
    },
    ol: function (b, lang) { return list(b, lang, "ol"); },

    table: function (b, lang) {
      var head = (b.head || []).map(function (c) {
        return "<th>" + cell(c, lang) + "</th>";
      }).join("");
      var body = (b.rows || []).map(function (row) {
        return "<tr>" + row.map(function (c) {
          var cls = "";
          if (c && typeof c === "object" && !Array.isArray(c) && c.num) cls = ' class="num"';
          return "<td" + cls + ">" + cell(c, lang) + "</td>";
        }).join("") + "</tr>";
      }).join("");
      var cap = b.caption ? '<p class="caption">' + mdIn(lang, b.caption) + "</p>" : "";
      return '<div class="table-wrap"><div class="table-scroll"><table><thead><tr>' + head +
        "</tr></thead><tbody>" + body + "</tbody></table></div></div>" + cap;
    },

    code: function (b, lang) {
      var cls = b.cls ? " " + b.cls : "";
      return '<pre class="' + cls.trim() + '"><code>' + esc(L(b.text, lang)) +
        '</code><button class="copy" type="button" data-copy></button></pre>';
    },

    ascii: function (b, lang) {
      return '<pre class="ascii"><code>' + esc(L(b.text, lang)) +
        '</code><button class="copy" type="button" data-copy></button></pre>' +
        (b.caption ? '<p class="caption">' + mdIn(lang, b.caption) + "</p>" : "");
    },

    callout: function (b, lang) {
      var kind = KIND_CLASS[b.kind] ? b.kind : "note";
      var title = b.title != null ? L(b.title, lang) : L(DEFAULT_CALLOUT_TITLE[b.kind] || DEFAULT_CALLOUT_TITLE.note, lang);
      var inner = "";
      if (b.text != null) inner += "<p>" + mdIn(lang, b.text) + "</p>";
      if (b.items) inner += list({ items: b.items }, lang, b.ordered ? "ol" : "ul");
      return '<aside class="callout ' + KIND_CLASS[kind] + '"><p class="c-title">' + ICON[kind] +
        "<span>" + esc(title) + "</span></p>" + inner + "</aside>";
    },

    kv: function (b, lang) {
      var rows = (b.items || []).map(function (it) {
        var k = it.k != null ? mdIn(lang, it.k) : "";
        var v = it.v != null ? mdIn(lang, it.v) : "";
        var sub = it.sub ? '<div class="kv-sub">' + mdIn(lang, it.sub) + "</div>" : "";
        return "<dt>" + k + "</dt><dd>" + v + sub + "</dd>";
      }).join("");
      return '<dl class="kv">' + rows + "</dl>";
    },

    steps: function (b, lang) {
      var items = (b.items || []).map(function (it) {
        var title = it.title != null ? '<span class="s-title">' + mdIn(lang, it.title) + "</span>" : "";
        var body = it.text != null ? '<div class="s-text">' + mdIn(lang, it.text) + "</div>" : "";
        var sub = it.items ? list({ items: it.items }, lang, it.ordered ? "ol" : "ul") : "";
        return "<li>" + title + body + sub + "</li>";
      }).join("");
      return '<ol class="steps">' + items + "</ol>";
    },

    cards: function (b, lang) {
      var items = (b.items || []).map(function (it) {
        var k = it.k != null ? '<div class="card-k">' + mdIn(lang, it.k) + "</div>" : "";
        var h = it.title != null ? "<h4>" + mdIn(lang, it.title) + "</h4>" : "";
        var p = it.text != null ? "<p>" + mdIn(lang, it.text) + "</p>" : "";
        return '<div class="card">' + k + h + p + "</div>";
      }).join("");
      return '<div class="card-grid">' + items + "</div>";
    },

    stats: function (b, lang) {
      var items = (b.items || []).map(function (it) {
        var tone = it.tone ? " s-" + it.tone : "";
        return '<div class="stat' + tone + '"><span class="v">' + esc(L(it.v, lang)) +
          '</span><span class="l">' + mdIn(lang, it.l) + "</span></div>";
      }).join("");
      return '<div class="stat-row">' + items + "</div>";
    },

    /* Auto-generated navigation blocks. */
    toc: function (b, lang) {
      var list = chapters.filter(function (c) { return matches(c, b); });
      return '<div class="chapter-grid">' + list.map(function (c) {
        return chapterCard(c, lang, b);
      }).join("") + "</div>";
    },

    hero: function (b, lang) {
      var actions = (b.actions || []).map(function (it) {
        var cls = it.primary ? "btn btn-primary" : "btn btn-ghost";
        return '<a class="' + cls + '" href="' + esc(hrefFor(it.href || "#", lang)) + '">' + esc(L(it.label, lang)) + "</a>";
      }).join("");
      return '<section class="hero">' +
        (b.kicker ? '<span class="eyebrow">' + esc(L(b.kicker, lang)) + "</span>" : "") +
        "<h2>" + esc(L(b.title, lang)) + "</h2>" +
        (b.text ? "<p>" + mdIn(lang, b.text) + "</p>" : "") +
        '<div class="hero-actions">' + actions + "</div></section>";
    },

    buttons: function (b, lang) {
      return '<div class="hero-actions">' + (b.items || []).map(function (it) {
        var cls = it.primary ? "btn btn-primary" : "btn btn-ghost";
        return '<a class="' + cls + '" href="' + esc(hrefFor(it.href || "#", lang)) + '">' + esc(L(it.label, lang)) + "</a>";
      }).join("") + "</div>";
    },

    spacer: function (b) { return b.hr ? "<hr>" : ""; }
  };

  function matches(c, b) {
    if (b.part) return c.part === b.part;
    if (b.only) return b.only.indexOf(c.id) >= 0;
    return true;
  }

  function chapterCard(c, lang, b) {
    var badge = c.ext
      ? '<span class="c-badge">' + esc(lang === "bn" ? "সম্প্রসারিত" : "extended") + "</span>"
      : "";
    return '<a class="chapter-card" href="#/' + lang + "/" + c.id + '">' +
      '<span class="c-num">' + esc(c.num) + "</span>" +
      '<span class="c-title">' + mdIn(lang, c.title) + "</span>" +
      (b.lead === false ? "" : '<span class="c-desc">' + esc(shorten(plain(L(c.lead, lang)), b.words || 190)) + "</span>") +
      badge + "</a>";
  }

  function shorten(s, n) {
    s = String(s).replace(/\s+/g, " ").trim();
    if (s.length <= n) return s;
    var cut = s.slice(0, n);
    var sp = cut.lastIndexOf(" ");
    return cut.slice(0, sp > n * 0.6 ? sp : n).trim() + "…";
  }

  function list(b, lang, tag) {
    var items = (b.items || []).map(function (it) {
      if (it && typeof it === "object" && !Array.isArray(it) && it.text != null) {
        var sub = it.sub ? list({ items: it.sub }, lang, "ul") : "";
        return "<li>" + mdIn(lang, it.text) + sub + "</li>";
      }
      return "<li>" + mdIn(lang, it) + "</li>";
    }).join("");
    return "<" + tag + ">" + items + "</" + tag + ">";
  }

  /* ---------- public surface --------------------------------------------- */

  global.DOC = {
    chapters: chapters,
    register: function (ch) { chapters.push(ch); return ch; },
    render: function (block, lang) {
      var fn = R[block.t];
      if (!fn) throw new Error("DOC: unknown block type " + JSON.stringify(block.t));
      return fn(block, lang);
    },
    renderAll: function (blocks, lang) {
      return (blocks || []).map(function (b) { return DOC.render(b, lang); }).join("\n");
    },
    esc: esc,
    L: L,
    plain: plain,
    plainLang: plainLang,
    md: mdIn,
    shorten: shorten
  };
})(window);
