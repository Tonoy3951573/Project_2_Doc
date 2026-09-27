/* ==========================================================================
   app.js — rendering, routing, search, language + theme switching.
   ========================================================================== */
(function () {
  "use strict";

  var PART_ORDER = ["start", "foundations", "code", "runtime", "ops", "reference", "extended"];
  var WPM = { en: 220, bn: 160 };

  var el = {
    doc: document.getElementById("doc"),
    rail: document.getElementById("railInner"),
    sidebar: document.getElementById("sidebar"),
    sidebarInner: document.getElementById("sidebarInner"),
    pager: document.getElementById("pager"),
    foot: document.getElementById("foot"),
    progress: document.querySelector(".progress i"),
    toTop: null,
    palette: document.getElementById("palette"),
    paletteInput: document.getElementById("paletteInput"),
    paletteResults: document.getElementById("paletteResults"),
    scrim: document.getElementById("scrim")
  };

  var state = { lang: "en", theme: "dark", chapter: null, anchor: null, headings: [], hits: [], sel: 0 };

  /* ---------- language & theme ------------------------------------------- */

  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  function t(key) {
    var u = window.DOC_UI[state.lang] || window.DOC_UI.en;
    return u[key] != null ? u[key] : window.DOC_UI.en[key];
  }
  function tPart(key) {
    var u = window.DOC_UI[state.lang].part || window.DOC_UI.en.part;
    return u[key] || window.DOC_UI.en.part[key] || key;
  }

  function applyLangChrome() {
    document.documentElement.setAttribute("data-lang", state.lang);
    document.documentElement.lang = state.lang === "bn" ? "bn" : "en";
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n]"), function (n) {
      var v = t(n.getAttribute("data-i18n"));
      if (v) n.textContent = v;
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n-attr]"), function (n) {
      var spec = n.getAttribute("data-i18n-attr").split(":");
      var attr = spec[0], key = spec[1] || "placeholder";
      var v = t(key);
      if (v) n.setAttribute(attr, v.replace("{n}", DOC.chapters.length));
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-setlang]"), function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-setlang") === state.lang));
    });
    var ph = t("searchPlaceholder").replace("{n}", DOC.chapters.length);
    var si = document.getElementById("paletteInput");
    if (si) si.placeholder = ph;
    var st = document.getElementById("searchTrigger");
    if (st) st.querySelector("span").textContent = t("search");
    el.paletteInput.placeholder = ph;
  }

  function applyTheme() {
    document.documentElement.setAttribute("data-theme", state.theme);
  }

  /* ---------- routing ---------------------------------------------------- */

  function parseHash() {
    var h = (location.hash || "").replace(/^#\/?/, "");
    var parts = h.split("/").filter(Boolean);
    if (!parts.length) return { lang: state.lang, chapter: null, anchor: null };
    if (parts[0] === "en" || parts[0] === "bn") {
      return { lang: parts[0], chapter: parts[1] || null, anchor: parts[2] || null };
    }
    return { lang: state.lang, chapter: parts[0], anchor: parts[1] || null };
  }

  function findChapter(id) {
    for (var i = 0; i < DOC.chapters.length; i++) if (DOC.chapters[i].id === id) return DOC.chapters[i];
    return null;
  }

  function order() {
    var list = DOC.chapters.slice();
    list.forEach(function (c, i) { c._i = i; });
    return list;
  }

  /* ---------- sidebar ---------------------------------------------------- */

  function buildSidebar() {
    var lang = state.lang;
    var parts = [];
    PART_ORDER.forEach(function (p) {
      var items = order().filter(function (c) { return c.part === p; });
      if (items.length) parts.push({ key: p, items: items });
    });
    order().forEach(function (c) {
      if (parts.every(function (p) { return p.key !== c.part; })) parts.push({ key: c.part || "other", items: [c] });
    });

    el.sidebarInner.innerHTML =
      parts.map(function (p) {
        return '<div class="nav-part"><h2>' + DOC.esc(tPart(p.key)) + "</h2><ul class=\"nav-list\">" +
          p.items.map(function (c) {
            return '<li><a class="nav-link" href="#/' + lang + "/" + c.id + '" data-ch="' + c.id + '">' +
              '<span class="nav-num">' + DOC.esc(c.num) + "</span>" +
              '<span class="nav-label">' + DOC.esc(DOC.L(c.title, lang).replace(/[`*]/g, "")) +
              (c.ext ? '<span class="nav-ext">' + (lang === "bn" ? "সম্প্রসারিত" : "extended") + "</span>" : "") +
              "</span></a></li>";
          }).join("") + "</ul></div>";
      }).join("") +
      '<div class="sidebar-foot">' +
      '<a href="../ARCHITECTURE.md">' + DOC.esc(t("sourceDoc")) + " ↗</a>" +
      '<a href="../ARCHITECTURE_bn.md">' + DOC.esc(t("sourceDocBn")) + " ↗</a>" +
      '<a href="#/' + lang + "/overview" + '">' + DOC.esc(t("allChapters")) + "</a>" +
      "</div>";
  }

  /* ---------- chapter rendering ------------------------------------------ */

  function wordCount(ch, lang) {
    return DOC.plainLang(ch, lang).split(/\s+/).filter(Boolean).length;
  }

  function renderChapter(ch, anchor) {
    var lang = state.lang;
    var words = wordCount(ch, lang);
    var minutes = Math.max(1, Math.round(words / WPM[lang]));
    var h2 = (ch.blocks || []).filter(function (b) { return b.t === "h" && (b.lvl || 2) === 2; }).length;

    var meta = [
      '<span class="meta-item">' + clockIcon() + minutes + " " + DOC.esc(t("readingTime")) + "</span>",
      '<span class="meta-item">' + listIcon() + h2 + " " + DOC.esc(t("sections")) + "</span>",
      '<span class="meta-item">' + docIcon() + words.toLocaleString("en-US") + " " + DOC.esc(t("wordCount")) + "</span>",
      '<span class="meta-item">' + linkIcon() + '<a href="../ARCHITECTURE.md">' + DOC.esc(t("sourceDoc")) + " ↗</a>" +
      '<a href="../ARCHITECTURE_bn.md">' + DOC.esc(t("sourceDocBn")) + " ↗</a></span>"
    ].join("");

    el.doc.innerHTML =
      '<header class="doc-head">' +
      '<span class="eyebrow">' + DOC.esc(ch.num) + " · " + DOC.esc(tPart(ch.part)) + "</span>" +
      "<h1>" + DOC.md(lang, ch.title) + "</h1>" +
      (ch.lead ? '<p class="lead">' + DOC.md(lang, ch.lead) + "</p>" : "") +
      '<div class="meta">' + meta + "</div></header>" +
      DOC.renderAll(ch.blocks, lang);

    // in-page rail
    var hs = (ch.blocks || []).filter(function (b) { return b.t === "h" && (b.lvl || 2) <= 3; });
    state.headings = hs.map(function (b) { return { id: b.id || slug(DOC.L(b.text, state.lang)), lvl: b.lvl || 2, text: DOC.L(b.text, state.lang) }; });
    el.rail.innerHTML = state.headings.length
      ? "<h2>" + DOC.esc(t("onThisPage")) + '</h2><ul class="rail-list">' +
        state.headings.map(function (h) {
          return '<li><a class="lvl' + h.lvl + '" href="#/' + lang + "/" + ch.id + "/" + h.id + '" data-h="' + h.id + '">' +
            DOC.esc(h.text.replace(/`/g, "")) + "</a></li>";
        }).join("") + "</ul>"
      : "";

    renderPager(ch);
    renderFoot();

    el.doc.querySelectorAll(".copy").forEach(function (b) { b.textContent = t("copy"); });
    markActive(lang, ch.id);
  }

  function renderPager(ch) {
    var list = order();
    var i = list.indexOf(ch);
    var prev = list[i - 1], next = list[i + 1];
    function card(c, dir) {
      if (!c) return "<span></span>";
      return '<a class="' + dir + '" href="#/' + state.lang + "/" + c.id + '">' +
        '<span class="p-dir">' + DOC.esc(t(dir)) + "</span>" +
        '<span class="p-title">' + DOC.esc(c.num) + " · " + DOC.esc(DOC.L(c.title, state.lang).replace(/[`*]/g, "")) + "</span></a>";
    }
    el.pager.innerHTML = card(prev, "previous") + card(next, "next");
  }

  function renderFoot() {
    el.foot.innerHTML =
      '<div class="foot-links">' +
      '<a href="../ARCHITECTURE.md">' + DOC.esc(t("sourceDoc")) + " ↗</a>" +
      '<a href="../ARCHITECTURE_bn.md">' + DOC.esc(t("sourceDocBn")) + " ↗</a>" +
      '<button class="btn btn-ghost" id="printBtn" type="button">' + DOC.esc(t("legacy")) + "</button>" +
      "</div>" +
      "<p>" + DOC.md(state.lang, t("sourceNote")) + "</p>" +
      "<p>" + DOC.md(state.lang, t("provenanceText")) + "</p>";
    document.getElementById("printBtn").addEventListener("click", function () { window.print(); });
  }

  function markActive(lang, id) {
    el.sidebarInner.querySelectorAll(".nav-link").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-ch") === id);
    });
    var act = el.sidebarInner.querySelector(".nav-link.active");
    if (act && act.scrollIntoView) act.scrollIntoView({ block: "nearest" });
  }

  function slug(s) {
    return String(s).toLowerCase().replace(/[`*_~]/g, "").replace(/[^a-z0-9\u0980-\u09FF]+/g, "-").replace(/^-|-$/g, "") || "section";
  }

  /* ---------- navigation flow --------------------------------------------- */

  var lastId = null;

  function route(keepScroll) {
    var r = parseHash();
    var langChanged = r.lang !== state.lang;
    if (langChanged) {
      state.lang = r.lang;
      store("gk.lang", state.lang);
      applyLangChrome();
      buildSidebar();
      buildIndex();
    }

    var ch = findChapter(r.chapter) || findChapter("overview") || DOC.chapters[0];
    if (!ch) return;

    // give every heading an id so deep links always resolve
    (ch.blocks || []).forEach(function (b) {
      if (b.t === "h" && !b.id) b.id = slug(DOC.L(b.text, state.lang));
    });

    var sameChapter = lastId === ch.id;
    state.chapter = ch;
    state.anchor = r.anchor;
    renderChapter(ch, r.anchor);
    lastId = ch.id;
    document.title = documentTitle(ch);

    var y = keepScroll ? window.scrollY : 0;
    if (r.anchor) {
      var target = document.getElementById(r.anchor);
      if (target) requestAnimationFrame(function () { scrollToEl(target); });
      else window.scrollTo(0, y);
    } else {
      window.scrollTo(0, y);
    }
    closeDrawer();
    highlightAnchor(r.anchor);
  }

  function scrollToEl(target) {
    var top = target.getBoundingClientRect().top + window.scrollY - 84;
    window.scrollTo({ top: top, behavior: "smooth" });
  }

  function highlightAnchor(id) {
    el.rail.querySelectorAll("a").forEach(function (a) {
      a.classList.toggle("active", !!id && a.getAttribute("data-h") === id);
    });
  }

  /* ---------- scroll spy, progress, rail sync ---------------------------- */

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var pct = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      el.progress.style.width = (pct * 100).toFixed(2) + "%";
      if (el.toTop) el.toTop.classList.toggle("show", window.scrollY > 420);

      // rail sync: last heading above the fold wins
      var line = 110, current = null;
      for (var i = 0; i < state.headings.length; i++) {
        var node = document.getElementById(state.headings[i].id);
        if (node && node.getBoundingClientRect().top <= line) current = state.headings[i].id;
      }
      if (current) highlightAnchor(current);
    });
  }

  /* ---------- search ----------------------------------------------------- */

  function buildIndex() {
    var lang = state.lang;
    state.hits = [];
    order().forEach(function (ch) {
      var crumb = tPart(ch.part) + " › " + DOC.L(ch.title, lang);
      state.hits.push({
        ch: ch.id, anchor: null, crumb: crumb,
        title: ch.num + ". " + DOC.L(ch.title, lang),
        text: DOC.plainLang(ch.lead, lang), w: 6
      });
      var section = "";
      (ch.blocks || []).forEach(function (b) {
        if (b.t === "h") { section = DOC.L(b.text, lang); return; }
        var txt = DOC.plainLang(b, lang);
        if (!txt) return;
        state.hits.push({
          ch: ch.id,
          anchor: b.id || (b.t === "h" ? slug(section) : null),
          crumb: crumb + (section ? " › " + section.replace(/`/g, "") : ""),
          title: section ? section.replace(/`/g, "") : DOC.L(ch.title, lang),
          text: txt, w: 1
        });
      });
    });
  }

  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  function snippet(text, terms) {
    // Drop any angle brackets from the source first: the highlight tags are
    // inserted afterwards, so sanitising at the end would strip them again.
    var clean = text.replace(/[<>]/g, "");
    var low = clean.toLowerCase();
    var at = -1;
    for (var i = 0; i < terms.length; i++) {
      var p = low.indexOf(terms[i]);
      if (p >= 0 && (at < 0 || p < at)) at = p;
    }
    if (at < 0) at = 0;
    var start = Math.max(0, at - 60);
    var out = (start > 0 ? "…" : "") + clean.slice(start, start + 190);
    if (start + 190 < clean.length) out += "…";
    terms.forEach(function (term) {
      out = out.replace(new RegExp("(" + escRe(term) + ")", "gi"), "\u0001$1\u0002");
    });
    return out.replace(/\u0001/g, "<mark>").replace(/\u0002/g, "</mark>");
  }

  function search(q) {
    var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    var res = [];
    for (var i = 0; i < state.hits.length; i++) {
      var h = state.hits[i];
      var hay = (h.title + " " + h.crumb + " " + h.text).toLowerCase();
      var ok = true, score = 0;
      for (var k = 0; k < terms.length; k++) {
        var p = hay.indexOf(terms[k]);
        if (p < 0) { ok = false; break; }
        if (h.title.toLowerCase().indexOf(terms[k]) === 0) score += 40;
        else if (h.title.toLowerCase().indexOf(terms[k]) >= 0) score += 18;
        if (h.crumb.toLowerCase().indexOf(terms[k]) >= 0) score += 8;
        score += Math.min(12, (hay.split(terms[k]).length - 1));
      }
      if (ok) res.push({ h: h, score: score * h.w });
    }
    res.sort(function (a, b) { return b.score - a.score; });
    return res.slice(0, 24);
  }

  function openPalette() {
    el.palette.hidden = false;
    el.paletteInput.value = "";
    state.sel = 0;
    renderResults("");
    el.paletteInput.focus();
  }
  function closePalette() { el.palette.hidden = true; }

  function renderResults(q) {
    if (q.trim().length < 2) {
      el.paletteResults.innerHTML = '<div class="empty">' + DOC.esc(t("minChars")) + "</div>";
      return;
    }
    var res = search(q);
    if (!res.length) {
      el.paletteResults.innerHTML = '<div class="empty">' + DOC.esc(t("noResults")) + "</div>";
      return;
    }
    el.paletteResults.innerHTML = res.map(function (r, i) {
      var h = r.h;
      var url = "#/" + state.lang + "/" + h.ch + (h.anchor ? "/" + h.anchor : "");
      return '<a class="hit' + (i === state.sel ? " sel" : "") + '" href="' + url + '" data-i="' + i + '">' +
        '<span class="h-crumb">' + DOC.esc(h.crumb) + "</span>" +
        '<span class="h-title">' + DOC.md(state.lang, h.title) + "</span>" +
        '<span class="h-snip">' + snippet(h.text, q.toLowerCase().split(/\s+/).filter(Boolean)) + "</span></a>";
    }).join("");
  }

  function moveSel(d) {
    var items = el.paletteResults.querySelectorAll(".hit");
    if (!items.length) return;
    state.sel = (state.sel + d + items.length) % items.length;
    Array.prototype.forEach.call(items, function (n, i) { n.classList.toggle("sel", i === state.sel); });
    items[state.sel].scrollIntoView({ block: "nearest" });
  }

  /* ---------- drawer ----------------------------------------------------- */

  function openDrawer() { el.sidebar.classList.add("open"); el.scrim.hidden = false; document.getElementById("menuBtn").setAttribute("aria-expanded", "true"); }
  function closeDrawer() { el.sidebar.classList.remove("open"); el.scrim.hidden = true; document.getElementById("menuBtn").setAttribute("aria-expanded", "false"); }

  /* ---------- icons ------------------------------------------------------ */

  function clockIcon() { return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/></svg>'; }
  function listIcon() { return '<svg viewBox="0 0 24 24"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>'; }
  function docIcon() { return '<svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5"/></svg>'; }
  function linkIcon() { return '<svg viewBox="0 0 24 24"><path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 1 0-5.7-5.7L11.7 6.6"/><path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.6 2.6a4 4 0 1 0 5.7 5.7l1.4-1.4"/></svg>'; }
  function upIcon() { return '<svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg>'; }

  /* ---------- boot -------------------------------------------------------- */

  if (/(\?|&)debug\b/.test(location.search)) {
    // Development aid: surface load/render errors instead of failing silently.
    var box = document.createElement("pre");
    box.id = "errbox";
    box.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:99;max-height:45vh;overflow:auto;margin:0;padding:12px;background:#450a0a;color:#fecaca;font:12px/1.5 monospace;white-space:pre-wrap";
    document.addEventListener("error", function (e) {
      box.textContent += (e.message || e.error) + "\n" + (e.filename || "") + ":" + (e.lineno || "") + "\n";
    });
    window.addEventListener("unhandledrejection", function (e) { box.textContent += "rejection: " + e.reason + "\n"; });
    document.addEventListener("DOMContentLoaded", function () { document.body.appendChild(box); });
  }

  function boot() {
    state.lang = read("gk.lang") === "bn" ? "bn" : "en";
    state.theme = read("gk.theme") || "dark";
    applyTheme();
    applyLangChrome();
    buildSidebar();
    buildIndex();

    el.toTop = document.createElement("button");
    el.toTop.className = "to-top";
    el.toTop.type = "button";
    el.toTop.innerHTML = upIcon();
    el.toTop.setAttribute("aria-label", t("toTop"));
    el.toTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
    document.body.appendChild(el.toTop);

    window.addEventListener("hashchange", function () {
      var r = parseHash();
      var same = r.lang === state.lang && state.chapter && r.chapter === state.chapter.id;
      route(false);
      if (same) {
        var target = r.anchor && document.getElementById(r.anchor);
        if (target) scrollToEl(target);
      }
    });

    document.querySelectorAll("[data-setlang]").forEach(function (b) {
      b.addEventListener("click", function () {
        var l = b.getAttribute("data-setlang");
        if (l === state.lang) return;
        state.lang = l;
        store("gk.lang", l);
        applyLangChrome();
        buildSidebar();
        buildIndex();
        // route() renders the chapter and the title; the hash always changes
        // because its language segment changes with it.
        location.hash = "#/" + l + "/" + (state.chapter ? state.chapter.id : "overview");
        if (!state.chapter) route(false);
      });
    });

    document.getElementById("themeBtn").addEventListener("click", function () {
      state.theme = state.theme === "dark" ? "light" : "dark";
      store("gk.theme", state.theme);
      applyTheme();
    });

    document.getElementById("menuBtn").addEventListener("click", function () {
      el.sidebar.classList.contains("open") ? closeDrawer() : openDrawer();
    });
    el.scrim.addEventListener("click", closeDrawer);
    el.sidebar.addEventListener("click", function (e) {
      if (e.target.closest(".nav-link")) closeDrawer();
    });

    document.getElementById("searchTrigger").addEventListener("click", openPalette);
    document.getElementById("paletteClose").addEventListener("click", closePalette);
    el.palette.addEventListener("click", function (e) { if (e.target === el.palette) closePalette(); });
    el.paletteInput.addEventListener("input", function () { state.sel = 0; renderResults(el.paletteInput.value); });
    el.paletteInput.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); moveSel(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); moveSel(-1); }
      else if (e.key === "Enter") {
        var items = el.paletteResults.querySelectorAll(".hit");
        if (items[state.sel]) { location.hash = items[state.sel].getAttribute("href").slice(1); closePalette(); }
      }
    });

    document.addEventListener("keydown", function (e) {
      var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); openPalette(); return; }
      if (e.key === "/" && !typing) { e.preventDefault(); openPalette(); return; }
      if (e.key === "Escape") { closePalette(); return; }
    });

    document.addEventListener("click", function (e) {
      var btn = e.target.closest(".copy");
      if (!btn) return;
      var code = btn.parentElement.querySelector("code");
      if (!code) return;
      var text = code.textContent;
      var done = function () {
        btn.textContent = t("copied");
        setTimeout(function () { btn.textContent = t("copy"); }, 1400);
      };
      // A hidden iframe, a file:// origin or a denied permission all make the
      // async clipboard fail, so fall back to the old synchronous path rather
      // than leaving the button looking inert.
      var fallback = function () {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.cssText = "position:fixed;top:-1000px;opacity:0";
        document.body.appendChild(ta);
        ta.select();
        var copied = false;
        try { copied = document.execCommand("copy"); } catch (err) { copied = false; }
        document.body.removeChild(ta);
        if (copied) done();
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, fallback);
      } else {
        fallback();
      }
    });

    // client-side links to headings that may not exist yet get fixed up here
    document.addEventListener("click", function (e) {
      var a = e.target.closest("a[href^='#/']");
      if (!a) return;
      var href = a.getAttribute("href");
      var m = href.match(/^#\/(en|bn)\/([\w-]+)(?:\/([\w-]+))?$/);
      if (!m) return;
      e.preventDefault();
      if (m[1] !== state.lang) { state.lang = m[1]; store("gk.lang", m[1]); applyLangChrome(); buildSidebar(); buildIndex(); }
      location.hash = href.slice(1);
    });

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    if (!location.hash) location.replace("#/" + state.lang + "/overview");
    route(false);
    document.title = documentTitle(state.chapter);
  }

  function documentTitle(ch) {
    return (ch ? DOC.L(ch.title, state.lang) + " — " : "") + "GateKeeper docs";
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
