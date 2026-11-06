/* =========================================================
   About page: "How it started" scroll story
   The section pins to the screen while you scroll. Each chapter's words
   fill in, then the next chapter slides up. Each chapter's photo is picked
   out of the founders' camera roll on the phone and flies into the journal
   card, where it is taped in.
   With reduced motion (or if this file fails to load) the chapters just
   show one after another as normal text.
   ========================================================= */
   (function () {
    var story = document.querySelector(".story");
    if (!story) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  
    var beats = Array.prototype.slice.call(story.querySelectorAll(".story-beat"));
    var roll = story.querySelector(".phone-roll");
    var grid = story.querySelector(".roll-grid");
    var tiles = Array.prototype.slice.call(story.querySelectorAll(".roll-tile[data-chapter]"));
    var snap = story.querySelector(".story-snap");
    var snapImg = story.querySelector("[data-snap-img]");
    var snapCap = story.querySelector("[data-snap-cap]");
    var num = story.querySelector("[data-story-num]");
    var card = story.querySelector(".story-card");
    var stage = story.querySelector(".story-stage");
    var inner = story.querySelector(".story-inner");
    var N = beats.length;
  
    // wrap every word of each chapter in a <span class="w"> so it can light up
    var words = beats.map(function (beat) {
      var line = beat.querySelector(".story-line");
      var list = [];
      (function wrap(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (child) {
          if (child.nodeType === 3) {
            var frag = document.createDocumentFragment();
            child.textContent.split(/(\s+)/).forEach(function (part) {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
              var s = document.createElement("span");
              s.className = "w";
              s.textContent = part;
              frag.appendChild(s);
              list.push(s);
            });
            child.parentNode.replaceChild(frag, child);
          } else if (child.nodeType === 1) {
            wrap(child);
            if (child.tagName === "MARK") list.push(child);
          }
        });
      })(line);
      return list;
    });
  
    story.style.setProperty("--beats", N);
    story.classList.add("is-scroll");
  
    var ticking = false;
    function update() {
      ticking = false;
      var rect = story.getBoundingClientRect();
      var total = story.offsetHeight - window.innerHeight;
      var p = Math.min(1, Math.max(0, -rect.top / total));
      var f = p * N;
      var i = Math.min(N - 1, Math.floor(f));
      var local = Math.min(1, f - i);
  
      beats.forEach(function (b, k) {
        b.classList.toggle("is-active", k === i);
        b.classList.toggle("is-past", k < i);
      });
      // words finish filling at 70% of each chapter, leaving a moment to read
      var list = words[i];
      var fill = Math.min(1, local / 0.7);
      var lit = (i < N - 1 || p < 1) ? Math.round(fill * list.length) : list.length;
      words.forEach(function (ws, k) {
        ws.forEach(function (w, j) { w.classList.toggle("lit", k < i || (k === i && j < lit)); });
      });
      beats[i].classList.toggle("is-done", fill >= 1);
      beats.forEach(function (b, k) { if (k !== i) b.classList.remove("is-done"); });
  
      if (i !== shown) showChapter(i);
      if (num) num.textContent = ("0" + (i + 1)).slice(-2);
      card.style.setProperty("--p", p.toFixed(4));
    }
    // ---- camera roll -> journal ----
    var shown = -1, token = 0;
    function tileFor(i) {
      for (var k = 0; k < tiles.length; k++) if (+tiles[k].getAttribute("data-chapter") === i + 1) return tiles[k];
      return null;
    }
    function showChapter(i) {
      var first = shown === -1;
      shown = i;
      var my = ++token;
      var tile = tileFor(i);
      var img = tile && tile.querySelector("img");
      var src = img ? img.getAttribute("src") : snapImg.getAttribute("src");
      var cap = beats[i].getAttribute("data-cap") || "";
  
      // scroll the camera roll so the picked photo is in view, and mark the others
      tiles.forEach(function (t) {
        var n = +t.getAttribute("data-chapter") - 1;
        t.classList.toggle("is-picked", n === i);
        t.classList.toggle("is-printed", n < i);
      });
      if (roll && tile) {
        var max = Math.max(0, grid.scrollHeight - roll.clientHeight);
        var y = Math.min(max, Math.max(0, tile.offsetTop - roll.clientHeight * 0.3));
        grid.style.setProperty("--roll", y);
      }
  
      function land() {
        if (my !== token) return;
        snapImg.src = src;
        snapCap.textContent = cap;
        snap.classList.remove("is-out");
        if (tile) tile.classList.add("is-printed");
      }
      if (first) { land(); return; }
  
      snap.classList.add("is-out");
      Array.prototype.slice.call(document.querySelectorAll(".story-fly")).forEach(function (f) { f.remove(); });
      var phoneOn = roll && roll.offsetParent !== null && tile;
      if (!phoneOn || !document.body.animate) { setTimeout(land, 250); return; }
  
      // wait for the camera roll to scroll, then fly the photo into the card
      setTimeout(function () {
        if (my !== token) return;
        var a = tile.getBoundingClientRect(), b = snapImg.getBoundingClientRect();
        var fly = document.createElement("img");
        fly.className = "story-fly";
        fly.src = src;
        fly.alt = "";
        fly.style.left = b.left + "px";
        fly.style.top = b.top + "px";
        fly.style.width = b.width + "px";
        fly.style.height = b.height + "px";
        document.body.appendChild(fly);
        var dx = a.left - b.left, dy = a.top - b.top, sx = a.width / b.width, sy = a.height / b.height;
        fly.style.transformOrigin = "0 0";
        fly.animate([
          { transform: "translate(" + dx + "px," + dy + "px) scale(" + sx + "," + sy + ")" },
          { transform: "translate(" + dx * 0.4 + "px," + (dy * 0.4 - 70) + "px) scale(1) rotate(-6deg)", offset: 0.5 },
          { transform: "rotate(4deg)" }
        ], { duration: 800, easing: "cubic-bezier(0.3, 0.7, 0.3, 1)" }).onfinish = function () {
          land();
          setTimeout(function () { fly.remove(); }, 60);
        };
      }, 380);
    }
  
    // tuck the next section up into the empty space under the card
    function measure() {
      var spare = stage.clientHeight - (inner.offsetTop + inner.offsetHeight) - 48;
      story.style.setProperty("--spare", Math.max(0, spare) + "px");
    }
    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function () { measure(); onScroll(); });
    window.addEventListener("load", measure);
    measure();
    update();
  })();
  
  /* =========================================================
     About page: tap the printer to print
     Each tap sends the photo in the slot flying onto the page around the
     title, and a new photo slides up out of the printer. It stops after 4 prints,
     so the ones already on the page are never replaced.
     ========================================================= */
  (function () {
    var printer = document.querySelector("[data-tap-print]");
    if (!printer) return;
    var intro = printer.closest(".about-intro") || printer.parentNode;
    var feed = printer.querySelector(".about-feed");
    var label = printer.querySelector("[data-tap-label]");
    var status = document.querySelector("[data-tap-status]");
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  
    // photos the printer cycles through: [image, handwritten caption]
    var PHOTOS = [
      ["./images/friends&eventsUse.png", "hall night!"],
      ["./images/journalUse.png", "kyoto trip ♡"],
      ["./images/studentsUse.png", "3am study sesh"],
      ["./images/familyUse.png", "on the fridge"],
      ["./images/smallbusinessUse.png", "my little shop"]
    ];
    PHOTOS.forEach(function (ph) { var im = new Image(); im.src = ph[0]; }); // preload
  
    // where prints land, as [left %, top %, rotation] of the intro area
    var WIDE = [[8, 12, -8], [79, 10, 7], [12, 52, 5], [80, 50, -5]];
    var NARROW = [[1, 47, -8], [78, 45, 7], [0, 77, 5], [79, 78, -6]];
    var MAX = 4; // the printer stops after 4 prints
  
    var slot = document.createElement("div");
    slot.className = "tap-slot";
    printer.appendChild(slot);
  
    var current = { el: feed ? feed.querySelector("img") : null, src: "./images/about-paper.png", cap: "sunset ♡", isFeed: true };
    var next = 0, count = 0, busy = false, landed = [];
  
    function spots() { return intro.clientWidth >= 900 ? WIDE : NARROW; }
  
    // the photo in the slot flies off and lands somewhere around the title
    function flyOff(item) {
      if (!item.el) return;
      var from = item.el.getBoundingClientRect();
      var box = intro.getBoundingClientRect();
      var list = spots();
      var spot = list[count % list.length];
      var wide = list === WIDE;
      var W = wide ? Math.min(160, intro.clientWidth * 0.12) : 76;
  
      var fig = document.createElement("figure");
      fig.className = "tap-print";
      fig.innerHTML = '<img alt="" /><figcaption></figcaption>';
      fig.querySelector("img").src = item.src;
      fig.querySelector("figcaption").textContent = item.cap;
      var tx = box.width * spot[0] / 100, ty = box.height * spot[1] / 100;
      fig.style.left = tx + "px";
      fig.style.top = ty + "px";
      fig.style.width = W + "px";
      fig.style.transformOrigin = "0 0";
      fig.style.transform = "rotate(" + spot[2] + "deg)";
      intro.appendChild(fig);
  
      // hide what was in the slot
      if (item.isFeed) feed.classList.add("is-gone");
      else item.el.parentNode && item.el.parentNode.removeChild(item.el);
  
      if (!reduce && fig.animate) {
        var sx = from.left - box.left - tx, sy = from.top - box.top - ty, k = from.width / W;
        fig.animate([
          { transform: "translate(" + sx + "px," + sy + "px) scale(" + k + ") rotate(0deg)" },
          { transform: "translate(" + sx * 0.45 + "px," + (sy * 0.45 - 90) + "px) scale(" + (k + 1) / 2 + ") rotate(" + spot[2] * 2.5 + "deg)", offset: 0.45 },
          { transform: "rotate(" + spot[2] + "deg)" }
        ], { duration: 950, easing: "cubic-bezier(0.3, 0.7, 0.3, 1)" }).onfinish = function () { fig.classList.add("is-landed"); };
      } else fig.classList.add("is-landed");
  
      landed.push(fig);
    }
  
    // a new photo slides up out of the slot
    function printNew() {
      var ph = PHOTOS[next % PHOTOS.length];
      next++;
      var paper = document.createElement("div");
      paper.className = "tap-paper";
      paper.innerHTML = '<img alt="" />';
      paper.querySelector("img").src = ph[0];
      slot.appendChild(paper);
      current = { el: paper, src: ph[0], cap: ph[1], isFeed: false };
      if (reduce) { paper.style.transform = "none"; busy = false; return; }
      void paper.offsetWidth; // start from inside the printer
      paper.classList.add("is-printing");
      setTimeout(function () { busy = false; }, 650);
    }
  
    function tap() {
      if (busy || count >= MAX) return;
      busy = true;
      printer.classList.add("is-pressed");
      setTimeout(function () { printer.classList.remove("is-pressed"); }, 140);
      flyOff(current);
      count++;
      if (label && count === 1) label.textContent = "again!";
      if (count < MAX) {
        setTimeout(printNew, reduce ? 0 : 250);
        if (status) status.textContent = "Printed a photo";
      } else {
        // all 4 printed: the slot stays empty and the printer stops
        printer.classList.add("is-done");
        printer.setAttribute("aria-disabled", "true");
        if (status) status.textContent = "Printed 4 photos";
      }
    }
  
    printer.addEventListener("click", tap);
    printer.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tap(); }
    });
  })();
