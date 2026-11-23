// Adds two things to a lab page: a link back to the list of labs, and a Tutorial
// button that opens the lab's tutorial in a panel beside the lab.
//
// Include it at the end of a lab's <body>:
//   <script src="../../shared/lab-nav.js" data-tutorial="tutorial.html" defer></script>
//
// data-tutorial is the tutorial page, relative to the lab. Leave it out for a lab with
// no tutorial and the button is not added.
//
// Opening a lab with #tutorial at the end of its address opens the panel right away.
// Everything works on GitHub Pages and when the files are opened from disk.
(function () {
  var script = document.currentScript;
  if (!script) return;

  var slug = location.pathname.replace(/\/index\.html$/, "").replace(/\/$/, "").split("/").pop();
  var home = new URL("../index.html", script.src);
  home.hash = slug;
  var tutorialPage = script.getAttribute("data-tutorial");

  var style = document.createElement("style");
  style.textContent = [
    ":root{--lab-tut-w:clamp(320px,30vw,460px)}",
    "#lab-back,#lab-tut-btn{pointer-events:auto;text-decoration:none;cursor:pointer}",
    "#lab-tut-btn{display:inline-flex;align-items:center;gap:6px;font:500 12px/1 'IBM Plex Mono',ui-monospace,Menlo,Consolas,monospace;margin:0}",
    "#lab-tut-btn svg{width:13px;height:13px;flex:none}",
    "#lab-back:hover,#lab-tut-btn:hover{border-color:#6b7486}",
    "#lab-tut-btn[aria-expanded=true]{border-color:#9292ff;color:#b9b9ff}",
    "#lab-back:focus-visible,#lab-tut-btn:focus-visible,#lab-tut button:focus-visible,#lab-tut a:focus-visible{outline:2px solid #9292ff;outline-offset:2px}",
    ".lab-nav-fixed{position:fixed;top:14px;z-index:40;font:500 12px/1 ui-monospace,Menlo,Consolas,monospace;padding:6px 9px;border-radius:6px;background:rgba(13,15,19,.85);border:1px solid #262b36;color:#dfe3ea}",
    "#lab-back.lab-nav-fixed{left:16px}#lab-tut-btn.lab-nav-fixed{left:110px}",
    // the panel
    "#lab-tut{position:fixed;left:0;top:0;bottom:0;width:var(--lab-tut-w);z-index:50;display:flex;flex-direction:column;background:#151820;color:#dfe3ea;border-right:1px solid #262b36;font:14px/1.4 'IBM Plex Sans',system-ui,sans-serif}",
    "#lab-tut[hidden]{display:none}",
    "#lab-tut .lab-tut-head{display:flex;align-items:center;gap:4px;padding:8px 8px 8px 18px;border-bottom:1px solid #262b36}",
    "#lab-tut .lab-tut-head strong{flex:1;font-weight:600}",
    "#lab-tut .lab-tut-head a,#lab-tut .lab-tut-head button{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;padding:0;border:0;border-radius:6px;background:none;color:#8a93a3;cursor:pointer}",
    "#lab-tut .lab-tut-head a:hover,#lab-tut .lab-tut-head button:hover{background:#1d222c;color:#dfe3ea}",
    "#lab-tut .lab-tut-head svg{width:16px;height:16px}",
    "#lab-tut iframe{flex:1;width:100%;border:0;background:#151820}",
    "#lab-tut-grip{position:absolute;top:0;bottom:0;right:-4px;width:8px;cursor:col-resize;touch-action:none}",
    "#lab-tut-grip:hover,#lab-tut.dragging #lab-tut-grip{background:rgba(146,146,255,.35)}",
    "#lab-tut.dragging iframe{pointer-events:none}",
    // the lab makes room for the panel instead of being covered by it
    "html.lab-tut-open .app{margin-left:var(--lab-tut-w)}",
    "@media (max-width:860px){#lab-tut{width:100%;border-right:0}#lab-tut-grip{display:none}html.lab-tut-open .app{margin-left:0}}"
  ].join("\n");

  var ICON_BOOK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 6.5C10.5 5.2 8.3 4.5 5 4.5H3v14h2c3.3 0 5.5.7 7 2 1.5-1.3 3.7-2 7-2h2v-14h-2c-3.3 0-5.5.7-7 2z"/><path d="M12 6.5v14"/></svg>';
  var ICON_NEW_TAB = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>';
  var ICON_CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  var back = document.createElement("a");
  back.id = "lab-back";
  back.href = home.href;
  back.textContent = "← All labs";
  back.setAttribute("aria-label", "Back to all labs");

  var button = null, panel = null, frame = null;

  // A canvas only learns its new size from a resize event or its own per-frame check.
  function labResized() { window.dispatchEvent(new Event("resize")); }

  function setOpen(open) {
    if (!panel) return;
    if (open && !frame.getAttribute("src")) frame.src = tutorialPage;   // load on first use
    panel.hidden = !open;
    document.documentElement.classList.toggle("lab-tut-open", open);
    button.setAttribute("aria-expanded", String(open));
    labResized();
    if (!open) button.focus();
  }

  function buildTutorial() {
    button = document.createElement("button");
    button.id = "lab-tut-btn";
    button.type = "button";
    button.innerHTML = ICON_BOOK + "<span>Tutorial</span>";
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", "lab-tut");
    button.addEventListener("click", function () { setOpen(panel.hidden); });

    // a <div>, not an <aside>: the labs style their own <aside> (the controls panel)
    panel = document.createElement("div");
    panel.id = "lab-tut";
    panel.hidden = true;
    panel.setAttribute("role", "complementary");
    panel.setAttribute("aria-label", "Tutorial");
    panel.innerHTML =
      '<div class="lab-tut-head"><strong>Tutorial</strong>' +
      '<a href="' + tutorialPage + '" target="_blank" rel="noopener" title="Open the tutorial in a new tab" aria-label="Open the tutorial in a new tab">' + ICON_NEW_TAB + "</a>" +
      '<button type="button" title="Close the tutorial" aria-label="Close the tutorial">' + ICON_CLOSE + "</button></div>" +
      '<iframe title="Tutorial"></iframe><div id="lab-tut-grip" title="Drag to resize"></div>';
    frame = panel.querySelector("iframe");
    panel.querySelector(".lab-tut-head button").addEventListener("click", function () { setOpen(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) setOpen(false); });

    // drag the panel's edge to change its width; the width is remembered for next time
    var grip = panel.querySelector("#lab-tut-grip"), root = document.documentElement;
    var setWidth = function (px) {
      var w = Math.max(280, Math.min(px, window.innerWidth * 0.6));
      root.style.setProperty("--lab-tut-w", w + "px");
      return w;
    };
    try { var saved = parseFloat(localStorage.getItem("labTutorialWidth")); if (saved) setWidth(saved); } catch (e) { /* storage unavailable: use the default */ }
    grip.addEventListener("pointerdown", function (e) { grip.setPointerCapture(e.pointerId); panel.classList.add("dragging"); e.preventDefault(); });
    grip.addEventListener("pointermove", function (e) { if (panel.classList.contains("dragging")) { setWidth(e.clientX); labResized(); } });
    var stop = function (e) {
      if (!panel.classList.contains("dragging")) return;
      panel.classList.remove("dragging");
      try { localStorage.setItem("labTutorialWidth", String(setWidth(e.clientX))); } catch (err) { /* not saved */ }
      labResized();
    };
    grip.addEventListener("pointerup", stop);
    grip.addEventListener("pointercancel", stop);
  }

  function place() {
    document.head.appendChild(style);
    if (tutorialPage) buildTutorial();
    // Every lab has a row of status chips in the top-left corner of its viewport.
    // The link and the button become the first chips. A lab without that row gets fixed corner buttons.
    var hud = document.querySelector(".hud");
    if (hud) {
      back.className = "chip";
      hud.insertBefore(back, hud.firstChild);
      if (button) { button.className = "chip"; hud.insertBefore(button, back.nextSibling); }
      // The chips wrap onto more rows when the viewport is narrow. Keep the hint line below them.
      var hint = document.querySelector(".hint");
      if (hint && window.ResizeObserver) {
        new ResizeObserver(function () { hint.style.top = (hud.offsetTop + hud.offsetHeight + 6) + "px"; }).observe(hud);
      }
    } else {
      back.className = "lab-nav-fixed";
      document.body.appendChild(back);
      if (button) { button.className = "lab-nav-fixed"; document.body.appendChild(button); }
    }
    if (panel) {
      document.body.appendChild(panel);
      if (location.hash === "#tutorial") setOpen(true);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", place);
  else place();
})();
