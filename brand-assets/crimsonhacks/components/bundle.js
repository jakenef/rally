/* @ds-bundle: {"format":4,"namespace":"CrimsonHacks","components":[{"name":"Wordmark"},{"name":"Button"},{"name":"MenuButton"},{"name":"Icon"},{"name":"Headline"},{"name":"Marquee"},{"name":"Caption"},{"name":"PhotoCard"},{"name":"EventCard"},{"name":"PaddleTile"},{"name":"Perforation"},{"name":"FooterPanel"}]} */
(function () {
  var React = window.React, h = React.createElement;
  function cx() { return Array.prototype.slice.call(arguments).filter(Boolean).join(" "); }
  function omit(o, keys) { var r = {}; for (var k in o) if (keys.indexOf(k) < 0) r[k] = o[k]; return r; }
  var FILL = { fill: "currentColor", stroke: "none" };
  var ICONS = {
    paddle: [["rect", { x: 5, y: 2, width: 14, height: 15, rx: 6 }], ["path", { d: "M10.5 17v5h3v-5" }]],
    ball: [["circle", { cx: 12, cy: 12, r: 9 }], ["circle", Object.assign({ cx: 12, cy: 12, r: 1.2 }, FILL)], ["circle", Object.assign({ cx: 12, cy: 7, r: 1.2 }, FILL)],
      ["circle", Object.assign({ cx: 16.4, cy: 10.4, r: 1.2 }, FILL)], ["circle", Object.assign({ cx: 14.7, cy: 15.6, r: 1.2 }, FILL)],
      ["circle", Object.assign({ cx: 9.3, cy: 15.6, r: 1.2 }, FILL)], ["circle", Object.assign({ cx: 7.6, cy: 10.4, r: 1.2 }, FILL)]],
    court: [["rect", { x: 2.5, y: 5, width: 19, height: 14, rx: 1 }], ["path", { d: "M12 5v14M9 5v14M15 5v14M2.5 12H9M15 12h6.5" }]],
    arrow: [["path", { d: "M7 17 17 7M9 7h8v8" }]],
    bag: [["path", { d: "M5.5 8h13l-1.2 12H6.7L5.5 8Z" }], ["path", { d: "M9 8V6.5a3 3 0 0 1 6 0V8" }]],
    trophy: [["path", { d: "M8 4h8v5a4 4 0 0 1-8 0V4ZM8 6H5a3 3 0 0 0 3 3M16 6h3a3 3 0 0 1-3 3M12 13v4M8.5 20h7M10 17h4" }]]
  };

  function Icon(p) {
    var shapes = ICONS[p.name] || ICONS.ball, size = p.size || 24;
    return h("svg", { viewBox: "0 0 24 24", width: size, height: size, fill: "none", stroke: "currentColor", strokeWidth: 1.6,
      strokeLinecap: "round", strokeLinejoin: "round", className: cx("ch-icon", p.className),
      role: p.title ? "img" : undefined, "aria-hidden": p.title ? undefined : "true" },
      p.title ? h("title", null, p.title) : null,
      shapes.map(function (s, i) { return h(s[0], Object.assign({ key: i }, s[1])); }));
  }

  function Wordmark(p) {
    return h("span", { className: cx("ch-wordmark", "ch-wordmark-" + (p.size || "md"), p.className), role: "img", "aria-label": "crimsonhacks" },
      h("span", { className: "ch-wm-serif", "aria-hidden": "true" }, "Crimson"), h("span", { className: "ch-wm-sans", "aria-hidden": "true" }, "Hacks"));
  }

  function Button(p) {
    var variant = p.variant || "primary";
    var rest = omit(p, ["variant", "icon", "iconAfter", "children", "className", "href"]);
    var inner = [p.icon ? h(Icon, { key: "i", name: p.icon }) : null, h("span", { key: "t" }, p.children), p.iconAfter ? h(Icon, { key: "a", name: p.iconAfter }) : null];
    var props = Object.assign(rest, { className: cx("ch-btn", "ch-btn-" + variant, p.className) });
    if (p.href) return h("a", Object.assign(props, { href: p.href }), inner);
    return h("button", Object.assign({ type: "button" }, props), inner);
  }

  function MenuButton(p) {
    return h("button", { type: "button", className: cx("ch-menu", p.className), "aria-label": p.label || "Menu", "aria-expanded": p.open ? "true" : "false", onClick: p.onClick },
      h("span", { className: "ch-menu-glyph", "aria-hidden": "true" }, h("i"), h("i")));
  }

  function Headline(p) {
    var size = p.size || "h2", tag = p.as || (size === "h1" ? "h1" : "h2"), body = p.children;
    if (p.parts) {
      body = [];
      p.parts.forEach(function (part, i) {
        if (i) body.push(" ");
        body.push(typeof part === "string" ? part : h("span", { key: i, className: "ch-hl-serif" }, part.text));
      });
    }
    return h(tag, { className: cx("ch-hl", "ch-hl-" + size, p.align === "center" && "ch-hl-center", p.className) }, body);
  }

  function Marquee(p) {
    var rows = p.rows || [];
    return h("div", { className: cx("ch-marquee", p.className), style: { "--ch-mq-speed": (p.speed || 40) + "s" }, role: "text",
      "aria-label": rows.map(function (r) { return r.text; }).join(". ") },
      rows.map(function (r, i) {
        return h("div", { key: i, "aria-hidden": "true", className: cx("ch-mq-row", r.serif ? "ch-mq-serif" : "ch-mq-sans", i % 2 && "ch-mq-rev") },
          [0, 1, 2, 3].map(function (k) { return h("span", { key: k }, r.text); }));
      }));
  }

  function Caption(p) {
    return h("div", { className: cx("ch-caption", p.className) }, p.bar === false ? null : h("span", { className: "ch-tagbar", "aria-hidden": "true" }),
      p.children ? h("span", { className: "ch-caption-text" }, p.children) : null);
  }

  function PhotoCard(p) {
    return h("figure", { className: cx("ch-photo", p.tone === "mono" && "ch-photo-mono", p.className), style: { width: p.width, "--ch-ratio": p.ratio || "4 / 5" } },
      h(Caption, null, p.caption), h("img", { src: p.src, alt: p.alt || "" }));
  }

  function EventCard(p) {
    var meta = [].concat(p.meta || []);
    return h("div", { className: cx("ch-event", p.className) },
      h("span", { className: "ch-event-label" }, p.label || "Next match"),
      h("div", { className: "ch-event-frame" }, h("div", { className: "ch-event-body" },
        h(Icon, { name: p.icon || "paddle" }),
        h("span", { className: "ch-event-title" }, p.title),
        h("span", { className: "ch-event-rule", "aria-hidden": "true" }),
        h(Icon, { name: p.metaIcon || "trophy", size: 22 }),
        h("span", { className: "ch-event-meta" }, meta.map(function (m, i) { return [i ? h("br", { key: "b" + i }) : null, m]; })))));
  }

  var PADDLE = {
    crimson: { face: "pd-crimson", edge: "pe-night", grip: "pd-night" },
    paper: { face: "pd-paper", edge: "pe-crimson", grip: "pd-crimson" },
    night: { face: "pd-night", edge: "pe-crimson", grip: "pd-crimson" },
    split: { face: "pd-paper", edge: "pe-night", grip: "pd-night", half: "pd-crimson" }
  };
  function PaddleTile(p) {
    var t = PADDLE[p.tone] || PADDLE.crimson, id = React.useId ? React.useId() : "pd";
    var clip = "chpd" + String(id).replace(/[^A-Za-z0-9]/g, "");
    return h("figure", { className: cx("ch-paddle", p.className) },
      h("svg", { viewBox: "0 0 120 200", role: "img", "aria-label": (p.name || "Paddle") + " paddle" },
        h("defs", null, h("clipPath", { id: clip }, h("rect", { x: 10, y: 6, width: 100, height: 128, rx: 38 }))),
        h("rect", { x: 48, y: 128, width: 24, height: 66, rx: 8, className: t.grip }),
        h("rect", { x: 10, y: 6, width: 100, height: 128, rx: 38, className: t.face }),
        t.half ? h("rect", { x: 60, y: 0, width: 60, height: 140, className: t.half, clipPath: "url(#" + clip + ")" }) : null,
        h("rect", { x: 10, y: 6, width: 100, height: 128, rx: 38, className: t.edge })),
      h("figcaption", null, h("span", { className: "ch-paddle-name" }, p.name), p.year ? h("span", { className: "ch-paddle-year" }, p.year) : null));
  }

  function Perforation(p) {
    var style = Object.assign({}, p.style, p.pitch ? { "--ch-perf-pitch": p.pitch + "px" } : null);
    return h(p.as || "div", { className: cx("ch-perf", p.tone === "night" && "ch-night", p.className), style: style }, p.children);
  }

  function FooterCol(c) {
    if (!c) return h("div");
    return h("nav", { className: "ch-footer-col", "aria-label": c.label },
      h("span", { className: "ch-caption-text" }, c.label),
      (c.links || []).map(function (l, i) { return h("a", { key: i, href: l.href || "#" }, l.label); }));
  }
  function FooterPanel(p) {
    return h("footer", { className: cx("ch-footer", p.className) },
      h(Perforation, { tone: "night", className: "ch-footer-panel" },
        h(Headline, { size: "h1", align: "center", parts: p.parts }),
        h("div", { className: "ch-footer-cols" }, h(FooterCol, p.left),
          p.action ? h(Button, { href: p.action.href || "#", iconAfter: "arrow" }, p.action.label) : h("span"),
          h(FooterCol, p.right))),
      h("div", { className: "ch-footer-base" }, h("span", null, p.legal),
        h("span", null, (p.baseLinks || []).map(function (l, i) { return h("a", { key: i, href: l.href || "#" }, l.label); }))));
  }

  window.CrimsonHacks = Object.assign(window.CrimsonHacks || {}, {
    Wordmark: Wordmark, Button: Button, MenuButton: MenuButton, Icon: Icon, Headline: Headline, Marquee: Marquee,
    Caption: Caption, PhotoCard: PhotoCard, EventCard: EventCard, PaddleTile: PaddleTile, Perforation: Perforation, FooterPanel: FooterPanel
  });
})();
