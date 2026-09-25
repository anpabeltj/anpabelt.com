// Restart the animated telemetry backdrop on every navigation/restore.
// The SVG is rendered as an <img>; a fresh URL forces a re-decode so the
// embedded keyframes replay from 0 (a cached image never re-runs them).
//
// Scroll response: the schematic is fully visible while the page is at the
// very top ("scroll mentok ke atas") and fades to barely visible as soon as
// the user scrolls down, so the page content stays the focus.
(function () {
  var img = document.querySelector(".backdrop-telemetry[data-src]");
  if (!img) return;

  function restart() {
    img.src = img.dataset.src + "?v=" + Date.now();
  }
  restart();
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) restart();
  });

  // --- scroll-linked opacity: 0.6 at the top -> 0.12 once scrolled ---
  var TOP_O = 0.6;   // fully visible at scrollY = 0
  var DIM_O = 0.12;  // barely visible while reading
  var RAMP_PX = 240; // scroll distance for the full transition
  var ticking = false;

  function apply() {
    ticking = false;
    var y = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    var t = y <= 0 ? 0 : Math.min(1, y / RAMP_PX);
    var o = TOP_O + (DIM_O - TOP_O) * t;
    img.style.opacity = o.toFixed(3);
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(apply);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  apply();
})();