/* =========================================================
   About page: camera roll safety net
   If a camera-roll photo can't be found, try the same name as .jpg / .jpeg /
   .webp (and in capitals) before giving up. If none exist, the browser console
   says which file is missing, so it's easy to fix the name in about.html.
   ========================================================= */
(function () {
  var EXT = [".png", ".jpg", ".jpeg", ".webp", ".PNG", ".JPG", ".JPEG", ".WEBP"];
  Array.prototype.slice.call(document.querySelectorAll(".roll-tile img")).forEach(function (img) {
    var src = img.getAttribute("src") || "";
    var m = src.match(/^(.*)(\.[A-Za-z]+)$/);
    if (!m || /^https?:/.test(src)) return;
    var tries = EXT.filter(function (e) { return e !== m[2]; }).map(function (e) { return m[1] + e; });
    function next() {
      if (!tries.length) {
        img.removeEventListener("error", next);
        img.closest(".roll-tile").classList.add("is-missing");
        if (window.console) console.warn("Camera roll photo not found: " + src + " (check the file name and folder in images/)");
        return;
      }
      img.src = tries.shift();
    }
    img.addEventListener("error", next);
    // it may already have failed before this script ran (e.g. the first tiles on screen)
    if (img.complete && img.naturalWidth === 0) next();
  });
})();