(function () {
  var canvas = document.getElementById("visa-globe");
  if (!canvas || !canvas.getContext || !window.d3) return;

  var ctx = canvas.getContext("2d");
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var width = 0;
  var height = 0;
  var radius = 0;
  var running = false;
  var visible = true;
  var painted = false;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var places = [
    ["Thailand", 100.99, 15.87, 16, -16, "start"],
    ["Malaysia", 101.97, 4.21, -18, -14, "end"],
    ["Singapore", 103.82, 1.35, -18, 18, "end"],
    ["Indonesia", 113.9, -0.79, 22, 6, "start"],
    ["Dubai, UAE", 55.27, 25.2, 18, 18, "start"],
    ["Saudi Arabia", 45.08, 23.89, -20, 8, "end"],
    ["Azerbaijan", 47.58, 40.14, 16, -16, "start"],
    ["Qatar", 51.18, 25.35, -18, -18, "end"],
    ["Maldives", 73.22, 3.2, -18, 10, "end"],
    ["Japan", 138.25, 36.2, 20, 0, "start"],
    ["China", 104.2, 35.86, 0, -30, "middle"]
  ];
  var home = [74.35, 31.55];
  var stars = [];
  var i;
  for (i = 0; i < 280; i += 1) {
    stars.push([Math.random(), Math.random(), Math.random() * 1.5 + 0.3, Math.random() * 6]);
  }

  var proj = d3.geoOrthographic().clipAngle(90).precision(0.5);
  var path = d3.geoPath(proj, ctx);
  var grat = d3.geoGraticule10();
  var land = null;

  function resize() {
    var box = canvas.getBoundingClientRect();
    width = Math.max(1, box.width);
    height = Math.max(1, box.height);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    radius = Math.min(width, height) * 0.36;
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, r);
      return;
    }
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function overlaps(a, b) {
    var gap = 6;
    return a.bx < b.bx + b.bw + gap && a.bx + a.bw + gap > b.bx && a.by < b.by + b.bh + gap && a.by + a.bh + gap > b.by;
  }

  function placeLabels(items) {
    items.sort(function (a, b) { return a.ly - b.ly; });
    var placed = [];
    var n;
    for (n = 0; n < items.length; n += 1) {
      var item = items[n];
      var box = {
        text: item.text,
        px: item.px,
        py: item.py,
        bw: item.bw,
        bh: item.bh,
        pad: item.pad,
        bx: item.bx,
        by: item.by
      };
      box.bx = Math.max(8, Math.min(width - box.bw - 8, box.bx));
      box.by = Math.max(8, Math.min(height - box.bh - 8, box.by));
      var guard = 0;
      var moved = true;
      while (moved && guard < 16) {
        moved = false;
        guard += 1;
        var p;
        for (p = 0; p < placed.length; p += 1) {
          var other = placed[p];
          if (!overlaps(box, other)) continue;
          var below = other.by + other.bh + 6;
          var above = other.by - box.bh - 6;
          if (box.by + box.bh / 2 >= other.by + other.bh / 2 && below + box.bh <= height - 8) box.by = below;
          else if (above >= 8) box.by = above;
          else box.by = Math.max(8, Math.min(height - box.bh - 8, below));
          moved = true;
        }
        box.by = Math.max(8, Math.min(height - box.bh - 8, box.by));
      }
      placed.push(box);
    }
    return placed;
  }

  function drawPills(items) {
    var placed = placeLabels(items);
    var n;
    for (n = 0; n < placed.length; n += 1) {
      var box = placed[n];
      var endX = Math.max(box.bx, Math.min(box.px, box.bx + box.bw));
      var endY = Math.max(box.by, Math.min(box.py, box.by + box.bh));
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "rgba(255,210,90,.8)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(box.px, box.py);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.fillStyle = "rgba(4,14,38,.72)";
      roundRect(box.bx, box.by, box.bw, box.bh, box.bh / 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,210,90,.75)";
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(box.text, box.bx + box.pad, box.by + box.bh / 2);
    }
    ctx.globalAlpha = 1;
  }

  function labelBox(text, px, py, dx, dy, anchor, size, scale) {
    ctx.font = "600 " + size + "px Outfit, system-ui, sans-serif";
    var tw = ctx.measureText(text).width;
    var pad = size * 0.6;
    var bw = tw + pad * 2;
    var bh = size * 1.9;
    var lx = px + dx * scale;
    var ly = py + dy * scale;
    var bx = anchor === "start" ? lx : anchor === "end" ? lx - bw : lx - bw / 2;
    return { text: text, px: px, py: py, bx: bx, by: ly - bh / 2, ly: ly, bw: bw, bh: bh, pad: pad };
  }

  function draw(time) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var cx = width / 2;
    var cy = height / 2;
    var sky = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.7);
    sky.addColorStop(0, "#0a1a40");
    sky.addColorStop(1, "#02040d");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    var s;
    for (s = 0; s < stars.length; s += 1) {
      var star = stars[s];
      ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(time / 900 + star[3]));
      ctx.fillStyle = "#fff";
      ctx.fillRect(star[0] * width, star[1] * height, star[2], star[2]);
    }
    ctx.globalAlpha = 1;

    var lon0 = 35 + time * 0.008;
    proj.translate([cx, cy]).scale(radius).rotate([-lon0, -24, 0]);
    var center = [lon0, 24];

    var glow = ctx.createRadialGradient(cx, cy, radius * 0.92, cx, cy, radius * 1.35);
    glow.addColorStop(0, "rgba(90,170,255,.6)");
    glow.addColorStop(1, "rgba(90,170,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.35, 0, 7);
    ctx.fill();

    var ocean = ctx.createRadialGradient(cx - radius * 0.35, cy - radius * 0.4, 0, cx, cy, radius * 1.05);
    ocean.addColorStop(0, "#3d9bff");
    ocean.addColorStop(0.5, "#1561c9");
    ocean.addColorStop(1, "#06286a");
    ctx.fillStyle = ocean;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 7);
    ctx.fill();

    ctx.beginPath();
    path(grat);
    ctx.strokeStyle = "rgba(255,255,255,.07)";
    ctx.lineWidth = 0.5;
    ctx.stroke();

    var landFill = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.35, 0, cx, cy, radius);
    landFill.addColorStop(0, "#6fcf5e");
    landFill.addColorStop(0.6, "#3f9d48");
    landFill.addColorStop(1, "#2a7a3a");
    ctx.beginPath();
    path(land);
    ctx.fillStyle = landFill;
    ctx.fill();
    ctx.strokeStyle = "rgba(18,70,32,.9)";
    ctx.lineWidth = 0.6;
    ctx.stroke();

    var shade = ctx.createRadialGradient(cx - radius * 0.38, cy - radius * 0.42, 0, cx, cy, radius * 1.05);
    shade.addColorStop(0, "rgba(255,255,255,.3)");
    shade.addColorStop(0.45, "rgba(255,255,255,0)");
    shade.addColorStop(1, "rgba(0,8,36,.62)");
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 7);
    ctx.fill();
    ctx.strokeStyle = "rgba(140,200,255,.65)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 7);
    ctx.stroke();

    var font = Math.max(11, radius * 0.05);
    var scale = Math.max(0.8, radius / 300);
    var route;
    for (route = 0; route < places.length; route += 1) {
      var spot = [places[route][1], places[route][2]];
      ctx.beginPath();
      path({ type: "LineString", coordinates: [home, spot] });
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = -time / 40;
      ctx.strokeStyle = "rgba(255,196,60,.8)";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.setLineDash([]);
      var fly = d3.geoInterpolate(home, spot)((time / 3800 + route * 0.137) % 1);
      if (d3.geoDistance(fly, center) < 1.5) {
        var plane = proj(fly);
        if (!plane) continue;
        ctx.save();
        ctx.shadowColor = "#ffd25a";
        ctx.shadowBlur = 14;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(plane[0], plane[1], 3, 0, 7);
        ctx.fill();
        ctx.restore();
      }
    }

    var labels = [];
    var homeDistance = d3.geoDistance(home, center);
    if (homeDistance <= 1.25) {
      var homePoint = proj(home);
      if (homePoint) {
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(homePoint[0], homePoint[1], 4, 0, 7);
        ctx.fill();
        labels.push(labelBox("Lahore", homePoint[0], homePoint[1], 0, -24, "middle", font * 0.9, scale));
      }
    }

    var place;
    for (place = 0; place < places.length; place += 1) {
      var item = places[place];
      var point = [item[1], item[2]];
      var away = d3.geoDistance(point, center);
      if (away > 1.5) continue;
      var pin = proj(point);
      if (!pin) continue;
      var pulse = 3 + ((time / 45 + place * 6) % 16);
      ctx.globalAlpha = 1 - pulse / 19;
      ctx.strokeStyle = "#ffd25a";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pin[0], pin[1], pulse, 0, 7);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.shadowColor = "#ffd25a";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#ffd25a";
      ctx.beginPath();
      ctx.arc(pin[0], pin[1], 3.5, 0, 7);
      ctx.fill();
      ctx.restore();
      if (away <= 1.25) labels.push(labelBox(item[0], pin[0], pin[1], item[3], item[4], item[5], font, scale));
    }
    ctx.globalAlpha = 1;
    drawPills(labels);
    painted = true;
  }

  function frame(time) {
    if (reduce) {
      if (!painted) draw(0);
      return;
    }
    if (!visible || document.hidden) {
      running = false;
      if (!painted) draw(0);
      return;
    }
    if (running) return;
    running = true;
    draw(time);
    window.requestAnimationFrame(function (next) {
      running = false;
      frame(next);
    });
  }

  function boot() {
    resize();
    if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener("resize", resize);
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible && !reduce) frame(performance.now());
      }).observe(canvas);
    }
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden && visible && !running && !reduce) frame(performance.now());
    });
    frame(performance.now());
  }

  fetch("js/globe-land.json?v=2")
    .then(function (response) { return response.json(); })
    .then(function (data) {
      land = data;
      boot();
    })
    .catch(function () {});
})();
