const menuBtn = document.querySelector(".menu-btn");
const nav = document.querySelector(".nav");

if (menuBtn && nav) {
  menuBtn.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });
}

const year = document.querySelector("[data-year]");
if (year) year.textContent = String(new Date().getFullYear());

(function () {
  var playing = false;

  function isToursLink(href) {
    if (!href || href.charAt(0) === "#") return false;
    var path = href.split("#")[0].split("?")[0];
    return path === "tours.html" || path.endsWith("/tours.html");
  }

  function alreadyOnTours() {
    var here = location.pathname;
    return here.endsWith("/tours.html") || here.endsWith("/tours");
  }

  document.addEventListener("click", function (event) {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var link = event.target.closest("a[href]");
    if (!link || !isToursLink(link.getAttribute("href")) || alreadyOnTours()) return;
    event.preventDefault();
    event.stopPropagation();
    if (playing) return;
    playing = true;

    var dest = link.href;
    var gone = false;
    var gate = document.createElement("div");
    gate.className = "tour-gate";
    gate.setAttribute("role", "dialog");
    gate.setAttribute("aria-label", "Lahore city tour video");
    var video = document.createElement("video");
    video.src = "images/lahore-tour.mp4?v=1";
    video.controls = false;
    video.autoplay = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.setAttribute("x5-playsinline", "");
    video.preload = "auto";
    video.width = 720;
    video.height = 1280;
    gate.appendChild(video);
    document.body.appendChild(gate);
    document.documentElement.classList.add("tour-gate-on");

    var intro = document.getElementById("intro");
    if (intro) {
      var introVideo = intro.querySelector("video");
      if (introVideo) introVideo.pause();
    }

    function go() {
      if (gone) return;
      gone = true;
      location.href = dest;
    }

    video.addEventListener("ended", go);
    video.addEventListener("error", go);

    var started = video.play();
    if (started && started.catch) {
      started.catch(function () {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "tour-gate-play";
        button.textContent = "Play";
        button.addEventListener("click", function () {
          button.remove();
          video.play();
        });
        gate.appendChild(button);
      });
    }

    var last = 0;
    var still = 0;
    window.setInterval(function () {
      if (gone || video.ended) return;
      if (video.currentTime > last + 0.05) {
        last = video.currentTime;
        still = 0;
        return;
      }
      still += 1;
      if (still >= 20) go();
    }, 1000);
    window.setTimeout(go, 40000);
  }, true);
})();
