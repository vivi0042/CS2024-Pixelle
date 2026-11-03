/* Pixelle — Where to Buy (our-stores.html): pop-ups & events carousel.
   Swiper.js: 3 cards on desktop, ~1.2 on phones, arrows + swipe, no autoplay. */
(function () {
  "use strict";

  var section = document.querySelector("[data-ev-section]");
  if (!section) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (window.Swiper) {
    new window.Swiper(section.querySelector(".ev-swiper"), {
      slidesPerView: 1.1,           // phones: one card plus a peek of the next
      spaceBetween: 16,
      speed: reduce ? 0 : 600,
      grabCursor: true,
      watchOverflow: true,
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
        576: { slidesPerView: 1.25, spaceBetween: 20 },
        992: { slidesPerView: 2, spaceBetween: 24 }   // desktop: 2 events side by side
      }
    });
  } else {
    // Swiper didn't load: fall back to a native horizontal scroll so every event is still reachable
    var wrapper = section.querySelector(".swiper-wrapper");
    wrapper.style.cssText = "display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:8px";
    section.querySelectorAll(".ev-card").forEach(function (c) { c.style.flex = "0 0 min(90%,520px)"; c.style.scrollSnapAlign = "start"; });
    section.querySelector(".ev-nav").hidden = true;
  }

  // "Save the date": download a calendar file (.ics) for the event; nothing is sent anywhere
  section.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-ev-ics]");
    if (!btn) return;
    var d = btn.dataset;
    var ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Pixelle//Events//EN", "BEGIN:VEVENT",
      "UID:" + d.start + "-" + d.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() + "@pixelle.sg",
      "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z",
      "DTSTART;VALUE=DATE:" + d.start, "DTEND;VALUE=DATE:" + d.end,
      "SUMMARY:" + d.title, "LOCATION:" + d.where + ", Singapore",
      "DESCRIPTION:Times and venue are confirmed on Instagram @pixellesg a week before.",
      "END:VEVENT", "END:VCALENDAR"
    ].join("\r\n");
    var url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    var a = document.createElement("a");
    a.href = url;
    a.download = d.title.replace(/^Pixelle: /, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase() + ".ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    var label = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i> Added';
    setTimeout(function () { btn.innerHTML = label; }, 1800);
  });

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
