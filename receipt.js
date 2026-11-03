/* Pixelle — order receipt (acknowledgement.html).
   Reads the order saved at payment (sessionStorage "pixelle-order"), fills the receipt,
   then "prints" it once with GSAP. Refreshing only shows the same receipt again: no new order is made. */
(function () {
  "use strict";

  var page = document.querySelector(".rc-page");
  if (!page) return;

  var order = null;
  try { order = JSON.parse(sessionStorage.getItem("pixelle-order") || "null"); } catch (err) { order = null; }

  function money(n) { return "S$" + Number(n || 0).toFixed(2); }
  function esc(v) { var el = document.createElement("span"); el.textContent = v == null ? "" : String(v); return el.innerHTML; }
  function $(sel) { return page.querySelector(sel); }

  // No order in this tab (e.g. someone opened the page directly): show a friendly message instead.
  if (!order || !order.items) {
    $("[data-rc-head]").hidden = true;
    $("[data-rc-machine]").hidden = true;
    $("[data-rc-after]").hidden = true;
    $("[data-rc-empty]").hidden = false;
    return;
  }

  /* ---------- fill the receipt ---------- */
  var date = new Date(order.date);
  if (order.first) $("[data-rc-title]").innerHTML = "your order is in, " + esc(order.first.charAt(0).toUpperCase() + order.first.slice(1)) + '! <i class="fa-regular fa-heart" aria-hidden="true"></i>';
  $("[data-rc-no]").textContent = "#" + order.no;
  $("[data-rc-date]").textContent = date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
  $("[data-rc-pay]").textContent = order.pay;
  $("[data-rc-ship]").innerHTML = esc(order.method) + "<small>" + esc(order.eta) + "</small>";

  var items = order.items.map(function (i) {
    return "<li><strong>" + esc(i.name) + "</strong><span>" + money(i.price) + "</span><small>" + esc(i.detail) + "</small></li>";
  }).join("");
  if (order.gift) items += '<li class="rc-reward"><strong>Free sticker merch &#9825;</strong><span>FREE</span><small>Reward unlocked!</small></li>';
  $("[data-rc-items]").innerHTML = items;

  var sums = "<div><dt>Subtotal</dt><dd>" + money(order.sub) + "</dd></div>";
  if (order.off) sums += '<div class="rc-discount"><dt>Discount (' + esc(order.code) + ")</dt><dd>-" + money(order.off) + "</dd></div>";
  sums += "<div><dt>Shipping</dt><dd>" + (order.ship ? money(order.ship) : "FREE") + "</dd></div>";
  $("[data-rc-sums]").innerHTML = sums;
  $("[data-rc-total]").textContent = money(order.total);
  $("[data-rc-gst]").textContent = "Includes " + money(order.gst) + " GST";
  $("[data-rc-no2]").textContent = order.no.replace(/-/g, "");

  // decorative barcode generated from the order number
  (function drawBarcode() {
    var svg = $("[data-rc-barcode]");
    var code = order.no.replace(/-/g, "");
    var x = 0, bars = "";
    var widths = [];
    for (var i = 0; i < code.length; i++) {
      var c = code.charCodeAt(i);
      for (var b = 0; b < 6; b++) widths.push(((c >> b) & 1) + 1, ((c >> (b + 1)) & 1) + 1);
    }
    widths = [2, 1, 1, 1].concat(widths, [2, 1, 1, 1]);
    widths.forEach(function (w, k) {
      if (k % 2 === 0) bars += '<rect x="' + x + '" y="0" width="' + w + '" height="40" />';
      x += w;
    });
    svg.setAttribute("viewBox", "0 0 " + x + " 40");
    svg.innerHTML = '<g fill="#3A4A43">' + bars + "</g>";
  })();

  $("[data-rc-print]").addEventListener("click", function () { window.print(); });

  /* ---------- print it (first view only) ---------- */
  var gsap = window.gsap;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!gsap || reduce || order.printed) return;   // just show the finished receipt

  order.printed = true;
  try { sessionStorage.setItem("pixelle-order", JSON.stringify(order)); } catch (err) { /* ignore */ }

  var paper = $("[data-rc-paper]");
  var after = $("[data-rc-after]");
  var led = $("[data-rc-led]");
  var head = $("[data-rc-head]");

  var tl = gsap.timeline();
  gsap.set(paper, { yPercent: -100 });
  gsap.set(after, { autoAlpha: 0, y: 12 });
  gsap.set(head, { autoAlpha: 0, y: 10 });

  tl.to(head, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out" })
    // the printer "wakes up": LED blinks while the paper feeds
    .to(led, { opacity: 0.25, duration: 0.18, repeat: 13, yoyo: true, ease: "none" }, 0.3)
    // thermal-printer feed: small steps with a soft settle at the end
    .to(paper, { yPercent: -6, duration: 2.3, ease: "steps(22)" }, 0.45)
    .to(paper, { yPercent: 0, duration: 0.45, ease: "back.out(2)" })
    .add(confetti)
    .to(after, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out" }, "-=0.1");

  function confetti() {
    var colours = ["#B9D2BC", "#5E7D6E", "#EDE1C8", "#EBB1AA", "#F4E2B0"];
    for (var i = 0; i < 36; i++) {
      var bit = document.createElement("span");
      bit.className = "rc-bit";
      bit.setAttribute("aria-hidden", "true");
      bit.style.background = colours[i % colours.length];
      if (i % 3 === 0) bit.style.borderRadius = "50%";
      head.appendChild(bit);
      var angle = Math.random() * Math.PI * 2;
      var dist = 90 + Math.random() * 150;
      gsap.fromTo(bit,
        { x: 0, y: 0, rotation: 0, scale: 0.4, opacity: 1 },
        {
          x: Math.cos(angle) * dist * 1.4, y: Math.sin(angle) * dist * 0.55 + 30,
          rotation: (Math.random() - 0.5) * 540, scale: 1, opacity: 0,
          duration: 1.3 + Math.random() * 0.6, ease: "power2.out",
          onComplete: function () { this.targets()[0].remove(); }
        });
    }
  }
})();
