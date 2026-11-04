/* Pixelle — site interactions (scroll animations, cart, studio, forms, PDPA consent) */
(function () {
  "use strict";

  /* ---------- safe storage (private browsing can throw) ---------- */
  function load(store, key, fallback) {
    try {
      var v = store.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function save(store, key, value) {
    try {
      store.setItem(key, JSON.stringify(value));
    } catch (e) { /* ignore */ }
  }
  var LS = window.localStorage, SS = window.sessionStorage;

  /* ---------- scrolling animation: fade-up & slide-right ---------- */
  var animated = document.querySelectorAll(".fade-up, .slide-right");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add(en.target.classList.contains("fade-up") ? "fade-upVisible" : "slide-right-visible");
        io.unobserve(en.target);
      });
    }, { threshold: 0.12 });
    animated.forEach(function (el) { io.observe(el); });
  } else {
    animated.forEach(function (el) { el.classList.add("fade-upVisible", "slide-right-visible"); });
  }

  /* ---------- sticky horizontal scroll (overview feature highlights) ---------- */
  var stickySections = Array.prototype.slice.call(document.querySelectorAll(".sticky"));
  function transformSection(section) {
    var parent = section.parentElement;
    var scrollSection = section.querySelector(".horizontal-scroll");
    var slides = scrollSection.children.length;
    var max = (slides - 1) * 100;
    var percentage = ((window.scrollY - parent.offsetTop) / window.innerHeight) * 100;
    percentage = percentage < 0 ? 0 : percentage > max ? max : percentage;
    scrollSection.style.transform = "translate3d(" + -percentage + "vw,0,0)";
  }
  if (stickySections.length) {
    window.addEventListener("scroll", function () { stickySections.forEach(transformSection); }, { passive: true });
  }

  /* ---------- toast ---------- */
  function showToast(msg) {
    var el = document.getElementById("toast");
    if (!el || !window.bootstrap) return;
    document.getElementById("toast-body").textContent = msg;
    bootstrap.Toast.getOrCreateInstance(el, { delay: 2200 }).show();
  }

  /* ---------- PDPA cookie consent ---------- */
  var banner = document.getElementById("cookie-banner");
  if (banner) {
    if (!load(LS, "pixelle-consent", null)) banner.classList.add("show");
    banner.addEventListener("click", function (e) {
      var choice = e.target.getAttribute("data-consent");
      if (!choice) return;
      save(LS, "pixelle-consent", { choice: choice, at: new Date().toISOString() });
      banner.classList.remove("show");
      document.dispatchEvent(new Event("pixelle:consent"));
      // Analytics would only be loaded here when choice === "all".
    });
  }
  document.querySelectorAll("[data-open-cookies]").forEach(function (b) {
    b.addEventListener("click", function () { banner.classList.add("show"); });
  });

  /* ---------- Pixelle Club member pop-up ---------- */
  var memberModal = document.getElementById("memberModal");
  var memberTab = document.querySelector(".member-tab");
  var NO_POPUP = /(cart|checkout|payment|acknowledgement|pdpa)\.html$/;
  function isMember() { return load(LS, "pixelle-member", false); }
  function showMemberState(name) {
    var member = isMember();
    document.getElementById("member-join").hidden = member;
    document.getElementById("member-done").hidden = !member;
    if (name) document.getElementById("member-name").textContent = ", " + name.toUpperCase();
    if (memberTab) memberTab.hidden = member || NO_POPUP.test(location.pathname);
  }
  function joinClub(name) {
    // Only a "member" flag is kept in the browser; name and email are not stored.
    save(LS, "pixelle-member", true);
    showMemberState(name);
  }
  function openMember() {
    if (!memberModal || !window.bootstrap) return;
    showMemberState();
    bootstrap.Modal.getOrCreateInstance(memberModal).show();
  }
  function scheduleMember() {
    if (isMember() || NO_POPUP.test(location.pathname)) return;
    if (Date.now() - load(LS, "pixelle-member-dismissed", 0) < 7 * 864e5) return;
    setTimeout(function () {
      if (!document.querySelector(".modal.show") && !isMember()) openMember();
    }, 4000);
  }
  if (memberModal) {
    showMemberState();
    memberModal.addEventListener("hidden.bs.modal", function () {
      if (!isMember()) save(LS, "pixelle-member-dismissed", Date.now());
    });
    document.querySelectorAll("[data-open-member]").forEach(function (b) {
      b.addEventListener("click", function (e) { e.preventDefault(); openMember(); });
    });
    // Show the offer a few seconds after landing, whether or not the cookie banner has been answered.
    scheduleMember();
  }

  /* ---------- live social proof (DEMO DATA: replace with real analytics / order counts) ---------- */
  var viewersEls = document.querySelectorAll("[data-viewers]");
  if (viewersEls.length) {
    var viewers = 9 + Math.floor(Math.random() * 10);
    var tick = function () {
      viewers = Math.min(30, Math.max(6, viewers + Math.floor(Math.random() * 5) - 2));
      viewersEls.forEach(function (el) { el.textContent = viewers; });
      setTimeout(tick, 4000 + Math.random() * 3000);
    };
    tick();
  }

  /* ---------- member account (demo: no real authentication) ---------- */
  function getUser() { return load(SS, "pixelle-user", null) || load(LS, "pixelle-user", null); }
  function setUser(first, remember) {
    // Only a first name is kept in the browser so we can greet the member. Passwords are never stored.
    var u = { first: first };
    save(remember ? LS : SS, "pixelle-user", u);
  }
  function logout() {
    try { SS.removeItem("pixelle-user"); LS.removeItem("pixelle-user"); } catch (e) { /* ignore */ }
  }
  function titleCase(t) { return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase(); }
  function renderAccount() {
    var u = getUser();
    document.querySelectorAll("[data-account-name]").forEach(function (el) { el.textContent = u ? u.first : ""; });
    var auth = document.getElementById("account-auth");
    if (!auth) return;
    var dash = document.getElementById("account-dashboard");
    auth.hidden = !!u;
    dash.hidden = !u;
    if (!u) return;
    document.querySelectorAll("[data-account-first]").forEach(function (el) { el.textContent = u.first.toUpperCase(); });
    document.querySelectorAll("[data-account-first-card]").forEach(function (el) { el.textContent = u.first; });
    var order = load(SS, "pixelle-order", null);
    if (order) document.querySelector("[data-account-orders]").textContent = "Order " + order.no + " · " + order.total + " · Confirmed";
    if (load(LS, "pixelle-fav", false)) document.querySelector("[data-account-fav]").textContent = "Pixelle Snap ♥";
  }
  document.querySelectorAll("[data-logout]").forEach(function (b) {
    b.addEventListener("click", function () {
      logout();
      renderAccount();
      var loginTab = document.querySelector('[data-bs-target="#login-pane"]');
      if (loginTab && window.bootstrap) bootstrap.Tab.getOrCreateInstance(loginTab).show();
      window.scrollTo(0, 0);
    });
  });
  document.querySelectorAll("[data-pw-toggle]").forEach(function (b) {
    b.addEventListener("click", function () {
      var input = document.getElementById(b.getAttribute("data-pw-toggle"));
      var show = input.type === "password";
      input.type = show ? "text" : "password";
      b.setAttribute("aria-label", show ? "Hide password" : "Show password");
      b.querySelector("i").className = show ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
    });
  });
  document.querySelectorAll("[data-forgot]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      var status = a.closest("form").querySelector("[data-status]");
      status.style.color = "#2F6F5E";
      status.textContent = "If an account exists for that email, we've sent a password reset link.";
    });
  });

  /* ---------- cart ---------- */
  var PRODUCTS = {
    starter: { name: "Pixelle Snap · Starter Bundle", price: 59.9 },
    creator: { name: "Pixelle Snap · Creator Bundle", price: 69.9 },
    refill30: { name: "Sticker Paper · 30 sheets", price: 19.9 },
    refill60: { name: "Sticker Paper · 60 sheets", price: 29.9 },
  };
  /* Two-stage cart rewards, based on the item subtotal before promo codes. */
  var GIFT_MIN = 70;          // stage 1: free sticker merch
  var FREE_SHIP_MIN = 99;     // stage 2: free delivery
  var SHIPPING_FEE = 4.9;     // delivery fee below FREE_SHIP_MIN
  var PHOTO = { sage: "SageMist", coral: "BlushPink", cream: "CloudCream" };
  var REFILL_PHOTO = {
    refill30: "images/purchase/Pixelle%2030-sheet%20Sticker%20Sheets.png",
    refill60: "images/purchase/Pixelle%2060-Sheet%20Polaroid%20Sticker%20Box.png"
  };
  var EXPRESS_FEE = 9.9;      // express delivery is always charged
  var SHIP_METHODS = {
    standard: { label: "Standard delivery", eta: "Next working day" },
    express: { label: "Express delivery", eta: "Same day if you order by 12 PM" }
  };
  function shipMethod() { var m = load(SS, "pixelle-ship", "standard"); return SHIP_METHODS[m] ? m : "standard"; }
  function shipFee(method, sub) { return method === "express" ? EXPRESS_FEE : sub >= FREE_SHIP_MIN ? 0 : SHIPPING_FEE; }
  var PROMOS = { PIXELCLUB10: { pct: 10, min: 0, label: "10% off first order (member)" } };
  var COLOUR_NAMES = { sage: "Sage Mist", coral: "Blush Pink", cream: "Cloud Cream" };
  var COLOUR_HEX = { sage: "#B9D2BC", coral: "#EBB1AA", cream: "#EDE1C8" };

  function getCart() {
    // Skip items saved under colours we no longer sell (e.g. the retired Deep Evergreen).
    // (and products we no longer sell, e.g. the old 50/100-sheet refills)
    return load(LS, "pixelle-cart", []).filter(function (i) { return PRODUCTS[i.sku] && (!i.colour || COLOUR_NAMES[i.colour]); });
  }
  function setCart(c) { save(LS, "pixelle-cart", c); renderCount(); }
  function money(n) { return "S$" + n.toFixed(2); }
  function renderCount() {
    var n = getCart().reduce(function (s, i) { return s + i.qty; }, 0);
    document.querySelectorAll("[data-cart-count]").forEach(function (el) { el.textContent = n ? n : ""; });
  }
  function addItem(sku, colour, qty) {
    var cart = getCart();
    var key = sku + "|" + (colour || "");
    var found = cart.filter(function (i) { return i.key === key; })[0];
    if (found) found.qty += qty;
    else cart.push({ key: key, sku: sku, colour: colour || null, qty: qty, gift: false });
    setCart(cart);
  }
  function totals(cart) {
    var sub = cart.reduce(function (s, i) { return s + PRODUCTS[i.sku].price * i.qty; }, 0);
    var code = load(SS, "pixelle-promo", null);
    var promo = code && PROMOS[code] && sub >= PROMOS[code].min ? PROMOS[code] : null;
    var off = promo ? Math.round(sub * promo.pct) / 100 : 0;
    var gift = sub >= GIFT_MIN;
    var method = shipMethod();
    var ship = cart.length ? shipFee(method, sub) : 0;
    var total = Math.max(0, sub - off) + ship;
    return { sub: sub, promo: promo, code: code, off: off, gift: gift, ship: ship, method: method, total: total, gst: total * 9 / 109 };
  }
  // 0 = nothing unlocked, 1 = free sticker merch, 2 = merch + free delivery
  function rewardTier(sub) { return sub >= FREE_SHIP_MIN ? 2 : sub >= GIFT_MIN ? 1 : 0; }
  function rewardHint(sub) {
    if (sub >= FREE_SHIP_MIN) return "You've unlocked free sticker merch and free delivery!";
    if (sub >= GIFT_MIN) return "Add " + money(FREE_SHIP_MIN - sub) + " more for free delivery.";
    return "Add " + money(GIFT_MIN - sub) + " more for free sticker merch.";
  }
  renderCount();

  /* ---------- purchase page ---------- */
  var buy = document.getElementById("purchase");
  if (buy) {
    var state = { colour: "sage", sku: "creator" };
    var stage = document.getElementById("product-carousel");
    var priceEl = document.getElementById("price");
    var wasEl = document.getElementById("price-was");
    var colourLabel = document.getElementById("colour-name");
    var WAS = { starter: 79.9, creator: 89.9 };
    function paint() {
      var c = state.colour;
      stage.querySelectorAll(".printer-svg").forEach(function (svg) {
        var src = document.querySelector('.product-image[data-colour="' + c + '"] .printer-svg');
        ["--body-top", "--body-bottom", "--logo"].forEach(function (v) { svg.style.setProperty(v, src.style.getPropertyValue(v)); });
      });
      colourLabel.textContent = COLOUR_NAMES[c];
      priceEl.textContent = money(PRODUCTS[state.sku].price);
      wasEl.textContent = money(WAS[state.sku]);
      renderStock();
    }
    /* Stock per colour. DEMO DATA: in production this comes from the inventory system. */
    var STOCK = { sage: 23, coral: 9, cream: 6 };
    var addBtn = document.getElementById("add-to-cart");
    function renderStock() {
      var c = state.colour;
      var inCart = getCart().filter(function (i) { return i.colour === c; }).reduce(function (n, i) { return n + i.qty; }, 0);
      var left = Math.max(0, STOCK[c] - inCart);
      var box = document.getElementById("stock-alert");
      var text = document.getElementById("stock-text");
      box.className = "stock-alert" + (left === 0 ? " out" : left <= 10 ? " urgent" : "");
      if (left === 0) text.innerHTML = '<i class="fa-solid fa-ban"></i> Sold out in ' + COLOUR_NAMES[c] + ". Choose another colour.";
      else if (left <= 10) text.innerHTML = '<i class="fa-solid fa-fire"></i> Hurry! Only <strong>' + left + "</strong> left in " + COLOUR_NAMES[c] + ". Order soon.";
      else text.innerHTML = '<i class="fa-solid fa-circle-check"></i> In stock: ' + left + " available in " + COLOUR_NAMES[c] + ", ships tomorrow";
      document.getElementById("stock-fill").style.width = Math.min(100, left / 30 * 100) + "%";
      addBtn.disabled = left === 0;
      addBtn.innerHTML = left === 0 ? "Sold out" : '<i class="fa-solid fa-bag-shopping"></i> Add to Cart';
    }
    document.querySelectorAll(".product-image").forEach(function (img) {
      img.addEventListener("click", function () {
        document.querySelectorAll(".product-image").forEach(function (i) { i.classList.remove("selected"); i.setAttribute("aria-pressed", "false"); });
        img.classList.add("selected");
        img.setAttribute("aria-pressed", "true");
        state.colour = img.getAttribute("data-colour");
        paint();
      });
    });
    document.querySelectorAll('input[name="bundle"]').forEach(function (r) {
      r.addEventListener("change", function () { state.sku = r.value; paint(); });
    });
    document.getElementById("add-to-cart").addEventListener("click", function () {
      var qty = Math.max(1, parseInt(document.getElementById("qty").value, 10) || 1);
      var c = state.colour;
      var left = STOCK[c] - getCart().filter(function (i) { return i.colour === c; }).reduce(function (n, i) { return n + i.qty; }, 0);
      if (qty > left) { showToast("Sorry, only " + left + " left in " + COLOUR_NAMES[c] + "."); return; }
      addItem(state.sku, state.colour, qty);
      renderStock();
      showToast("Added " + qty + " × " + PRODUCTS[state.sku].name + " (" + COLOUR_NAMES[state.colour] + ") to cart. " + rewardHint(totals(getCart()).sub));
    });
    document.querySelectorAll("[data-add-refill]").forEach(function (b) {
      b.addEventListener("click", function () {
        addItem(b.getAttribute("data-add-refill"), null, 1);
        showToast("Added " + PRODUCTS[b.getAttribute("data-add-refill")].name + " to cart. " + rewardHint(totals(getCart()).sub));
      });
    });
    var fav = document.getElementById("favourite");
    var favs = load(LS, "pixelle-fav", false);
    function paintFav() {
      fav.setAttribute("aria-pressed", favs ? "true" : "false");
      fav.querySelector("i").className = favs ? "fa-solid fa-heart" : "fa-regular fa-heart";
    }
    fav.addEventListener("click", function () { favs = !favs; save(LS, "pixelle-fav", favs); paintFav(); showToast(favs ? "Saved to favourites" : "Removed from favourites"); });
    paintFav();
    paint();
  }

  /* ---------- cart page ---------- */
  var cartBody = document.getElementById("cart-items");
  function renderCart() {
    var cart = getCart();
    var empty = document.getElementById("cart-empty");
    var summary = document.getElementById("cart-summary");
    cartBody.innerHTML = "";
    empty.hidden = cart.length !== 0;
    summary.hidden = cart.length === 0;
    cart.forEach(function (item, idx) {
      var p = PRODUCTS[item.sku];
      var row = document.createElement("tr");
      var swatch = item.colour
        ? '<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:' + COLOUR_HEX[item.colour] + ';margin-right:6px;vertical-align:middle"></span>Colour: ' + COLOUR_NAMES[item.colour] + "<br />"
        : "";
      var thumb = item.colour
        ? '<img src="images/purchase/Pixelle-' + PHOTO[item.colour] + '-01.png" alt="" style="width:100%;height:100%;object-fit:contain" />'
        : '<img src="' + REFILL_PHOTO[item.sku] + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:12px" />';
      row.innerHTML =
        '<td><div class="d-flex gap-3 align-items-start"><div class="cart-thumb" style="width:72px;height:72px;border-radius:12px;background:' +
        (item.colour ? "#fff;border:1px solid #e7e5e4;padding:4px" : "#fff;border:1px solid #e7e5e4;overflow:hidden") + ';display:grid;place-items:center;color:#fff;font-size:28px;flex:none">' +
        thumb + "</div>" +
        '<div><h5 style="font-size:17px;margin-bottom:4px">' + p.name + '</h5><p style="margin:0"><small>' + swatch +
        (item.colour ? '<label><input type="checkbox" data-gift="' + idx + '"' + (item.gift ? " checked" : "") + ' /> Gift wrapping (free)</label>' : "") +
        "</small></p></div></div></td>" +
        "<td>" + money(p.price) + "</td>" +
        '<td><label class="visually-hidden" for="q' + idx + '">Quantity</label><input class="qty-input" id="q' + idx + '" type="number" min="1" max="10" value="' + item.qty + '" data-qty="' + idx + '" /></td>' +
        '<td><div class="d-flex justify-content-between align-items-center gap-2"><span>' + money(p.price * item.qty) + '</span>' +
        '<button class="btn btn-link p-0" data-remove="' + idx + '" aria-label="Remove ' + p.name + '"><i class="fa-regular fa-trash-can" style="color:#2E4A42"></i></button></div></td>';
      cartBody.appendChild(row);
    });
    var t = totals(cart);
    if (t.gift) {
      // stage-1 reward appears as its own free line
      var giftRow = document.createElement("tr");
      giftRow.className = "cart-gift-row";
      giftRow.innerHTML =
        '<td><div class="d-flex gap-3 align-items-center"><div class="cart-thumb cart-gift-thumb"><i class="fa-solid fa-gift" aria-hidden="true"></i></div>' +
        '<div><h5 style="font-size:17px;margin-bottom:4px">Pixelle sticker merch</h5><p style="margin:0"><small>Free gift for spending ' + money(GIFT_MIN) + " or more</small></p></div></div></td>" +
        '<td><s>' + money(9.9) + '</s></td><td>1</td><td><strong class="cart-free">FREE</strong></td>';
      cartBody.appendChild(giftRow);
    }
    renderRewards(t);
    document.getElementById("sum-sub").textContent = money(t.sub);
    document.getElementById("sum-ship").innerHTML = (t.method === "express" ? "<small>Express</small> " : "") + (t.ship ? money(t.ship) : '<strong class="cart-free">FREE</strong>');
    document.getElementById("sum-total").textContent = money(t.total);
    document.getElementById("sum-gst").textContent = money(t.gst);
    var chip = document.getElementById("promo-applied");
    chip.hidden = !t.promo;
    if (t.promo) {
      document.getElementById("promo-label").textContent = "'" + t.code + "' " + t.promo.label;
      document.getElementById("promo-off").textContent = "-" + money(t.off);
    }
  }
  /* ---------- cart rewards: 2-stage progress bar, add-ons, confetti ---------- */
  var rewardsBox = document.getElementById("cart-rewards");
  var addonsBox = document.getElementById("cart-addons");
  var ADDONS = ["refill30", "refill60"];
  function renderRewards(t) {
    if (!rewardsBox) return;
    var sub = t.sub;
    var msg = rewardsBox.querySelector("[data-reward-msg]");
    if (sub >= FREE_SHIP_MIN) {
      msg.innerHTML = '<i class="fa-solid fa-champagne-glasses" aria-hidden="true"></i> Yay! You\'ve unlocked <strong>free sticker merch</strong> and <strong>free delivery</strong>.';
    } else if (sub >= GIFT_MIN) {
      msg.innerHTML = "Free sticker merch unlocked! Add <strong>" + money(FREE_SHIP_MIN - sub) + "</strong> more to save " + money(SHIPPING_FEE) + " on delivery.";
    } else {
      msg.innerHTML = "Add <strong>" + money(GIFT_MIN - sub) + "</strong> more to unlock <strong>free sticker merch</strong>!";
    }
    rewardsBox.querySelector("[data-reward-fill]").style.width = Math.min(100, sub / FREE_SHIP_MIN * 100) + "%";
    rewardsBox.querySelector(".cart-rewards-bar").setAttribute("aria-valuenow", sub.toFixed(2));
    rewardsBox.querySelectorAll("[data-reward-min]").forEach(function (m) {
      var on = sub >= +m.getAttribute("data-reward-min");
      m.classList.toggle("unlocked", on);
      m.querySelector(".cart-reward-lock").className = "cart-reward-lock fa-solid " + (on ? "fa-circle-check" : "fa-lock");
    });
    renderAddons(sub);
    celebrate(rewardTier(sub));
  }
  function renderAddons(sub) {
    if (!addonsBox) return;
    var list = addonsBox.querySelector("[data-addon-list]");
    list.innerHTML = ADDONS.map(function (sku) {
      var p = PRODUCTS[sku];
      var after = sub + p.price;
      var tag = "";
      if (sub < FREE_SHIP_MIN && after >= FREE_SHIP_MIN) tag = '<span class="addon-tag"><i class="fa-solid fa-truck-fast"></i> Unlocks free delivery</span>';
      else if (sub < GIFT_MIN && after >= GIFT_MIN) tag = '<span class="addon-tag"><i class="fa-solid fa-gift"></i> Unlocks free merch</span>';
      return '<div class="addon-card"><div class="addon-thumb"><img src="' + REFILL_PHOTO[sku] + '" alt="" /></div>' +
        '<div class="addon-body"><h4>' + p.name.replace("Sticker Paper · ", "Sticker paper refill, ") + "</h4>" +
        '<p class="mb-1"><strong>' + money(p.price) + "</strong> <small>(" + money(p.price / parseInt(sku.replace("refill", ""), 10)) + "/print)</small></p>" + tag +
        '<button type="button" class="buy-now-button addon-add" data-addon="' + sku + '"><i class="fa-solid fa-plus"></i> Add to cart</button></div></div>';
    }).join("");
  }
  if (addonsBox) {
    addonsBox.addEventListener("click", function (e) {
      var b = e.target.closest("[data-addon]");
      if (!b) return;
      addItem(b.getAttribute("data-addon"), null, 1);
      showToast("Added " + PRODUCTS[b.getAttribute("data-addon")].name + " to cart");
      renderCart();
    });
  }
  // Confetti when a new reward is unlocked. The last celebrated stage is kept for this visit only.
  function celebrate(tier) {
    var seen = load(SS, "pixelle-tier", 0);
    save(SS, "pixelle-tier", tier);
    if (tier <= seen) return;
    showToast(tier === 2 ? "Free delivery unlocked! 🎉" : "Free sticker merch unlocked! 🎉");
    confetti();
  }
  function confetti() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var canvas = document.createElement("canvas");
    canvas.className = "confetti-canvas";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    var dpr = window.devicePixelRatio || 1;
    var W = window.innerWidth, H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    var COLOURS = ["#2E4A42", "#B9D2BC", "#EBB1AA", "#EDE1C8", "#F4E2B0", "#D9876A"];
    var bits = [];
    [0.2, 0.8].forEach(function (x0) {           // two bursts, left and right
      for (var i = 0; i < 90; i++) {
        var angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
        var speed = 9 + Math.random() * 9;
        bits.push({
          x: W * x0, y: H * 0.65,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          w: 6 + Math.random() * 6, h: 8 + Math.random() * 8,
          r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
          c: COLOURS[i % COLOURS.length]
        });
      }
    });
    var start = performance.now();
    (function frame(now) {
      var t = now - start;
      ctx.clearRect(0, 0, W, H);
      bits.forEach(function (b) {
        b.vy += 0.32; b.vx *= 0.99; b.vy *= 0.99;
        b.x += b.vx; b.y += b.vy; b.r += b.vr;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - t / 2800);
        ctx.translate(b.x, b.y); ctx.rotate(b.r);
        ctx.fillStyle = b.c;
        ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h * Math.abs(Math.cos(b.r * 2)));
        ctx.restore();
      });
      if (t < 2800) requestAnimationFrame(frame); else canvas.remove();
    })(start);
  }

  if (cartBody) {
    cartBody.addEventListener("change", function (e) {
      var cart = getCart();
      if (e.target.hasAttribute("data-qty")) {
        cart[+e.target.getAttribute("data-qty")].qty = Math.min(10, Math.max(1, parseInt(e.target.value, 10) || 1));
      } else if (e.target.hasAttribute("data-gift")) {
        cart[+e.target.getAttribute("data-gift")].gift = e.target.checked;
      }
      setCart(cart);
      renderCart();
    });
    cartBody.addEventListener("click", function (e) {
      var b = e.target.closest("[data-remove]");
      if (!b) return;
      var cart = getCart();
      cart.splice(+b.getAttribute("data-remove"), 1);
      setCart(cart);
      renderCart();
    });
    document.getElementById("promo-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var input = document.getElementById("promo-code");
      var code = input.value.trim().toUpperCase();
      var msg = document.getElementById("promo-msg");
      var sub = totals(getCart()).sub;
      if (!PROMOS[code]) {
        msg.textContent = "That code isn't valid.";
      } else if (sub < PROMOS[code].min) {
        msg.textContent = "Spend " + money(PROMOS[code].min) + " or more to use " + code + ".";
      } else {
        save(SS, "pixelle-promo", code);
        msg.textContent = "Code applied!";
        input.value = "";
      }
      renderCart();
    });
    renderCart();
  }

  /* ---------- checkout + payment: order summary with photos ---------- */
  var coSummary = document.querySelector("[data-co-summary]");
  function itemThumb(item) {
    return item.colour
      ? '<img src="images/purchase/Pixelle-' + PHOTO[item.colour] + '-01.png" alt="" />'
      : '<img class="co-thumb-cover" src="' + REFILL_PHOTO[item.sku] + '" alt="" />';
  }
  function renderCoSummary() {
    if (!coSummary) return;
    var cart = getCart();
    var t = totals(cart);
    var count = cart.reduce(function (n, i) { return n + i.qty; }, 0);
    var html = cart.map(function (i) {
      var p = PRODUCTS[i.sku];
      return '<li class="co-item"><span class="co-thumb">' + itemThumb(i) +
        '<span class="co-qty" aria-label="Quantity ' + i.qty + '">' + i.qty + "</span></span>" +
        '<span class="co-item-name">' + p.name + (i.colour ? "<small>" + COLOUR_NAMES[i.colour] + (i.gift ? " · gift wrapped" : "") + "</small>" : "") + "</span>" +
        '<span class="co-item-price">' + money(p.price * i.qty) + "</span></li>";
    }).join("");
    if (t.gift) {
      html += '<li class="co-item"><span class="co-thumb co-thumb-gift"><i class="fa-solid fa-gift" aria-hidden="true"></i><span class="co-qty">1</span></span>' +
        '<span class="co-item-name">[FREE GIFT] Pixelle sticker merch<small>For spending ' + money(GIFT_MIN) + " or more</small></span>" +
        '<span class="co-item-price">FREE</span></li>';
    }
    coSummary.querySelector("[data-co-items]").innerHTML = html;
    var rows = '<div><span>Subtotal · ' + count + (count === 1 ? " item" : " items") + "</span><span>" + money(t.sub) + "</span></div>";
    if (t.promo) rows += '<div class="co-discount"><span><i class="fa-solid fa-tag"></i> ' + t.code + "</span><span>-" + money(t.off) + "</span></div>";
    rows += "<div><span>" + SHIP_METHODS[t.method].label + "</span><span>" + (t.ship ? money(t.ship) : "FREE") + "</span></div>";
    rows += '<div class="co-total"><span>Total</span><span><small>SGD</small> ' + money(t.total) + "</span></div>";
    rows += '<div class="co-gst"><span>Including ' + money(t.gst) + " in GST</span></div>";
    coSummary.querySelector("[data-co-totals]").innerHTML = rows;
    var hint = coSummary.querySelector("[data-co-hint]");
    if (hint) {
      hint.hidden = t.sub >= FREE_SHIP_MIN;
      hint.innerHTML = '<i class="fa-solid fa-truck-fast"></i> ' + rewardHint(t.sub) + ' <a href="cart.html">Add more</a>';
    }
    document.querySelectorAll("[data-pay-total]").forEach(function (el) { el.textContent = money(t.total); });
  }
  if (coSummary) {
    if (!getCart().length) window.location.replace("cart.html");
    var coPromo = coSummary.querySelector("[data-co-promo]");
    if (coPromo) {
      coPromo.addEventListener("submit", function (e) {
        e.preventDefault();
        var input = coPromo.querySelector("input");
        var msg = coSummary.querySelector("[data-co-promo-msg]");
        var code = input.value.trim().toUpperCase();
        if (!PROMOS[code]) msg.textContent = "Enter a valid discount code.";
        else { save(SS, "pixelle-promo", code); msg.textContent = "Code applied!"; input.value = ""; }
        renderCoSummary();
      });
    }
    renderCoSummary();
  }

  /* ---------- delivery details: kept in this tab only until the order is placed ---------- */
  var DELIVERY_FIELDS = ["email", "phone", "firstname", "lastname", "address", "address2", "postal"];
  var checkoutForm = document.querySelector('form[data-validate="checkout"]');
  if (checkoutForm) {
    var saved = load(SS, "pixelle-delivery", null);
    if (saved) {
      DELIVERY_FIELDS.forEach(function (n) { var f = checkoutForm.querySelector('[name="' + n + '"]'); if (f && saved[n]) f.value = saved[n]; });
      var ack = checkoutForm.querySelector('[name="pdpa-ack"]');
      if (ack) ack.checked = true;
    }
  }

  /* ---------- payment page: review, delivery method, payment method ---------- */
  var payForm = document.querySelector('form[data-validate="payment"]');
  if (payForm) {
    var d = load(SS, "pixelle-delivery", null);
    if (!d) { window.location.replace("checkout.html"); }
    else {
      var esc = function (v) { var el = document.createElement("span"); el.textContent = v || ""; return el.innerHTML; };
      payForm.querySelector('[data-review="contact"]').innerHTML = esc(d.email) + "<br />" + esc(d.phone);
      payForm.querySelector('[data-review="address"]').innerHTML =
        esc(d.firstname + " " + d.lastname) + "<br />" + esc(d.address) + (d.address2 ? ", " + esc(d.address2) : "") + "<br />Singapore " + esc(d.postal);
    }
    // delivery method
    function paintShip() {
      var sub = totals(getCart()).sub;
      var m = shipMethod();
      payForm.querySelectorAll('input[name="ship"]').forEach(function (r) {
        r.checked = r.value === m;
        var fee = shipFee(r.value, sub);
        var price = payForm.querySelector('[data-ship-price="' + r.value + '"]');
        price.innerHTML = fee ? money(fee) : '<strong class="co-free">FREE</strong>';
        if (r.value === "standard" && sub < FREE_SHIP_MIN) price.innerHTML += '<small>Free over ' + money(FREE_SHIP_MIN) + "</small>";
      });
      payForm.querySelectorAll(".co-option").forEach(function (o) { o.classList.toggle("checked", o.querySelector("input").checked); });
    }
    payForm.addEventListener("change", function (e) {
      if (e.target.name === "ship") { save(SS, "pixelle-ship", e.target.value); paintShip(); renderCoSummary(); }
      if (e.target.name === "method") paintMethod();
    });
    // payment method: the chosen option opens its panel
    function paintMethod() {
      var chosen = payForm.querySelector('input[name="method"]:checked');
      payForm.querySelectorAll('input[name="method"]').forEach(function (r) {
        var opt = r.closest(".co-option");
        opt.classList.toggle("checked", r.checked);
        var panel = payForm.querySelector('[data-method-panel="' + r.value + '"]');
        if (panel) panel.hidden = !r.checked;
      });
      var btn = payForm.querySelector("[data-pay-label]");
      var labels = { card: "Pay now", paynow: "Pay with PayNow", applepay: "Pay with Apple Pay", googlepay: "Pay with Google Pay", grabpay: "Pay with GrabPay" };
      btn.textContent = labels[chosen.value] || "Pay now";
    }
    var more = payForm.querySelector("[data-more-pay]");
    if (more) {
      more.addEventListener("click", function () {
        var list = payForm.querySelector("[data-more-list]");
        list.hidden = !list.hidden;
        more.setAttribute("aria-expanded", list.hidden ? "false" : "true");
        more.querySelector("i").className = list.hidden ? "fa-solid fa-plus" : "fa-solid fa-minus";
      });
    }
    paintShip();
    paintMethod();
  }

  /* ---------- order summaries (checkout, payment) ---------- */
  document.querySelectorAll("[data-order-summary]").forEach(function (box) {
    var cart = getCart();
    if (!cart.length) { window.location.replace("cart.html"); return; }
    var t = totals(cart);
    var rows = cart.map(function (i) {
      return "<tr><td>" + PRODUCTS[i.sku].name + (i.colour ? " (" + COLOUR_NAMES[i.colour] + ")" : "") + " × " + i.qty +
        '</td><td style="text-align:right">' + money(PRODUCTS[i.sku].price * i.qty) + "</td></tr>";
    }).join("");
    if (t.promo) rows += '<tr><td>Promotion (' + t.code + ')</td><td style="text-align:right">-' + money(t.off) + "</td></tr>";
    if (t.gift) rows += '<tr><td>Pixelle sticker merch (free gift)</td><td style="text-align:right">FREE</td></tr>';
    rows += '<tr><td>Delivery</td><td style="text-align:right">' + (t.ship ? money(t.ship) : "FREE") + "</td></tr>" +
      '<tr><td><strong>Total</strong></td><td style="text-align:right"><strong>' + money(t.total) + "</strong></td></tr>" +
      '<tr><td>9% GST incl.</td><td style="text-align:right">' + money(t.gst) + "</td></tr>";
    box.innerHTML = rows;
  });

  /* ---------- Sticker Studio (photos never leave the browser) ---------- */
  var FILTERS = {
    original: "none",
    warm: "saturate(1.25) sepia(.18) brightness(1.05)",
    film: "contrast(1.1) saturate(.85) sepia(.3) hue-rotate(-8deg)",
    mono: "grayscale(1) contrast(1.15)",
    pop: "saturate(1.7) contrast(1.08)",
  };
  document.querySelectorAll("[data-studio]").forEach(function (studio) {
    var sticker = studio.querySelector(".sticker");
    var photo = studio.querySelector(".sticker-photo");
    var caption = studio.querySelector(".sticker-caption");
    var capInput = studio.querySelector("[data-caption]");
    var fileInput = studio.querySelector("[data-upload]");
    var note = studio.querySelector("[data-note]");
    function press(attr, btn) {
      studio.querySelectorAll("button[" + attr + "]").forEach(function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
    }
    studio.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      if (b.hasAttribute("data-filter-fx")) {
        sticker.style.setProperty("--fx", FILTERS[b.getAttribute("data-filter-fx")]);
        press("data-filter-fx", b);
      } else if (b.hasAttribute("data-shape")) {
        var sh = b.getAttribute("data-shape");
        sticker.setAttribute("data-shape", sh);
        sticker.setAttribute("data-border", sh === "borderless" ? "none" : "white");
        press("data-shape", b);
      }
    });
    capInput.addEventListener("input", function () { caption.textContent = capInput.value; });
    fileInput.addEventListener("change", function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file || !/^image\//.test(file.type)) return;
      var reader = new FileReader();
      reader.onload = function () {
        photo.innerHTML = "";
        var img = new Image();
        img.alt = "Your photo previewed as a sticker";
        img.src = reader.result;
        photo.appendChild(img);
        note.innerHTML = "<strong>Looking good!</strong> Your photo stays on your device and is never uploaded.";
      };
      reader.readAsDataURL(file);
    });
  });

  /* ---------- cost-per-print calculator (compare page) ---------- */
  var calc = document.getElementById("calc-prints");
  if (calc) {
    var RATES = { pixelle: 29.9 / 50, instant: 1.1, kiosk: 1.2 };
    var runCalc = function () {
      var n = parseInt(calc.value, 10);
      document.getElementById("calc-n").textContent = n;
      Object.keys(RATES).forEach(function (k) { document.getElementById("calc-" + k).textContent = money(n * RATES[k]); });
      document.getElementById("calc-save").textContent = money(n * (RATES.kiosk - RATES.pixelle) * 12);
    };
    calc.addEventListener("input", runCalc);
    runCalc();
  }

  /* ---------- FAQ: animated details accordion + search ---------- */
  function Accordion(el) {
    this.el = el;
    this.summary = el.querySelector("summary");
    this.content = el.querySelector(".faq-content");
    this.animation = null;
    this.isClosing = false;
    this.isExpanding = false;
    this.summary.addEventListener("click", this.onClick.bind(this));
  }
  Accordion.prototype.onClick = function (e) {
    e.preventDefault();
    this.el.style.overflow = "hidden";
    if (this.isClosing || !this.el.open) this.open();
    else if (this.isExpanding || this.el.open) this.shrink();
  };
  Accordion.prototype.animate = function (from, to, opening) {
    var self = this;
    if (this.animation) this.animation.cancel();
    this.animation = this.el.animate({ height: [from, to] }, { duration: 300, easing: "ease-out" });
    this.animation.onfinish = function () { self.finish(opening); };
    this.animation.oncancel = function () { self.isClosing = self.isExpanding = false; };
  };
  Accordion.prototype.shrink = function () {
    this.isClosing = true;
    this.animate(this.el.offsetHeight + "px", this.summary.offsetHeight + "px", false);
  };
  Accordion.prototype.open = function () {
    this.el.style.height = this.el.offsetHeight + "px";
    this.el.open = true;
    var self = this;
    window.requestAnimationFrame(function () {
      self.isExpanding = true;
      self.animate(self.el.offsetHeight + "px", self.summary.offsetHeight + self.content.offsetHeight + "px", true);
    });
  };
  Accordion.prototype.finish = function (opening) {
    this.el.open = opening;
    this.animation = null;
    this.isClosing = this.isExpanding = false;
    this.el.style.height = this.el.style.overflow = "";
  };
  document.querySelectorAll(".faq-container details").forEach(function (el) { new Accordion(el); });

  var faqSearch = document.getElementById("faq-search");
  if (faqSearch) {
    faqSearch.addEventListener("input", function () {
      var q = faqSearch.value.trim().toLowerCase();
      var shown = 0;
      document.querySelectorAll(".faq-container details").forEach(function (d) {
        var hit = !q || d.textContent.toLowerCase().indexOf(q) > -1;
        d.hidden = !hit;
        if (hit) shown++;
      });
      document.getElementById("faq-empty").hidden = shown !== 0;
    });
  }

  /* ---------- review filter (overview page) ---------- */
  var filterBar = document.querySelector("[data-filter-bar]");
  if (filterBar) {
    filterBar.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-filter]");
      if (!btn) return;
      var f = btn.getAttribute("data-filter");
      filterBar.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
      document.querySelectorAll("[data-tags]").forEach(function (r) {
        r.hidden = !(f === "all" || r.getAttribute("data-tags").indexOf(f) > -1);
      });
    });
  }

  /* Require a complete email domain, including a suffix such as .com or .edu.sg. */
  function validateEmailDomain(field) {
    var value = field.value.trim();
    var completeEmail = /^[^\s@]+@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.){1,3}[a-z]{2,}$/i;
    field.setCustomValidity(!value || completeEmail.test(value)
      ? "" : "Enter a complete email address with 2 to 4 domain parts, such as x@gmail.com or x@e.ntu.edu.sg.");
  }
  document.querySelectorAll('input[type="email"]').forEach(function (field) {
    field.addEventListener("input", function () { validateEmailDomain(field); });
    field.addEventListener("blur", function () { validateEmailDomain(field); });
    if (field.form) {
      field.form.addEventListener("submit", function () { validateEmailDomain(field); }, true);
    }
  });

  /* ---------- forms with PDPA consent ---------- */
  function validate(form) {
    var first = null;
    form.querySelectorAll("[data-match]").forEach(function (f) {
      var other = document.getElementById(f.getAttribute("data-match"));
      f.setCustomValidity(f.value && f.value === other.value ? "" : "mismatch");
    });
    form.querySelectorAll("input, select, textarea").forEach(function (f) {
      if (!f.willValidate || f.disabled) return;
      var bad = !f.checkValidity();
      f.classList.toggle("is-invalid", bad);
      f.setAttribute("aria-invalid", bad ? "true" : "false");
      if (bad && !first) first = f;
    });
    if (first) first.focus();
    return !first;
  }
  document.querySelectorAll("form[data-validate]").forEach(function (form) {
    form.querySelectorAll("input, select, textarea").forEach(function (f) {
      f.addEventListener("blur", function () { if (f.value) f.classList.toggle("is-invalid", !f.checkValidity()); });
      f.addEventListener("change", function () { if (f.type === "checkbox") f.classList.toggle("is-invalid", !f.checkValidity()); });
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var status = form.querySelector("[data-status]");
      if (!validate(form)) {
        if (status) { status.textContent = "Please check the highlighted fields."; status.style.color = "#b3261e"; }
        return;
      }
      // Prototype: nothing is sent or stored. In production this would POST over HTTPS (see PDPA policy).
      var kind = form.getAttribute("data-validate");
      if (kind === "checkout") {
        // Kept in sessionStorage (this tab only) so the next step can show "Ship to"; cleared once the order is placed.
        var details = {};
        DELIVERY_FIELDS.forEach(function (n) { var f = form.querySelector('[name="' + n + '"]'); details[n] = f ? f.value.trim() : ""; });
        save(SS, "pixelle-delivery", details);
        window.location.href = "payment.html";
      } else if (kind === "payment") {
        var t = totals(getCart());
        var who = load(SS, "pixelle-delivery", {}) || {};
        var payChoice = form.querySelector('input[name="method"]:checked');
        var PAY_LABELS = { card: "Card ending 4242", paynow: "PayNow", applepay: "Apple Pay", googlepay: "Google Pay", grabpay: "GrabPay" };
        var now = new Date();
        // Everything the receipt needs, saved once. Refreshing the receipt page only re-reads this; it never places a new order.
        save(SS, "pixelle-order", {
          no: "PX-" + now.getFullYear() + "-" + String(Date.now()).slice(-5),
          date: now.toISOString(),
          first: who.firstname || "",
          items: getCart().map(function (i) {
            var bundle = { starter: "Starter Bundle", creator: "Creator Bundle" }[i.sku];
            return bundle
              ? { name: "Pixelle Snap · " + COLOUR_NAMES[i.colour], detail: bundle + " × " + i.qty + (i.gift ? " · gift wrapped" : ""), price: PRODUCTS[i.sku].price * i.qty }
              : { name: "Polaroid Sticker Sheets", detail: PRODUCTS[i.sku].name.replace("Sticker Paper · ", "") + " × " + i.qty, price: PRODUCTS[i.sku].price * i.qty };
          }),
          gift: t.gift, sub: t.sub, code: t.promo ? t.code : "", off: t.off, ship: t.ship,
          method: SHIP_METHODS[t.method].label, eta: SHIP_METHODS[t.method].eta,
          pay: PAY_LABELS[payChoice ? payChoice.value : "card"], total: t.total, gst: t.gst, printed: false
        });
        var payBtn = form.querySelector('button[type="submit"]');
        payBtn.disabled = true;
        payBtn.innerHTML = '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Processing…';
        setCart([]);
        ["pixelle-promo", "pixelle-delivery", "pixelle-ship", "pixelle-tier", "pixelle-delivery-ok"].forEach(function (k) {
          try { SS.removeItem(k); } catch (err) { /* ignore */ }
        });
        setTimeout(function () { window.location.href = "acknowledgement.html"; }, 1200);
      } else if (kind === "login") {
        // Demo login: there is no account database, so greet as "Member".
        setUser("Member", document.getElementById("l-remember").checked);
        form.reset();
        renderAccount();
        window.scrollTo(0, 0);
      } else if (kind === "signup") {
        var first = titleCase(form.querySelector('[name="firstname"]').value.trim());
        setUser(first, false);
        joinClub(first);
        form.reset();
        renderAccount();
        window.scrollTo(0, 0);
      } else if (kind === "member") {
        joinClub(form.querySelector('[name="firstname"]').value.trim());
        form.reset();
      } else {
        var voucher = form.querySelector('[name="subject"]') && form.querySelector('[name="subject"]').value === "voucher";
        if (voucher) joinClub("");
        form.reset();
        form.querySelectorAll(".is-invalid").forEach(function (f) { f.classList.remove("is-invalid"); });
        if (status) {
          status.style.color = "#2F6F5E";
          status.innerHTML = voucher
            ? 'Welcome to Pixelle Club! Your 10% first-order code is <strong>PIXELCLUB10</strong>. We\'ve also emailed it to you.'
            : "Thank you! We'll reply within one working day.";
        }
      }
    });
  });

  /* newsletter (footer) */
  var news = document.getElementById("newsletter-form");
  if (news) {
    news.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = document.getElementById("newsletter-email");
      var consent = document.getElementById("newsletter-consent");
      var status = document.getElementById("newsletter-status");
      if (!email.checkValidity() || !email.value) { status.textContent = "Please enter a valid email."; email.focus(); return; }
      if (!consent.checked) { status.textContent = "Please tick the consent box to join."; consent.focus(); return; }
      news.reset();
      joinClub("");
      status.innerHTML = "Welcome to Pixelle Club! You'll now start receiving special offers and updates! Your discount code is <strong>PIXELCLUB10</strong> for 10% off your first order. Want to manage orders? <a href=\"account.html#signup-pane\">Create an account</a>.";
    });
  }

  /* acknowledgement: rendered by receipt.js from the saved order */

  // (the payment page sends visitors back to checkout if delivery details are missing; see "payment page" above)

  /* copy code */
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var done = function () { btn.textContent = "Copied!"; setTimeout(function () { btn.textContent = "Copy"; }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(btn.getAttribute("data-copy")).then(done, done); else done();
    });
  });

  renderAccount();

  /* open an inspiration tab from a hash link */
  /* ---------- Sticker printing out of a printer slot ----------
     Used by the home hero and the About page. Each printer gives the sticker's
     outline as 60 thin bands that follow its curve (left/right edge, bottom to top)
     plus a SLOT outline that hides anything still inside the printer. The picture
     comes out of the slot top edge first and travels up along the bands, so the
     sticker bends like real paper. */
  function printFeed(feed, cfg) {
    var img = feed && feed.querySelector("img");
    if (!img) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var EDGE_L = cfg.L, EDGE_R = cfg.R, SLOT = cfg.SLOT, W = cfg.W, H = cfg.H, N = EDGE_L.length - 1;

    var canvas = document.createElement("canvas");
    var scale = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * scale; canvas.height = H * scale;
    canvas.className = "print-canvas";
    canvas.setAttribute("aria-hidden", "true");
    var ctx = canvas.getContext("2d");

    function lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
    function lineAt(u) {
      u = Math.max(0, Math.min(N, u));
      var i = Math.min(N - 1, Math.floor(u)), t = u - i;
      return [lerp(EDGE_L[i], EDGE_L[i + 1], t), lerp(EDGE_R[i], EDGE_R[i + 1], t)];
    }
    function tri(s0, s1, s2, d0, d1, d2) {
      var den = (s1[0] - s0[0]) * (s2[1] - s0[1]) - (s2[0] - s0[0]) * (s1[1] - s0[1]);
      if (Math.abs(den) < 1e-6) return;
      var a = ((d1[0] - d0[0]) * (s2[1] - s0[1]) - (d2[0] - d0[0]) * (s1[1] - s0[1])) / den;
      var b = ((d1[1] - d0[1]) * (s2[1] - s0[1]) - (d2[1] - d0[1]) * (s1[1] - s0[1])) / den;
      var c = ((d2[0] - d0[0]) * (s1[0] - s0[0]) - (d1[0] - d0[0]) * (s2[0] - s0[0])) / den;
      var d = ((d2[1] - d0[1]) * (s1[0] - s0[0]) - (d1[1] - d0[1]) * (s2[0] - s0[0])) / den;
      var e = d0[0] - a * s0[0] - c * s0[1];
      var f = d0[1] - b * s0[0] - d * s0[1];
      ctx.save();
      ctx.beginPath();
      var cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3;
      [d0, d1, d2].forEach(function (p, k) {
        var dx = p[0] - cx, dy = p[1] - cy, len = Math.sqrt(dx * dx + dy * dy) || 1;
        var x = p[0] + dx / len * 0.4, y = p[1] + dy / len * 0.4;
        if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      });
      ctx.closePath(); ctx.clip();
      ctx.transform(a, b, c, d, e, f);
      ctx.drawImage(img, 0, 0, W, H);
      ctx.restore();
    }
    function draw(p) {
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.beginPath();
      SLOT.forEach(function (pt, i) { if (i) ctx.lineTo(pt[0], pt[1]); else ctx.moveTo(pt[0], pt[1]); });
      ctx.closePath(); ctx.clip();
      var out = p * N, shift = N - out;
      for (var i = Math.ceil(out) - 1; i >= 0; i--) {
        var top = Math.min(i + 1.8, out);
        var dA = lineAt(i), dB = lineAt(top);
        var sA = lineAt(i + shift), sB = lineAt(top + shift);
        tri(sA[0], sA[1], sB[1], dA[0], dA[1], dB[1]);
        tri(sA[0], sB[1], sB[0], dA[0], dB[1], dB[0]);
      }
      ctx.restore();
    }
    function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
    function play() {
      feed.appendChild(canvas);
      feed.classList.add("is-printing");
      draw(0);
      var DELAY = cfg.delay || 800, DURATION = cfg.duration || 3600, t0 = null;
      function tick(now) {
        if (t0 === null) t0 = now;
        var t = Math.min(1, Math.max(0, (now - t0 - DELAY) / DURATION));
        draw(ease(t));
        if (t < 1) requestAnimationFrame(tick);
        else { feed.classList.remove("is-printing"); canvas.remove(); }
      }
      requestAnimationFrame(tick);
    }
    function start() {
      // wait until the printer is on screen, so visitors actually see it print
      if ("IntersectionObserver" in window) {
        feed.classList.add("is-printing"); // hide the finished sticker until it prints
        var io = new IntersectionObserver(function (en) {
          if (en[0].isIntersecting) { io.disconnect(); play(); }
        }, { threshold: 0.4 });
        io.observe(feed.parentNode);
      } else play();
    }
    if (img.complete && img.naturalWidth) start();
    else img.addEventListener("load", start);
  }

  // home page hero (sunset sticker)
  printFeed(document.querySelector(".hero-feed"), {
    W: 410, H: 285,
    L: [[111.0,283.0],[114.0,279.5],[117.6,277.4],[119.0,272.6],[118.0,267.6],[117.5,262.5],[117.0,257.3],[116.0,252.3],[114.6,247.6],[113.6,242.6],[112.0,237.9],[111.0,232.9],[110.0,228.0],[109.0,223.0],[108.0,218.1],[106.4,213.4],[105.0,208.6],[103.8,203.8],[102.1,199.1],[101.0,194.2],[99.4,189.4],[98.0,184.7],[96.1,180.1],[95.0,175.2],[93.5,170.5],[91.8,165.8],[90.0,161.2],[88.0,156.6],[86.1,152.1],[84.4,147.4],[82.7,142.7],[81.0,138.1],[79.0,133.5],[77.0,129.0],[75.0,124.4],[73.0,119.9],[71.0,115.4],[68.9,110.9],[66.5,106.5],[64.1,102.1],[62.0,97.6],[59.4,93.4],[57.0,89.0],[54.6,84.6],[52.2,80.2],[49.8,75.8],[47.0,71.7],[44.4,67.4],[41.3,63.3],[38.2,59.2],[35.1,55.1],[32.7,50.7],[29.0,46.9],[25.9,42.9],[22.8,38.8],[19.0,35.0],[15.2,31.2],[11.4,27.4],[7.6,23.6],[3.8,19.8],[0.0,16.0]],
    R: [[409.0,249.0],[409.0,243.9],[408.0,239.3],[408.0,234.2],[406.6,229.6],[405.2,225.2],[404.0,220.6],[403.6,215.6],[402.2,211.2],[401.0,206.6],[400.0,201.9],[399.0,197.2],[398.0,192.6],[396.9,187.9],[395.0,183.7],[394.0,179.0],[393.0,174.3],[391.1,170.1],[390.0,165.4],[388.1,161.1],[387.0,156.5],[385.2,152.2],[384.0,147.6],[382.0,143.3],[380.8,138.8],[379.0,134.4],[377.1,130.1],[375.6,125.6],[374.0,121.2],[372.0,117.0],[370.0,112.7],[368.3,108.3],[366.1,104.1],[364.0,100.0],[362.5,95.5],[360.3,91.3],[358.1,87.1],[356.0,83.0],[353.8,78.8],[351.6,74.6],[349.0,70.6],[346.5,66.5],[344.4,62.4],[342.0,58.3],[339.3,54.3],[336.4,50.4],[333.5,46.5],[330.6,42.6],[327.8,38.8],[324.2,35.2],[321.3,31.3],[318.0,27.5],[314.8,23.8],[311.2,20.2],[307.3,17.3],[303.6,14.0],[299.8,10.8],[295.9,8.0],[292.1,5.1],[287.9,2.9],[284.0,0.0]],
    SLOT: [[292.0,5.0],[282.0,0.0],[248.0,3.0],[0.0,16.0],[24.0,40.0],[41.0,62.0],[56.0,86.0],[73.0,119.0],[94.0,171.0],[102.0,196.0],[117.0,255.0],[119.0,272.0],[409.0,243.0],[408.0,231.0],[406.0,230.0],[404.0,216.0],[393.0,174.0],[380.0,136.0],[364.0,98.0],[348.0,68.0],[332.0,44.0],[310.0,19.0]]
  });

  // About page (blush pink printer)
  printFeed(document.querySelector(".about-feed"), {
    W: 220, H: 164,
    L: [[10.0,164.0],[10.1,161.5],[10.1,158.9],[10.2,156.4],[10.2,153.9],[10.3,151.4],[10.3,148.9],[10.4,146.4],[10.4,143.9],[10.5,141.4],[10.5,138.9],[10.6,136.5],[10.6,134.0],[10.7,131.6],[10.7,129.1],[10.8,126.7],[10.8,124.3],[10.9,121.9],[11.0,119.5],[11.0,117.1],[11.1,114.7],[11.1,112.3],[11.2,110.0],[11.2,107.6],[11.3,105.2],[11.4,102.9],[11.4,100.6],[11.5,98.2],[11.5,95.9],[11.6,93.6],[11.7,91.3],[11.7,89.0],[11.8,86.8],[11.8,84.5],[11.9,82.2],[12.0,80.0],[12.0,77.7],[12.1,75.5],[12.1,73.2],[12.2,71.0],[12.3,68.8],[12.3,66.6],[12.4,64.4],[12.5,62.2],[12.5,60.0],[12.6,57.9],[12.7,55.7],[12.7,53.5],[12.8,51.4],[12.9,49.3],[12.9,47.1],[13.0,45.0],[13.1,42.9],[13.1,40.8],[13.2,38.7],[13.3,36.6],[13.3,34.5],[13.4,32.5],[13.5,30.4],[13.5,28.3],[13.6,26.3]],
    R: [[210.0,164.0],[209.9,161.5],[209.9,158.9],[209.8,156.4],[209.8,153.9],[209.7,151.4],[209.7,148.9],[209.6,146.4],[209.6,143.9],[209.5,141.4],[209.5,138.9],[209.4,136.5],[209.4,134.0],[209.3,131.6],[209.3,129.1],[209.2,126.7],[209.2,124.3],[209.1,121.9],[209.0,119.5],[209.0,117.1],[208.9,114.7],[208.9,112.3],[208.8,110.0],[208.8,107.6],[208.7,105.2],[208.6,102.9],[208.6,100.6],[208.5,98.2],[208.5,95.9],[208.4,93.6],[208.3,91.3],[208.3,89.0],[208.2,86.8],[208.2,84.5],[208.1,82.2],[208.0,80.0],[208.0,77.7],[207.9,75.5],[207.9,73.2],[207.8,71.0],[207.7,68.8],[207.7,66.6],[207.6,64.4],[207.5,62.2],[207.5,60.0],[207.4,57.9],[207.3,55.7],[207.3,53.5],[207.2,51.4],[207.1,49.3],[207.1,47.1],[207.0,45.0],[206.9,42.9],[206.9,40.8],[206.8,38.7],[206.7,36.6],[206.7,34.5],[206.6,32.5],[206.5,30.4],[206.5,28.3],[206.4,26.3]],
    SLOT: [[0,0],[220,0],[220,161],[0,161]],
    delay: 500
  });

  /* ---------- About page: count the "Pixelle so far" numbers up ----------
     Each [data-count] number starts at 0 and counts up to its value the first
     time it scrolls into view. Without JavaScript the final numbers just show. */
  (function () {
    var nums = document.querySelectorAll("[data-count]");
    if (!nums.length) return;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) return;
    function run(el) {
      var end = parseFloat(el.getAttribute("data-count"));
      var dec = parseInt(el.getAttribute("data-decimals") || "0", 10);
      var DURATION = 1600, t0 = null;
      function tick(now) {
        if (t0 === null) t0 = now;
        var t = Math.min(1, (now - t0) / DURATION);
        var eased = 1 - Math.pow(1 - t, 3);
        el.textContent = (end * eased).toFixed(dec);
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }
    nums.forEach(function (el) { el.textContent = (0).toFixed(parseInt(el.getAttribute("data-decimals") || "0", 10)); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { run(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.6 });
    nums.forEach(function (el) { io.observe(el); });
  })();

  function showTabFromHash() {
    if (!location.hash || !window.bootstrap) return;
    var pane = document.getElementById(location.hash.slice(1));
    if (!pane) return;
    var tabBtn = Array.from(document.querySelectorAll("[data-bs-target]")).find(function (button) {
      return button.getAttribute("data-bs-target") === location.hash;
    });
    if (tabBtn) bootstrap.Tab.getOrCreateInstance(tabBtn).show();
  }
  showTabFromHash();
  window.addEventListener("hashchange", showTabFromHash);
})();