/* Pixelle — Shop page (purchase.html): real product photo gallery that follows the chosen colour. */
(function () {
  "use strict";

  // Photos for each colour (images/purchase/): [file, alt text]
  var GALLERY = {
    sage: [
      ["images/purchase/Pixelle-SageMist-02.png", "Pixelle Snap in Sage Mist printing a landscape photo"],
      ["images/purchase/Pixelle-SageMist-01.png", "Pixelle Snap in Sage Mist, front view"]
    ],
    coral: [
      ["images/purchase/Pixelle-BlushPink-02.png", "Pixelle Snap in Blush Pink printing a landscape photo"],
      ["images/purchase/Pixelle-BlushPink-01.png", "Pixelle Snap in Blush Pink, front view"]
    ],
    cream: [
      ["images/purchase/Pixelle-CloudCream-02.png", "Pixelle Snap in Cloud Cream printing a landscape photo"],
      ["images/purchase/Pixelle-CloudCream-01.png", "Pixelle Snap in Cloud Cream, front view"]
    ]
  };

  // What's in the box, per bundle and colour (shown as the first photo)
  var BUNDLE_SHOTS = {
    starter: {
      sage: "images/purchase/StarterBundle-SageMist.png",
      coral: "images/purchase/StarterBundle-BlushPink.png",
      cream: "images/purchase/StarterBundle-CloudCream.png"
    },
    creator: {
      sage: "images/purchase/Sage%20Green%20Pixelle%20Printer%20Kit.png",
      coral: "images/purchase/Blush%20Pink%20Pixelle%20Printer%20Bundle.png",
      cream: "images/purchase/Pixelle%20Creator%20Bundle%20in%20Cream%20Tones.png"
    }
  };
  var BUNDLE_ALT = {
    starter: "Starter Bundle in COLOUR: printer, USB-C cable and 30 polaroid photo sheets",
    creator: "Creator Bundle in COLOUR: printer, USB-C cable, 60 polaroid photo sheets, travel pouch and sticker set"
  };
  var COLOUR_LABEL = { sage: "Sage Mist", coral: "Blush Pink", cream: "Cloud Cream" };

  function currentBundle() {
    var r = document.querySelector('input[name="bundle"]:checked');
    return r && BUNDLE_SHOTS[r.value] ? r.value : "creator";
  }

  var carouselEl = document.getElementById("product-carousel");
  var inner = document.querySelector("[data-gallery]");
  var thumbs = document.querySelector("[data-gallery-thumbs]");
  if (!carouselEl || !inner || !thumbs) return;

  function setActiveThumb(index) {
    thumbs.querySelectorAll("button").forEach(function (b, i) {
      b.classList.toggle("active", i === index);
      if (i === index) b.setAttribute("aria-current", "true");
      else b.removeAttribute("aria-current");
    });
  }

  function build(colour) {
    if (!GALLERY[colour]) colour = "sage";
    var bundle = currentBundle();
    var shots = [[BUNDLE_SHOTS[bundle][colour], BUNDLE_ALT[bundle].replace("COLOUR", COLOUR_LABEL[colour])]].concat(GALLERY[colour]);
    inner.innerHTML = "";
    thumbs.innerHTML = "";
    shots.forEach(function (shot, i) {
      var item = document.createElement("div");
      item.className = "carousel-item" + (i === 0 ? " active" : "");
      var img = document.createElement("img");
      img.src = shot[0];
      img.alt = shot[1];
      img.className = "d-block mx-auto" + (shot[2] ? " shop-gallery-lifestyle" : "");
      item.appendChild(img);
      inner.appendChild(item);

      var btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("data-bs-target", "#product-carousel");
      btn.setAttribute("data-bs-slide-to", String(i));
      btn.setAttribute("aria-label", "Photo " + (i + 1) + " of " + shots.length);
      var thumb = document.createElement("img");
      thumb.src = shot[0];
      thumb.alt = "";
      btn.appendChild(thumb);
      thumbs.appendChild(btn);
    });
    setActiveThumb(0);
    var single = shots.length < 2;
    carouselEl.classList.toggle("single", single);
    thumbs.hidden = single;
  }

  carouselEl.addEventListener("slid.bs.carousel", function (e) { setActiveThumb(e.to); });

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Load every colour's photos up front so switching colour never flashes empty.
  Object.keys(GALLERY).forEach(function (key) {
    GALLERY[key].forEach(function (shot) { new Image().src = shot[0]; });
  });
  Object.keys(BUNDLE_SHOTS).forEach(function (b) {
    Object.keys(BUNDLE_SHOTS[b]).forEach(function (c) { new Image().src = BUNDLE_SHOTS[b][c]; });
  });

  /* ---------- smooth colour switching: fade out, swap photos, fade in ---------- */
  var FADE_MS = 220;
  var current = null;
  var switchTimer = null;
  var currentKey = null;
  function switchColour(colour) {
    var key = colour + "|" + currentBundle();
    if (key === currentKey) return;
    currentKey = key;
    current = colour;
    if (reduceMotion) { build(colour); return; }
    clearTimeout(switchTimer);
    carouselEl.classList.add("is-switching");
    thumbs.classList.add("is-switching");
    switchTimer = setTimeout(function () {
      build(colour);
      // let the new photos render at opacity 0 before fading them back in
      requestAnimationFrame(function () {
        carouselEl.classList.remove("is-switching");
        thumbs.classList.remove("is-switching");
      });
    }, FADE_MS);
  }

  document.querySelectorAll(".product-image[data-colour]").forEach(function (btn) {
    btn.addEventListener("click", function () { switchColour(btn.getAttribute("data-colour")); });
  });

  // changing bundle swaps the "what's in the box" photo and jumps back to it
  document.querySelectorAll('input[name="bundle"]').forEach(function (r) {
    r.addEventListener("change", function () { switchColour(current); });
  });

  var selected = document.querySelector(".product-image.selected[data-colour]");
  current = selected ? selected.getAttribute("data-colour") : "sage";
  currentKey = current + "|" + currentBundle();
  build(current);

  /* ---------- cursor tilt (hover) + click-to-zoom ---------- */
  var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var MAX_TILT = 9;   // degrees
  var ZOOM = 2.5;     // magnification when zoomed
  var target = { x: 0, y: 0 };
  var now = { x: 0, y: 0 };
  var raf = null;
  var zoomed = false;
  var zoomBtn = carouselEl.querySelector("[data-zoom-toggle]");

  function animateTilt() {
    // ease towards the target for a smooth, weighty feel
    now.x += (target.x - now.x) * 0.12;
    now.y += (target.y - now.y) * 0.12;
    carouselEl.style.setProperty("--tilt-x", now.x.toFixed(2) + "deg");
    carouselEl.style.setProperty("--tilt-y", now.y.toFixed(2) + "deg");
    if (Math.abs(target.x - now.x) > 0.01 || Math.abs(target.y - now.y) > 0.01) {
      raf = requestAnimationFrame(animateTilt);
    } else {
      raf = null;
    }
  }
  function kickTilt() { if (!raf) raf = requestAnimationFrame(animateTilt); }

  // where the pointer is inside the photo card, as 0–1 fractions
  function pointerPos(e) {
    var r = carouselEl.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
    };
  }
  function setZoomOrigin(pos) {
    carouselEl.style.setProperty("--zoom-x", (pos.x * 100).toFixed(1) + "%");
    carouselEl.style.setProperty("--zoom-y", (pos.y * 100).toFixed(1) + "%");
  }

  function setZoom(on, pos) {
    if (on === zoomed) return;
    zoomed = on;
    if (pos) setZoomOrigin(pos);
    else if (on) setZoomOrigin({ x: 0.5, y: 0.5 });
    // straighten the product while zoomed so details stay sharp and still
    target.x = 0;
    target.y = 0;
    kickTilt();
    carouselEl.classList.add("zoom-anim");
    carouselEl.classList.toggle("is-zoomed", on);
    carouselEl.style.setProperty("--zoom", on ? String(ZOOM) : "1");
    setTimeout(function () { carouselEl.classList.remove("zoom-anim"); }, 350);
    if (zoomBtn) {
      zoomBtn.setAttribute("aria-pressed", on ? "true" : "false");
      zoomBtn.setAttribute("aria-label", on ? "Zoom out" : "Zoom in on photo");
      zoomBtn.querySelector("i").className = on ? "fa-solid fa-magnifying-glass-minus" : "fa-solid fa-magnifying-glass-plus";
    }
  }

  // click / tap the photo to zoom in at that spot; click again to zoom out
  inner.addEventListener("click", function (e) {
    setZoom(!zoomed, pointerPos(e));
  });
  if (zoomBtn) zoomBtn.addEventListener("click", function () { setZoom(!zoomed); });
  // leaving the photo, changing photo or changing colour resets the zoom
  carouselEl.addEventListener("slide.bs.carousel", function () { setZoom(false); });
  document.querySelectorAll('input[name="bundle"]').forEach(function (r) {
    r.addEventListener("change", function () { setZoom(false); });
  });
  document.querySelectorAll(".product-image[data-colour]").forEach(function (btn) {
    btn.addEventListener("click", function () { setZoom(false); });
  });

  carouselEl.addEventListener("pointermove", function (e) {
    if (zoomed) {
      // pan: the zoom follows the pointer so every part of the printer can be inspected
      setZoomOrigin(pointerPos(e));
      return;
    }
    if (reduceMotion || !canHover || e.pointerType !== "mouse") return;
    var pos = pointerPos(e);
    target.x = -(pos.y - 0.5) * MAX_TILT * 2; // tip towards the cursor vertically
    target.y = (pos.x - 0.5) * MAX_TILT * 2;  // turn towards the cursor horizontally
    carouselEl.classList.add("is-tilting");
    kickTilt();
  });
  carouselEl.addEventListener("pointerleave", function (e) {
    if (e.pointerType === "mouse") setZoom(false);
    target.x = 0;
    target.y = 0;
    carouselEl.classList.remove("is-tilting");
    kickTilt();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && zoomed) setZoom(false);
  });

  /* ---------- add-to-cart microinteraction (GSAP) ---------- */
  var badge = document.querySelector("[data-cart-count]");
  var bag = badge ? badge.closest("a") : null;

  function cartTotal() {
    try {
      return JSON.parse(localStorage.getItem("pixelle-cart") || "[]").reduce(function (n, i) { return n + (i.qty || 0); }, 0);
    } catch (err) { return 0; }
  }

  // where the bag icon is on screen (or the top-right corner if it has scrolled away)
  function bagPoint() {
    var r = bag.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) return { x: window.innerWidth - 36, y: 18 };
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function onScreen(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    var cy = r.top + r.height / 2;
    return r.width > 0 && cy > 80 && cy < window.innerHeight - 80; // comfortably on screen
  }

  function makeFlyer(fromEl, isPaper, src) {
    var r = fromEl.getBoundingClientRect();
    var size = Math.min(160, Math.max(56, Math.min(r.width, r.height)));
    var el;
    if (isPaper) {
      el = document.createElement("div");
      el.className = "shop-flyer shop-flyer-paper";
      el.innerHTML = '<i class="fa-solid fa-note-sticky" aria-hidden="true"></i>';
    } else {
      el = document.createElement("img");
      el.className = "shop-flyer";
      el.src = src;
      el.alt = "";
    }
    el.setAttribute("aria-hidden", "true");
    el.style.width = size + "px";
    el.style.height = size + "px";
    el.style.left = (r.left + r.width / 2 - size / 2) + "px";
    el.style.top = (r.top + r.height / 2 - size / 2) + "px";
    document.body.appendChild(el);
    return { el: el, size: size, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  }

  function flyToBag(source, isPaper, before, after) {
    var gsap = window.gsap;
    if (!badge || !bag || !gsap || reduceMotion || !source) return; // count already updated by the cart script
    // hold the old number until the product "lands"
    badge.textContent = before ? String(before) : "";
    var f = makeFlyer(source.from, isPaper, source.src);
    var end = bagPoint();
    var dx = end.x - f.cx;
    var dy = end.y - f.cy;
    var tl = gsap.timeline({
      onComplete: function () {
        f.el.remove();
        badge.textContent = String(after);
        gsap.fromTo(badge, { scale: 0.3 }, { scale: 1, duration: 0.6, ease: "elastic.out(1.1, 0.4)" });
        gsap.fromTo(bag, { rotation: -14 }, { rotation: 0, duration: 0.7, ease: "elastic.out(1, 0.3)", transformOrigin: "50% 20%" });
      }
    });
    tl.to(f.el, { duration: 0.18, scale: 1.08, ease: "power1.out" })
      // separate eases on x and y draw a curved path up into the bag
      .to(f.el, { duration: 0.8, x: dx, ease: "power1.inOut" }, ">")
      .to(f.el, { duration: 0.8, y: dy, ease: "back.in(1.6)" }, "<")
      .to(f.el, { duration: 0.8, scale: 0.12, rotation: 12, opacity: 0.85, ease: "power2.in" }, "<");
  }

  // record the cart total before the cart script runs, then compare after it has added the item
  function wireAddButton(btn, sourceEl, isPaper) {
    var before = 0;
    btn.addEventListener("click", function () { before = cartTotal(); }, true);
    btn.addEventListener("click", function () {
      var after = cartTotal();
      if (after > before) flyToBag(sourceEl(), isPaper, before, after);
    });
  }

  var addBtn = document.getElementById("add-to-cart");
  if (addBtn) {
    wireAddButton(addBtn, function () {
      var photo = carouselEl.querySelector(".carousel-item.active img");
      var swatch = document.querySelector(".product-image.selected img");
      // start from whatever is visible: the big photo, else the colour tile, else the button itself
      var from = onScreen(photo) ? photo : onScreen(swatch) ? swatch : addBtn;
      return { from: from, src: photo ? (photo.currentSrc || photo.src) : swatch.src };
    }, false);
  }
  document.querySelectorAll("[data-add-refill]").forEach(function (b) {
    wireAddButton(b, function () { return { from: b, src: "" }; }, true);
  });
})();
