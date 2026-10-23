(function () {
  var intro = document.getElementById("intro");
  if (!intro) return;

  var video = intro.querySelector("video");
  var finished = false;

  function finish() {
    if (finished) return;
    finished = true;
    try {
      sessionStorage.setItem("ts-intro", "1");
    } catch (error) {}
    document.documentElement.classList.remove("intro-on");
    if (video) {
      video.pause();
      video.removeAttribute("src");
      var source = video.querySelector("source");
      if (source) source.removeAttribute("src");
      video.load();
    }
    if (!intro.parentNode) return;
    intro.classList.add("intro-out");
    window.setTimeout(function () {
      if (intro.parentNode) intro.remove();
    }, 480);
  }

  video.playsInline = true;
  video.muted = true;
  video.defaultMuted = true;
  video.controls = false;
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  video.setAttribute("x5-playsinline", "");

  video.addEventListener("ended", finish);
  video.addEventListener("canplay", start);
  video.addEventListener("loadeddata", start);

  function start() {
    if (finished || !video.paused) return;
    var started = video.play();
    if (!started || typeof started.catch !== "function") return;
    started.catch(function (error) {
      if (!error || error.name === "AbortError") return;
      if (error.name === "NotAllowedError") {
        intro.addEventListener("pointerdown", function () {
          video.play().catch(function () {});
        }, { once: true });
      }
    });
  }

  intro.addEventListener("pointerdown", function () {
    finish();
  });

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) start();
  });

  var wait = window.setInterval(function () {
    if (finished) {
      window.clearInterval(wait);
      return;
    }
    if (!video.paused && video.currentTime > 0.2) return;
    if (video.readyState >= 2) start();
  }, 400);

  window.setTimeout(function () {
    if (finished || video.error) {
      if (!finished) finish();
      return;
    }
    if (video.readyState >= 2 && (video.paused || video.currentTime < 0.25)) finish();
  }, 2500);

  window.setTimeout(function () {
    window.clearInterval(wait);
    if (!finished) finish();
  }, 9000);

  start();
})();
