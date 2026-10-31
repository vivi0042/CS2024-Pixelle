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
    }, 6000);
  }
  if (memberModal) {
    showMemberState();
    memberModal.addEventListener("hidden.bs.modal", function () {
      if (!isMember()) save(LS, "pixelle-member-dismissed", Date.now());
    });
    document.querySelectorAll("[data-open-member]").forEach(function (b) {
      b.addEventListener("click", function (e) { e.preventDefault(); openMember(); });
    });
    if (load(LS, "pixelle-consent", null)) scheduleMember();
    else document.addEventListener("pixelle:consent", scheduleMember, { once: true });
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
    starter: { name: "Pixelle Snap · Starter", price: 99.9 },
    creator: { name: "Pixelle Snap · Creator Bundle", price: 139.9 },
    refill50: { name: "Sticker Paper · 50 sheets", price: 29.9 },
    refill100: { name: "Sticker Paper · 100 sheets", price: 54.9 },
  };
  var PROMOS = { PIXELCLUB10: { pct: 10, min: 0, label: "10% off first order (member)" } };
  var COLOUR_NAMES = { navy: "Deep Evergreen", coral: "Blush Peach", cream: "Cloud Cream", sage: "Sage Mist" };
  var COLOUR_HEX = { navy: "#2E4A42", coral: "#D9876A", cream: "#e4dccb", sage: "#5f8a75" };

  function getCart() { return load(LS, "pixelle-cart", []); }
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
    var total = Math.max(0, sub - off);
    return { sub: sub, promo: promo, code: code, off: off, total: total, gst: total * 9 / 109 };
  }
  renderCount();

  /* ---------- purchase page ---------- */
  var buy = document.getElementById("purchase");
  if (buy) {
    var state = { colour: "navy", sku: "creator" };
    var stage = document.getElementById("product-carousel");
    var priceEl = document.getElementById("price");
    var wasEl = document.getElementById("price-was");
    var colourLabel = document.getElementById("colour-name");
    var WAS = { starter: 119.9, creator: 169.9 };
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
    var STOCK = { navy: 23, coral: 9, cream: 16, sage: 6 };
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
      showToast("Added " + qty + " × " + PRODUCTS[state.sku].name + " (" + COLOUR_NAMES[state.colour] + ") to cart");
    });
    document.querySelectorAll("[data-add-refill]").forEach(function (b) {
      b.addEventListener("click", function () {
        addItem(b.getAttribute("data-add-refill"), null, 1);
        showToast("Added " + PRODUCTS[b.getAttribute("data-add-refill")].name + " to cart");
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
      row.innerHTML =
        '<td><div class="d-flex gap-3 align-items-start"><div class="cart-thumb" style="width:72px;height:72px;border-radius:12px;background:' +
        (item.colour ? COLOUR_HEX[item.colour] : "#fde6dc") + ';display:grid;place-items:center;color:#fff;font-size:28px;flex:none">' +
        '<i class="fa-solid ' + (item.colour ? "fa-print" : "fa-note-sticky") + '" style="color:' + (item.colour === "cream" ? "#2E4A42" : item.colour ? "#F3F0EA" : "#c4461d") + '"></i></div>' +
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
    document.getElementById("sum-sub").textContent = money(t.sub);
    document.getElementById("sum-total").textContent = money(t.total);
    document.getElementById("sum-gst").textContent = money(t.gst);
    var chip = document.getElementById("promo-applied");
    chip.hidden = !t.promo;
    if (t.promo) {
      document.getElementById("promo-label").textContent = "'" + t.code + "' " + t.promo.label;
      document.getElementById("promo-off").textContent = "-" + money(t.off);
    }
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
    rows += '<tr><td>Shipping</td><td style="text-align:right">FREE</td></tr>' +
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
        save(SS, "pixelle-delivery-ok", true);
        window.location.href = "payment.html";
      } else if (kind === "payment") {
        var t = totals(getCart());
        save(SS, "pixelle-order", { no: "PX" + Date.now().toString().slice(-8), total: money(t.total) });
        setCart([]);
        try { SS.removeItem("pixelle-promo"); } catch (err) { /* ignore */ }
        window.location.href = "acknowledgement.html";
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
      status.textContent = "Welcome to Pixelle Club! Your 10% first-order code is PIXELCLUB10.";
    });
  }

  /* acknowledgement */
  var ack = document.getElementById("order-no");
  if (ack) {
    var order = load(SS, "pixelle-order", null);
    if (order) {
      ack.textContent = order.no;
      document.getElementById("order-total").textContent = order.total;
    }
  }

  /* payment guard: must come through checkout */
  if (document.querySelector('form[data-validate="payment"]') && !load(SS, "pixelle-delivery-ok", false)) {
    window.location.replace("checkout.html");
  }

  /* copy code */
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var done = function () { btn.textContent = "Copied!"; setTimeout(function () { btn.textContent = "Copy"; }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(btn.getAttribute("data-copy")).then(done, done); else done();
    });
  });

  renderAccount();

  /* open an inspiration tab from a hash link */
  if (location.hash && window.bootstrap) {
    var tabBtn = document.querySelector('[data-bs-target="' + location.hash + '"]');
    if (tabBtn) bootstrap.Tab.getOrCreateInstance(tabBtn).show();
  }
})();
