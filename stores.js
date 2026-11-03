/* Pixelle — Where to Buy (our-stores.html): pop-ups & events carousel.
   Swiper.js: ~1.5 cards on desktop, ~1.1 on phones, side arrows + swipe, slow endless autoplay. */
(function () {
  "use strict";

  var section = document.querySelector("[data-ev-section]");
  if (!section) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- upcoming events: show the date + "Save the date" until the event ends ---------- */
  var today = new Date();
  var todayKey = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  function key(iso) { return parseInt(iso.replace(/-/g, ""), 10); }
  section.querySelectorAll(".ev-card[data-ev-end]").forEach(function (card) {
    var upcoming = key(card.getAttribute("data-ev-end")) >= todayKey;
    card.querySelectorAll("[data-ev-upcoming]").forEach(function (el) { el.hidden = !upcoming; });
  });

  // "Save the date": download a calendar file (.ics); nothing is sent anywhere
  section.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-ev-ics]");
    if (!btn) return;
    var card = btn.closest(".ev-card");
    var start = card.getAttribute("data-ev-start").replace(/-/g, "");
    var endDate = new Date(card.getAttribute("data-ev-end") + "T00:00:00");
    endDate.setDate(endDate.getDate() + 1);           // calendar all-day events end the day after
    var end = endDate.getFullYear() + String(endDate.getMonth() + 1).padStart(2, "0") + String(endDate.getDate()).padStart(2, "0");
    var title = btn.getAttribute("data-title");
    var ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Pixelle//Events//EN", "BEGIN:VEVENT",
      "UID:" + start + "-" + title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() + "@pixelle.sg",
      "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z",
      "DTSTART;VALUE=DATE:" + start, "DTEND;VALUE=DATE:" + end,
      "SUMMARY:" + title, "LOCATION:" + btn.getAttribute("data-where") + ", Singapore",
      "DESCRIPTION:Come print a free sticker with Pixelle! Follow @pixellesg for booth details.",
      "END:VEVENT", "END:VCALENDAR"
    ].join("\r\n");
    var url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    var a = document.createElement("a");
    a.href = url;
    a.download = title.replace(/^Pixelle at /, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() + ".ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    var label = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i> Added';
    setTimeout(function () { btn.innerHTML = label; }, 1800);
  });

  if (window.Swiper) {
    var swiper = new window.Swiper(section.querySelector(".ev-swiper"), {
      slidesPerView: 1.08,          // phones: one card plus a peek of the next
      spaceBetween: 16,
      speed: reduce ? 0 : 1200,     // slow, gentle glide
      loop: true,                   // endless: after the last event it carries on from the first
      autoplay: reduce ? false : {
        delay: 4500,                // each view stays put for 4.5 s so there's time to read
        pauseOnMouseEnter: true,    // hovering a card holds the carousel still
        disableOnInteraction: false // keeps going after someone uses the arrows or swipes
      },
      grabCursor: true,
      navigation: {
        prevEl: section.querySelector(".ev-prev"),
        nextEl: section.querySelector(".ev-next")
      },
      keyboard: { enabled: true, onlyInViewport: true },
      a11y: {
        prevSlideMessage: "Previous events",
        nextSlideMessage: "Next events",
        slideLabelMessage: "Event {{index}} of {{slidesLength}}"
      },
      breakpoints: {
        576: { slidesPerView: 1.2, spaceBetween: 20 },
        992: { slidesPerView: 1.5, spaceBetween: 24 }  // desktop: one card + half of the next
      }
    });
    // keyboard users: hold still while focus is inside the carousel
    if (swiper.autoplay) {
      var box = section.querySelector(".ev-swiper");
      box.addEventListener("focusin", function () { swiper.autoplay.pause(); });
      box.addEventListener("focusout", function (e) { if (!box.contains(e.relatedTarget)) swiper.autoplay.resume(); });
    }
  } else {
    // Swiper didn't load: fall back to a native horizontal scroll so every event is still reachable
    var wrapper = section.querySelector(".swiper-wrapper");
    wrapper.style.cssText = "display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:8px";
    section.querySelectorAll(".ev-card").forEach(function (c) { c.style.flex = "0 0 min(90%,520px)"; c.style.scrollSnapAlign = "start"; });
    section.querySelectorAll(".ev-arrow").forEach(function (b) { b.hidden = true; });
  }

  // fade the section in the first time it scrolls into view
  if (reduce || !("IntersectionObserver" in window)) return;
  section.classList.add("ev-ready");
  var io = new IntersectionObserver(function (entries) {
    if (entries[0].isIntersecting) {
      section.classList.add("ev-in");
      io.disconnect();
    }
  }, { threshold: 0.2 });
  io.observe(section);
})();
