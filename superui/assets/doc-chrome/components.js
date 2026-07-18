/* components.js — the SINGLE runtime for every generated documentation sheet.
   Classic (non-module) script, file://-safe, zero dependencies. Copied verbatim
   into the output dir; every shell loads it via <script src> right after
   opening <body>, before <ds-sheet> and the *.data.js registrations, so:
     - document.body already exists when this file's top-level code runs
       (the dark-toggle block below), even though the body's own children are
       not parsed yet.
     - the custom elements defined here are registered before the parser
       reaches <ds-sheet> / <ds-demo>, so they upgrade synchronously wherever
       they appear (initial parse or later innerHTML injection).
     - none of that data has loaded yet when <ds-sheet>/<ds-demo> are first
       upgraded, so every element defers its OWN rendering to
       DOMContentLoaded — data <script src> order relative to the elements
       never matters.

   Schema this file renders: superui/references/preview-data-format.md
   (window.SUPERUI_DATA["<kind>:<slug>"] -> sheet object -> sections[]).

   Chrome class inventory (all defined in docs.css — do not invent others;
   adding one is a coordinated edit of both this file and docs.css):
     layout ......... .section  .section-sub  h2/h3 inside .section
     card grids ..... .card-grid  .card  .token-card  .token-demo  .token-name
                      .token-value  .token-var  .token-usage
     color swatches . .swatch (block, token card)  .swatch-inline (chip, in a
                      table cell / list item / sentence)  .swatch-strip
                      (ordered set; one plain child per step)
     typography ..... .type-row  .type-name  .type-specs  .type-usage  .type-render
     example frame .. .frame  .frame-grid  .frame-rows   (dashed matrix/pattern box)
     previews ....... .preview   (token-consuming area; never carries .dark —
                      the toggle flips it on <html> and it inherits)
     tables ......... .table-wrap  .props-table  .muted
     do's/don'ts .... .dos-donts  .do-card  .dont-card  .dd-title
     anatomy ........ .anatomy-notes
     misc ........... .needs-input  hr.rule  .dark-toggle

   Color rule: a color value is never text alone — every place a color is
   rendered carries the color itself via .swatch / .swatch-inline /
   .swatch-strip, painted with background: var(--token-name). See
   preview-data-format.md for the full rule (varName has no leading --).
*/
(function () {
  "use strict";

  /* ---------- dark toggle (single source — no other file carries this) ----------
     Runs immediately, not deferred: applying .dark before the rest of the
     document paints avoids a flash of the wrong theme. Only when the shell
     opts in via <body data-dark-toggle> (build_sheets.py / build_index.py
     emit that attribute only when tokens.css declares real .dark overrides). */
  if (document.body && document.body.dataset.darkToggle !== undefined) {
    try {
      if (window.localStorage.getItem("superui-docs-theme") === "dark") {
        document.documentElement.classList.add("dark");
      }
    } catch (e) {
      /* localStorage unavailable (e.g. file:// with storage disabled) — no theme persistence, no crash */
    }
    var toggleBtn = document.createElement("button");
    toggleBtn.className = "dark-toggle";
    toggleBtn.setAttribute("aria-label", "Toggle dark mode");
    toggleBtn.addEventListener("click", function () {
      var dark = document.documentElement.classList.toggle("dark");
      try {
        window.localStorage.setItem("superui-docs-theme", dark ? "dark" : "light");
      } catch (e) {
        /* no persistence available — the toggle still works for this page view */
      }
    });
    document.body.appendChild(toggleBtn);
  }

  /* ---------- shared helpers ---------- */

  function whenReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  function el(tag, className) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function text(tag, className, content) {
    var node = el(tag, className);
    node.textContent = content;
    return node;
  }

  function cssVar(varName) {
    return "var(--" + varName + ")";
  }

  function lookup(key) {
    var data = window.SUPERUI_DATA || {};
    return data[key];
  }

  function needsInputNote(message, synthesized) {
    return text("p", "needs-input", (synthesized ? "> SYNTHESIZED: " : "> NEEDS INPUT: ") + message);
  }

  function warnUnknown(kind, value) {
    console.warn("components.js: unknown " + kind + " -> ", value);
  }

  /* ---------- <ds-swatch name kind> — reusable color chip/block ----------
     A color is always a token varName, never a literal (see preview-data-format.md);
     this element is the one place that turns a varName into a painted swatch, so
     both the section renderers below and raw markup (composition / prose html)
     authored by html-visualizer can reuse it via <ds-swatch name="..."></ds-swatch>. */
  class DsSwatch extends HTMLElement {
    connectedCallback() {
      whenReady(this.render.bind(this));
    }
    render() {
      var name = this.getAttribute("name");
      var kind = this.getAttribute("kind") || "block"; // block | inline | strip-step
      if (kind === "inline") {
        this.classList.add("swatch-inline");
      } else if (kind !== "strip-step") {
        // strip-step: no class of its own — it is a direct child of a parent
        // carrying .swatch-strip, which supplies the sizing (docs.css: "each
        // direct child is one step and needs only its background var()").
        this.classList.add("swatch");
      }
      if (name) this.style.background = cssVar(name);
    }
  }
  customElements.define("ds-swatch", DsSwatch);

  /* ---------- token-grid rendering (foundation sheets, per-item live sample) ---------- */

  function renderTokenCard(item) {
    var card = el("div", "token-card");
    var render = item.render || "none";
    if (render === "color") {
      var swatch = document.createElement("ds-swatch");
      if (item.varName) swatch.setAttribute("name", item.varName);
      card.appendChild(swatch);
    } else if (render !== "none") {
      var demo = el("div", "token-demo");
      var vname = item.varName;
      if (render === "type") {
        var sample = text("span", "type-render", "Ag");
        if (vname) {
          // A composite typography token has no single CSS property — set every
          // candidate at once; the browser applies whichever is valid for the
          // var's actual value and silently ignores the rest (guaranteed-invalid
          // custom-property fallback), so this is safe for a family, size or weight var alike.
          sample.style.fontFamily = cssVar(vname);
          sample.style.fontSize = cssVar(vname);
          sample.style.fontWeight = cssVar(vname);
        }
        demo.appendChild(sample);
      } else if (render === "spacing") {
        var bar = el("span");
        bar.style.display = "block";
        bar.style.height = "12px";
        bar.style.background = "var(--doc-accent)";
        if (vname) bar.style.width = cssVar(vname);
        demo.appendChild(bar);
      } else if (render === "radius") {
        var rBlock = el("span");
        rBlock.style.display = "block";
        rBlock.style.width = "56px";
        rBlock.style.height = "56px";
        rBlock.style.background = "var(--doc-fill)";
        if (vname) rBlock.style.borderRadius = cssVar(vname);
        demo.appendChild(rBlock);
      } else if (render === "shadow") {
        var sBlock = el("span");
        sBlock.style.display = "block";
        sBlock.style.width = "56px";
        sBlock.style.height = "56px";
        sBlock.style.background = "var(--doc-sheet)";
        if (vname) sBlock.style.boxShadow = cssVar(vname);
        demo.appendChild(sBlock);
      } else if (render === "opacity") {
        var oBlock = el("span");
        oBlock.style.display = "block";
        oBlock.style.width = "56px";
        oBlock.style.height = "56px";
        oBlock.style.background = "var(--doc-accent)";
        if (vname) oBlock.style.opacity = cssVar(vname);
        demo.appendChild(oBlock);
      } else if (render === "motion") {
        var mDot = el("span");
        mDot.style.display = "block";
        mDot.style.width = "16px";
        mDot.style.height = "16px";
        mDot.style.borderRadius = "50%";
        mDot.style.background = "var(--doc-accent)";
        if (vname) mDot.style.transitionDuration = cssVar(vname);
        demo.appendChild(mDot);
      } else {
        warnUnknown("token-grid render", render);
      }
      card.appendChild(demo);
    }
    card.appendChild(text("p", "token-name", item.name || ""));
    if (item.value) card.appendChild(text("p", "token-value", item.value));
    if (item.varName) card.appendChild(text("p", "token-var", "--" + item.varName));
    if (item.usage) card.appendChild(text("p", "token-usage", item.usage));
    return card;
  }

  function renderTokenGrid(section) {
    var grid = el("div", "card-grid");
    (section.items || []).forEach(function (item) {
      grid.appendChild(renderTokenCard(item));
    });
    return [grid];
  }

  /* ---------- prose ---------- */

  function renderProse(section) {
    var wrap = el("div");
    wrap.innerHTML = section.html || "";
    return [wrap];
  }

  /* ---------- state-matrix (from the sheet's OWN demo) ---------- */

  function renderStateMatrix(section, demo) {
    var frame = el("div", "frame");
    var rows = el("div", "frame-rows");
    var variants = section.variants || [];
    var states = section.states || [];
    if (!demo) {
      frame.appendChild(needsInputNote("no demo markup on this sheet"));
      return [frame];
    }
    variants.forEach(function (v) {
      var row = el("div", "frame-grid");
      states.forEach(function (s) {
        var cell = el("div");
        var entry = demo.variants && demo.variants[v] && demo.variants[v].states && demo.variants[v].states[s];
        if (entry && entry.markup) {
          var mount = el("div");
          mount.innerHTML = entry.markup;
          cell.appendChild(mount);
        } else {
          cell.appendChild(needsInputNote("no demo for " + v + " / " + s));
        }
        row.appendChild(cell);
      });
      rows.appendChild(row);
    });
    frame.appendChild(rows);
    return [frame];
  }

  /* ---------- anatomy ---------- */

  function renderAnatomy(section) {
    var list = el("ul", "anatomy-notes");
    (section.items || []).forEach(function (item) {
      var li = el("li");
      if (typeof item === "string") {
        li.textContent = item;
      } else {
        var strong = document.createElement("strong");
        strong.textContent = item.label || "";
        li.appendChild(strong);
        li.appendChild(document.createTextNode(item.note ? " — " + item.note : ""));
      }
      list.appendChild(li);
    });
    return [list];
  }

  /* ---------- props-table ---------- */

  function renderPropsTable(section) {
    var wrap = el("div", "table-wrap");
    var table = el("table", "props-table");
    var thead = el("thead");
    var headRow = el("tr");
    (section.columns || []).forEach(function (col) {
      headRow.appendChild(text("th", null, col));
    });
    thead.appendChild(headRow);
    table.appendChild(thead);
    var tbody = el("tbody");
    (section.rows || []).forEach(function (row) {
      var tr = el("tr");
      row.forEach(function (cell) {
        tr.appendChild(text("td", null, cell));
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    return [wrap];
  }

  /* ---------- dos-donts ---------- */

  function dosDontsCard(className, titleClass, title, items) {
    var card = el("div", className);
    card.appendChild(text("p", "dd-title", title));
    var ul = el("ul");
    (items || []).forEach(function (item) {
      ul.appendChild(text("li", null, item));
    });
    card.appendChild(ul);
    return card;
  }

  function renderDosDonts(section) {
    var grid = el("div", "dos-donts");
    grid.appendChild(dosDontsCard("do-card", "dd-title", "Do", section.dos));
    grid.appendChild(dosDontsCard("dont-card", "dd-title", "Don't", section.donts));
    return [grid];
  }

  /* ---------- composition (patterns only — may embed <ds-demo>) ---------- */

  function renderComposition(section) {
    var wrap = el("div", "frame");
    wrap.innerHTML = section.markup || "";
    return [wrap];
  }

  /* ---------- needs-input ---------- */

  function renderNeedsInput(section) {
    return [needsInputNote(section.text || "", !!section.synthesized)];
  }

  var SECTION_RENDERERS = {
    "token-grid": renderTokenGrid,
    prose: renderProse,
    "state-matrix": renderStateMatrix,
    anatomy: renderAnatomy,
    "props-table": renderPropsTable,
    "dos-donts": renderDosDonts,
    composition: renderComposition,
    "needs-input": renderNeedsInput
  };

  /* ---------- <ds-sheet key> ---------- */

  class DsSheet extends HTMLElement {
    connectedCallback() {
      whenReady(this.render.bind(this));
    }
    render() {
      if (this._rendered) return;
      this._rendered = true;
      var key = this.getAttribute("key");
      var data = lookup(key);
      if (!data) {
        this.appendChild(needsInputNote("data missing: " + key));
        return;
      }
      var header = el("header", "sheet-header");
      header.appendChild(text("h1", null, data.title || ""));
      header.appendChild(text("p", "sheet-sub", data.subtitle || ""));
      if (data.provenance === "designed") {
        header.appendChild(needsInputNote("designed, not extracted", false));
      }
      this.appendChild(header);

      (data.sections || []).forEach(function (section) {
        var renderer = SECTION_RENDERERS[section.type];
        if (!renderer) {
          warnUnknown("sections[].type", section.type);
          return;
        }
        var body = renderer(section, data.demo);
        var wrap = el("div", "section");
        if (section.heading) wrap.appendChild(text("h2", null, section.heading));
        if (section.subheading) wrap.appendChild(text("p", "section-sub", section.subheading));
        body.forEach(function (node) {
          wrap.appendChild(node);
        });
        this.appendChild(wrap);
      }, this);
    }
  }
  customElements.define("ds-sheet", DsSheet);

  /* ---------- <ds-demo name variant state> ---------- */

  class DsDemo extends HTMLElement {
    connectedCallback() {
      whenReady(this.render.bind(this));
    }
    render() {
      if (this._rendered) return;
      this._rendered = true;
      var name = this.getAttribute("name");
      var data = lookup("component:" + name);
      if (!data || !data.demo) {
        this.appendChild(needsInputNote("no demo markup for component: " + name));
        return;
      }
      var variant = this.getAttribute("variant") || data.demo.defaultVariant;
      var state = this.getAttribute("state") || data.demo.defaultState;
      var entry = data.demo.variants && data.demo.variants[variant] && data.demo.variants[variant].states &&
        data.demo.variants[variant].states[state];
      if (!entry || !entry.markup) {
        this.appendChild(needsInputNote("no demo for " + name + " / " + variant + " / " + state));
        return;
      }
      this.innerHTML = entry.markup;
    }
  }
  customElements.define("ds-demo", DsDemo);
})();
