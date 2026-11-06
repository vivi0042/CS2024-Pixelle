/* =========================================================
   Overview page script (overview.html only)
   1. places the Kyoto sticker in perspective
   2. draws the curved print animation
   ========================================================= */

/* =========================================================
   1. Place the Kyoto sticker in perspective
   The sticker is built in HTML (so its corner can peel). This bends it with
   a matrix3d transform so its four corners land exactly on the four corners
   of the sticker in the printer photo, and keeps it lined up when the page
   is resized.
   ========================================================= */
   (function () {
    var stage = document.querySelector(".snap-print");
    var sticker = stage && stage.querySelector(".kyoto-sticker");
    if (!stage || !sticker) return;
  
    var PIC_W = 820;                      // width of snap-print-printer.png
    // sticker corners in the picture (top-left, top-right, bottom-right, bottom-left)
    var CORNERS = [[547.5, 317.5], [717.5, 297.5], [797.5, 475], [592.5, 490]];
  
    // solve the 3x3 perspective transform that maps the box (w x h) onto the corners
    function homography(w, h, dst) {
      var src = [[0, 0], [w, 0], [w, h], [0, h]], A = [], b = [];
      for (var i = 0; i < 4; i++) {
        var x = src[i][0], y = src[i][1], u = dst[i][0], v = dst[i][1];
        A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
        A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
      }
      // Gaussian elimination
      for (var c = 0; c < 8; c++) {
        var p = c;
        for (var r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
        var t = A[c]; A[c] = A[p]; A[p] = t; t = b[c]; b[c] = b[p]; b[p] = t;
        for (r = c + 1; r < 8; r++) {
          var f = A[r][c] / A[c][c];
          for (var k = c; k < 8; k++) A[r][k] -= f * A[c][k];
          b[r] -= f * b[c];
        }
      }
      var hgt = [];
      for (c = 7; c >= 0; c--) {
        var s = b[c];
        for (k = c + 1; k < 8; k++) s -= A[c][k] * hgt[k];
        hgt[c] = s / A[c][c];
      }
      return hgt; // a b c d e f g h
    }
  
    function place() {
      var scale = stage.clientWidth / PIC_W;
      if (!scale) return;
      var w = sticker.offsetWidth, h = sticker.offsetHeight;
      var dst = CORNERS.map(function (p) { return [p[0] * scale, p[1] * scale]; });
      var m = homography(w, h, dst);
      sticker.style.left = "0";
      sticker.style.top = "0";
      sticker.style.transform = "matrix3d(" + [
        m[0], m[3], 0, m[6],
        m[1], m[4], 0, m[7],
        0, 0, 1, 0,
        m[2], m[5], 0, 1
      ].join(",") + ")";
    }
  
    window.addEventListener("resize", place);
    window.addEventListener("load", place);
    var img = sticker.querySelector("img");
    if (img && !img.complete) img.addEventListener("load", place);
    place();
  })();
  
  /* =========================================================
     2. Curved print animation
     Like the home page hero: the photo comes out of the slot and curls back
     along a curved path as it prints. Drawn on a canvas that sits between the
     printer and the printer's front, so the photo appears to come from inside.
     (Without JavaScript, the flat .sp-paper photo shows instead.)
     ========================================================= */
  (function () {
    var stage = document.querySelector(".snap-print");
    var front = stage && stage.querySelector(".sp-front");
    if (!stage || !front || !document.createElement("canvas").getContext) return;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  
    var PIC_W = 820, PIC_H = 570;         // size of snap-print-printer.png
    // the paper's left and right edges, from the slot (start) up to the top (end),
    // as curves in picture pixels: [start, control, end]
    // The paper rises straight up out of the slot, then bends BACKWARDS (away from you):
    // the top leans back, looks a little narrower, and is squashed by perspective.
    var EDGE_L = [[197, 208], [194, 110], [138, 26]];
    var EDGE_R = [[433, 186], [431, 90], [383, 10]];
    var N = 28;                           // strips used to bend the photo
  
    function bez(c, t) {
      var a = 1 - t;
      return [a * a * c[0][0] + 2 * a * t * c[1][0] + t * t * c[2][0],
              a * a * c[0][1] + 2 * a * t * c[1][1] + t * t * c[2][1]];
    }
    var L = [], R = [];
    // later parts of the sheet cover less height on screen, because they are tipping away
    function bend(t) { return t * (1.2 - 0.2 * t); }
    for (var i = 0; i <= N; i++) { L.push(bez(EDGE_L, bend(i / N))); R.push(bez(EDGE_R, bend(i / N))); }
  
    // the flat print: photo with a white border (no border at the bottom, which stays in the slot)
    var photo = new Image();
    photo.src = "./images/snap-print-fuji.jpg";
    var BORDER = 14, SRC_W = 402 + BORDER * 2, SRC_H = 303 + BORDER;
    var sheet = document.createElement("canvas");
    sheet.width = SRC_W; sheet.height = SRC_H;
  
    var canvas = document.createElement("canvas");
    canvas.className = "sp-canvas";
    canvas.setAttribute("aria-hidden", "true");
    var ctx = canvas.getContext("2d");
    var k = 1, dpr = 1;
  
    function size() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      k = stage.clientWidth / PIC_W;
      canvas.width = Math.round(PIC_W * k * dpr);
      canvas.height = Math.round(PIC_H * k * dpr);
    }
  
    // draw one horizontal strip of the flat sheet (rows v1..v0) onto the
    // four-sided shape a1-b1 (top edge) / a0-b0 (bottom edge). The strip is drawn a
    // little taller than needed so neighbouring strips overlap and no seams show.
    function strip(v1, v0, a1, b1, a0, b0) {
      var h = v0 - v1;
      if (h <= 0.01) return;
      var over = Math.min(2, SRC_H - v0);           // extra source rows to overlap the strip below
      ctx.save();
      ctx.transform(
        (b1[0] - a1[0]) / SRC_W, (b1[1] - a1[1]) / SRC_W,   // sheet x  -> along the top edge
        (a0[0] - a1[0]) / h, (a0[1] - a1[1]) / h,           // sheet y  -> down towards the slot
        a1[0], a1[1]
      );
      ctx.drawImage(sheet, 0, v1, SRC_W, h + over, 0, 0, SRC_W, h + over);
      ctx.restore();
    }
    function lerp(p, q, t) { return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; }
    function edgeAt(E, u) {                  // point on an edge, u from 0 (slot) to N (top)
      u = Math.max(0, Math.min(N, u));
      var i = Math.min(N - 1, Math.floor(u));
      return lerp(E[i], E[i + 1], u - i);
    }
  
    // p = how much has printed (0..1)
    function draw(p, alpha) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (p <= 0 || alpha <= 0) return;
      ctx.setTransform(k * dpr, 0, 0, k * dpr, 0, 0);
      ctx.globalAlpha = alpha;
      var out = p * N;                       // how far up the path the top edge has travelled
      for (var i = 0; i < Math.ceil(out); i++) {
        var u0 = i, u1 = Math.min(i + 1, out);
        // the sheet row shown here: the top of the sheet is at the front of the path
        var v0 = (out - u0) / N * SRC_H, v1 = (out - u1) / N * SRC_H;
        strip(v1, v0, edgeAt(L, u1), edgeAt(R, u1), edgeAt(L, u0), edgeAt(R, u0));
      }
      // soft shading over the whole sheet: it darkens a little as it curls away from the light
      var steps = Math.ceil(out), top = edgeAt(L, out), topR = edgeAt(R, out);
      ctx.beginPath();
      for (var j = 0; j <= steps; j++) { var q = edgeAt(L, Math.min(j, out)); if (j) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }
      for (j = steps; j >= 0; j--) { q = edgeAt(R, Math.min(j, out)); ctx.lineTo(q[0], q[1]); }
      ctx.closePath();
      var base = edgeAt(L, 0), g = ctx.createLinearGradient(0, base[1], 0, Math.min(top[1], topR[1]));
      g.addColorStop(0, "rgba(60, 48, 36, 0)");
      g.addColorStop(1, "rgba(60, 48, 36, " + (0.1 * Math.pow(out / N, 1.6)) + ")");
      ctx.fillStyle = g;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  
    function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    var PRINT = 3400;                     // prints once, then the photo stays
    var t0 = null, running = false, done = false;
    function tick(now) {
      if (!running) return;
      if (t0 === null) t0 = now;
      var t = Math.min(1, (now - t0) / PRINT);
      draw(ease(t), 1);
      if (t < 1) requestAnimationFrame(tick);
      else { running = false; done = true; }
    }
  
    function ready() {
      // build the flat sheet once the photo has loaded
      var sc = sheet.getContext("2d");
      sc.fillStyle = "#fff"; sc.fillRect(0, 0, SRC_W, SRC_H);
      sc.drawImage(photo, BORDER, BORDER, 402, 303);
      size();
      stage.insertBefore(canvas, front);
      stage.classList.add("has-canvas");      // hides the flat fallback photo
      if (reduce) { draw(1, 1); return; }
      draw(0, 0);
      if ("IntersectionObserver" in window) {
        // print once, the first time the printer scrolls into view
        var io = new IntersectionObserver(function (en) {
          if (en[0].isIntersecting) { io.disconnect(); running = true; t0 = null; requestAnimationFrame(tick); }
        }, { threshold: 0.3 });
        io.observe(stage);
      } else { running = true; requestAnimationFrame(tick); }
    }
    window.addEventListener("resize", function () { size(); if (!running) draw(reduce || done ? 1 : 0, 1); });
    if (photo.complete && photo.naturalWidth) ready(); else photo.addEventListener("load", ready);
  })();