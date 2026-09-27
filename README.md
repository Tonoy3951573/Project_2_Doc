# GateKeeper documentation site

A static, bilingual (English / বাংলা) documentation website for
[`../ARCHITECTURE.md`](../ARCHITECTURE.md) — the 2,017-line description of the
GateKeeper JavaFX rate-limiting and abuse-detection simulator.

Everything is plain HTML, CSS and classic JavaScript. There is no build step, no
package manager and no network dependency: open the page and it works.

## Running it

Either open `index.html` directly in a browser:

```
xdg-open site/index.html
```

or serve the repository root, which is what you want if you want the
"Original ARCHITECTURE.md" links to resolve:

```
cd /home/phi/Project_DOC
python3 -m http.server 8123
# then open http://127.0.0.1:8123/site/
```

Both work. The site was verified over HTTP and from a `file://` URL.

## What is here

```
site/
  index.html              the shell: header, sidebar, article, rail, search palette
  assets/css/site.css     all styling, both themes, responsive rules, print rules
  assets/js/i18n.js       shell strings in English and Bengali
  assets/js/dsl.js        the content DSL: text resolution and block renderers
  assets/js/app.js        routing, search, navigation, theme and language state
  assets/js/chapters/     the content: 11 files, 34 chapters
  assets/img/favicon.svg
tools/                    validators and previews (see below)
```

### Content model

Each chapter is registered once by `DOC.register()` in
`assets/js/chapters/*.js`, and every reader-facing string is an `{en, bn}` pair:

```js
DOC.register({
  id: "limiting",
  num: "6",
  part: "foundations",
  title: { en: "How rate limiting works", bn: "রেট লিমিটিং কীভাবে কাজ করে" },
  lead:  { en: "…", bn: "…" },
  blocks: [
    { t: "h", lvl: 2, id: "window-edges", text: { en: "…", bn: "…" } },
    { t: "p", text: { en: "…", bn: "…" } },
    { t: "ascii", text: "evaluate(client, type, requests):\n  1. …" },
    { t: "table", head: [...], rows: [[...]] }
  ]
});
```

Rules the content follows, all checked by the validator:

- A prose leaf is either plain text (language-neutral: code, class names, a
  string quoted from the FXML) or a **flat** `{en, bn}` pair. Never a pair
  inside a pair — `tools/flatten_pairs.py` removes those if they appear.
- Cross-references are written in the language of the text they sit in:
  `[#10 · Field reference](#/en/controller)` in English,
  `[অধ্যায় ১০ · ফিল্ড রেফারেন্স](#/bn/controller)` in Bengali. `hrefFor()` in
  `dsl.js` also rewrites the language segment, so a stale target cannot drop a
  reader into the other language.
- `part` is one of `start`, `foundations`, `code`, `runtime`, `ops`,
  `reference`, `extended`; it decides the sidebar group. `ext: true` adds the
  *extended* badge, used only by Appendices C–J, which are additions written
  for this site rather than restatements of the source document.

### Adding or editing a chapter

1. Put the chapter in the file that covers its topic (the file name is a rough
   guide: `02-engine.js` holds chapters 6 and 7, and so on).
2. Write both languages for every prose leaf.
3. Run the validators below.

## Tools

All of them need a server on port 8123 (`python3 -m http.server 8123` from the
repository root); the two Python ones start one themselves if needed.

| Command | What it checks |
| --- | --- |
| `python3 tools/lint_js.py site/assets/js/*.js site/assets/js/chapters/*.js` | Brackets, strings, template literals and regex literals in every script |
| `open http://127.0.0.1:8123/tools/check-chapters.html` | 34 chapters registered once, both languages present, every cross-reference and anchor resolving, no generation leftovers |
| `python3 tools/run_ui_test.py` | 69 functional checks in headless Chrome: routing, language switch, search, theme, anchors, copy buttons, mobile drawer, all 34 chapters in both languages |
| `open http://127.0.0.1:8123/tools/dump-chapter.html?id=faq&lang=bn` | One chapter as plain text, for proofreading a translation |
| `open http://127.0.0.1:8123/tools/syn.html` | Every content file loads and parses |
| `python3 tools/flatten_pairs.py --check` | Reports nested `{en:{en,bn}}` leaves; without `--check` it rewrites the files |

Last run: lint clean on 14 scripts, 34 chapters / 607 blocks / 57 tables with
zero validator errors, and 69/69 UI checks passing.

## Provenance

The Java sources described in the documentation are **not** part of this
repository — only `ARCHITECTURE.md` is. Every code listing, line count, colour
value and benchmark figure on the site is quoted from that document rather than
re-derived from code. Where the site adds analysis of its own (for example the
measured contrast ratios in Appendix D), the chapter says so and shows how the
number was obtained. Appendices C to J are marked as extensions; chapters 1–23
and Appendices A–B restate the source document.
# Project_2_Doc
