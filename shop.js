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
    var shots = GALLERY[colour] || GALLERY.sage;
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

  document.querySelectorAll(".product-image[data-colour]").forEach(function (btn) {
    btn.addEventListener("click", function () { build(btn.getAttribute("data-colour")); });
  });

  var selected = document.querySelector(".product-image.selected[data-colour]");
  build(selected ? selected.getAttribute("data-colour") : "sage");
})();
