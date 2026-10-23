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
    var src = "images/lahore-tour.mp4?v=1";
    var wide = window.matchMedia("(min-width: 1000px)").matches;
    var bg = null;

    function prepareVideo(el, muted) {
      el.setAttribute("playsinline", "");
      el.setAttribute("webkit-playsinline", "");
      el.setAttribute("x5-playsinline", "");
      el.playsInline = true;
      el.autoplay = true;
      el.preload = "auto";
      el.controls = false;
      if (muted) {
        el.muted = true;
        el.defaultMuted = true;
        el.setAttribute("muted", "");
      }
      el.src = src;
    }

    if (wide) {
      gate.classList.add("tour-gate-wide");
      bg = document.createElement("video");
      bg.className = "tour-gate-bg";
      bg.setAttribute("aria-hidden", "true");
      prepareVideo(bg, true);
      gate.appendChild(bg);
    }
    var video = document.createElement("video");
    video.className = "tour-gate-main";
    video.width = 720;
    video.height = 1280;
    prepareVideo(video, false);
    gate.appendChild(video);
    document.body.appendChild(gate);
    document.documentElement.classList.add("tour-gate-on");

    var intro = document.getElementById("intro");
    if (intro) {
      var introVideo = intro.querySelector("video");
      if (introVideo) introVideo.pause();
    }

    var sawPlayback = false;
    var replayed = false;

    function go() {
      if (gone) return;
      gone = true;
      try { video.pause(); } catch (error) {}
      if (bg) {
        try { bg.pause(); } catch (error) {}
      }
      location.href = dest;
    }

    function almostDone() {
      var duration = video.duration;
      return sawPlayback && duration > 1 && video.currentTime >= duration - 0.05;
    }

    video.addEventListener("playing", function () {
      if (document.head.querySelector("[data-tour-warm]")) return;
      var warm = document.createElement("link");
      warm.rel = "prefetch";
      warm.href = dest;
      warm.setAttribute("data-tour-warm", "");
      document.head.appendChild(warm);
    });
    video.addEventListener("timeupdate", function () {
      if (video.currentTime >= 0.35) sawPlayback = true;
      if (!sawPlayback) return;
      if (almostDone()) {
        go();
        return;
      }
      if (bg && Math.abs(bg.currentTime - video.currentTime) > 0.35) bg.currentTime = video.currentTime;
    });
    video.addEventListener("ended", function () {
      if (sawPlayback || video.currentTime > 1) {
        go();
        return;
      }
      if (!replayed) {
        replayed = true;
        try {
          video.currentTime = 0;
          video.play();
        } catch (error) {}
      }
    });
    video.addEventListener("error", function () {
      window.setTimeout(function () {
        if (gone || sawPlayback || !video.paused) return;
        go();
      }, 1500);
    });

    if (bg) bg.play();

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
          if (bg) bg.play();
        });
        gate.appendChild(button);
      });
    }

    var last = 0;
    var still = 0;
    window.setInterval(function () {
      if (gone) return;
      if (video.ended) {
        if (sawPlayback || video.currentTime > 1) go();
        return;
      }
      if (video.currentTime > last + 0.05) {
        last = video.currentTime;
        still = 0;
        return;
      }
      still += 1;
      if (almostDone() || (sawPlayback && still >= 8) || still >= 20) go();
    }, 1000);
    window.setTimeout(go, 40000);
  }, true);
})();
