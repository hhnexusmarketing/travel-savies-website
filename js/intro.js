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
    intro.classList.add("intro-out");
    document.documentElement.classList.remove("intro-on");
    window.setTimeout(function () {
      intro.remove();
    }, 480);
  }

  video.playsInline = true;
  video.muted = true;
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");

  video.addEventListener("ended", finish);
  video.addEventListener("error", finish);

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
        return;
      }
      finish();
    });
  }

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) start();
  });

  var wait = window.setInterval(function () {
    if (finished) {
      window.clearInterval(wait);
      return;
    }
    if (!video.paused) return;
    if (video.readyState >= 2) start();
  }, 400);

  window.setTimeout(function () {
    window.clearInterval(wait);
    if (!finished && video.paused && video.readyState < 2) finish();
  }, 5000);

  start();
})();
