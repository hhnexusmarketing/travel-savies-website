(function () {
  var canvas = document.getElementById("visa-globe");
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext("2d", { alpha: false });
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var width = 0;
  var height = 0;
  var radius = 0;
  var running = false;
  var visible = true;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var rad = Math.PI / 180;
  var places = [
    ["Thailand", 100.99, 15.87, 16, -16, "start"],
    ["Malaysia", 101.97, 4.21, -18, -4, "end"],
    ["Singapore", 103.82, 1.35, 18, 16, "start"],
    ["Indonesia", 113.9, -0.79, 20, 10, "start"],
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
  for (i = 0; i < 90; i += 1) {
    stars.push([Math.random(), Math.random(), Math.random() * 1.4 + 0.3, Math.random() * 6]);
  }

  function resize() {
    var box = canvas.getBoundingClientRect();
    width = Math.max(1, box.width);
    height = Math.max(1, box.height);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    radius = Math.min(width, height) * (width < 700 ? 0.24 : 0.32);
  }

  function xyz(lon, lat) {
    var lambda = lon * rad;
    var phi = lat * rad;
    var c = Math.cos(phi);
    return [c * Math.cos(lambda), c * Math.sin(lambda), Math.sin(phi)];
  }

  function project(lon, lat, lon0) {
    var lambda = (lon - lon0) * rad;
    var phi = lat * rad;
    var phi0 = 24 * rad;
    var cosPhi = Math.cos(phi);
    var x = cosPhi * Math.sin(lambda);
    var y = Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * cosPhi * Math.cos(lambda);
    var z = Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * cosPhi * Math.cos(lambda);
    return {
      x: x,
      y: y,
      z: z,
      sx: width / 2 + x * radius,
      sy: height / 2 - y * radius
    };
  }

  function horizon(a, b) {
    var t = a.z / (a.z - b.z);
    var x = a.x + (b.x - a.x) * t;
    var y = a.y + (b.y - a.y) * t;
    return { sx: width / 2 + x * radius, sy: height / 2 - y * radius };
  }

  function distance(lon, lat, lon0) {
    var a = xyz(lon, lat);
    var b = xyz(lon0, 24);
    var d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    return Math.acos(Math.max(-1, Math.min(1, d)));
  }

  function slerp(a, b, t) {
    var a3 = xyz(a[0], a[1]);
    var b3 = xyz(b[0], b[1]);
    var dot = a3[0] * b3[0] + a3[1] * b3[1] + a3[2] * b3[2];
    dot = Math.max(-1, Math.min(1, dot));
    var omega = Math.acos(dot);
    if (omega < 0.0001) return a;
    var s = Math.sin(omega);
    var k0 = Math.sin((1 - t) * omega) / s;
    var k1 = Math.sin(t * omega) / s;
    var x = k0 * a3[0] + k1 * b3[0];
    var y = k0 * a3[1] + k1 * b3[1];
    var z = k0 * a3[2] + k1 * b3[2];
    return [Math.atan2(y, x) / rad, Math.asin(Math.max(-1, Math.min(1, z))) / rad];
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function pill(text, px, py, dx, dy, align, alpha, size, scale) {
    ctx.font = "600 " + size + "px Outfit, system-ui, sans-serif";
    var tw = ctx.measureText(text).width;
    var pad = size * 0.6;
    var bw = tw + pad * 2;
    var bh = size * 1.9;
    var lx = px + dx * scale;
    var ly = py + dy * scale;
    var bx = align === "start" ? lx : align === "end" ? lx - bw : lx - bw / 2;
    var by = ly - bh / 2;
    bx = Math.max(8, Math.min(width - bw - 8, bx));
    by = Math.max(8, Math.min(height - bh - 8, by));
    var ex = align === "start" ? bx : align === "end" ? bx + bw : bx + bw / 2;
    var ey = by + bh / 2;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "rgba(255,210,90,.8)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.fillStyle = "rgba(4,14,38,.72)";
    roundRect(bx, by, bw, bh, bh / 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(text, bx + pad, by + bh / 2);
    ctx.globalAlpha = 1;
  }

  function drawLand(land, lon0) {
    var n = land.length;
    var r;
    for (r = 0; r < n; r += 1) {
      var ring = land[r];
      var started = false;
      var prev = null;
      var p;
      ctx.beginPath();
      for (p = 0; p < ring.length; p += 1) {
        var cur = project(ring[p][0], ring[p][1], lon0);
        if (prev) {
          var jump = Math.abs(ring[p][0] - ring[p - 1][0]) > 180;
          if (!jump && prev.z > 0 && cur.z > 0) {
            if (!started) {
              ctx.moveTo(prev.sx, prev.sy);
              started = true;
            }
            ctx.lineTo(cur.sx, cur.sy);
          } else if (!jump && prev.z > 0 && cur.z <= 0) {
            var edge = horizon(prev, cur);
            if (!started) ctx.moveTo(prev.sx, prev.sy);
            ctx.lineTo(edge.sx, edge.sy);
            started = false;
          } else if (!jump && prev.z <= 0 && cur.z > 0) {
            var edgeIn = horizon(prev, cur);
            ctx.moveTo(edgeIn.sx, edgeIn.sy);
            ctx.lineTo(cur.sx, cur.sy);
            started = true;
          } else {
            started = false;
          }
        }
        prev = cur;
      }
      ctx.fill();
    }
  }

  function draw(land, time) {
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

    ctx.strokeStyle = "rgba(255,255,255,.07)";
    ctx.lineWidth = 0.5;
    var step;
    for (step = -60; step <= 60; step += 30) {
      ctx.beginPath();
      var lon;
      var drawing = false;
      for (lon = -180; lon <= 180; lon += 8) {
        var pt = project(lon, step, lon0);
        if (pt.z > 0) {
          if (!drawing) ctx.moveTo(pt.sx, pt.sy);
          else ctx.lineTo(pt.sx, pt.sy);
          drawing = true;
        } else drawing = false;
      }
      ctx.stroke();
    }

    var landFill = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.35, 0, cx, cy, radius);
    landFill.addColorStop(0, "#6fcf5e");
    landFill.addColorStop(0.6, "#3f9d48");
    landFill.addColorStop(1, "#2a7a3a");
    ctx.fillStyle = landFill;
    drawLand(land, lon0);

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

    var font = Math.max(11, radius * 0.055);
    var scale = Math.max(0.8, radius / 280);
    var route;
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = -time / 40;
    ctx.strokeStyle = "rgba(255,196,60,.8)";
    ctx.lineWidth = 1.4;
    for (route = 0; route < places.length; route += 1) {
      ctx.beginPath();
      var drawingRoute = false;
      var u;
      for (u = 0; u <= 32; u += 1) {
        var spot = slerp(home, [places[route][1], places[route][2]], u / 32);
        var dot = project(spot[0], spot[1], lon0);
        if (dot.z > 0) {
          if (!drawingRoute) ctx.moveTo(dot.sx, dot.sy);
          else ctx.lineTo(dot.sx, dot.sy);
          drawingRoute = true;
        } else drawingRoute = false;
      }
      ctx.stroke();
      var fly = slerp(home, [places[route][1], places[route][2]], (time / 3800 + route * 0.137) % 1);
      if (distance(fly[0], fly[1], lon0) < 1.5) {
        var plane = project(fly[0], fly[1], lon0);
        ctx.save();
        ctx.shadowColor = "#ffd25a";
        ctx.shadowBlur = 14;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(plane.sx, plane.sy, 3, 0, 7);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.setLineDash([]);

    var homeDistance = distance(home[0], home[1], lon0);
    if (homeDistance < 1.5) {
      var homePoint = project(home[0], home[1], lon0);
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(homePoint.sx, homePoint.sy, 4, 0, 7);
      ctx.fill();
      pill("Lahore", homePoint.sx, homePoint.sy, -16, 18, "end", Math.min(1, (1.5 - homeDistance) / 0.3), font * 0.9, scale);
    }

    var place;
    for (place = 0; place < places.length; place += 1) {
      var item = places[place];
      var away = distance(item[1], item[2], lon0);
      if (away > 1.5) continue;
      var alpha = Math.min(1, (1.5 - away) / 0.3);
      var pin = project(item[1], item[2], lon0);
      var pulse = 3 + ((time / 45 + place * 6) % 16);
      ctx.globalAlpha = alpha * (1 - pulse / 19);
      ctx.strokeStyle = "#ffd25a";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pin.sx, pin.sy, pulse, 0, 7);
      ctx.stroke();
      ctx.globalAlpha = alpha;
      ctx.save();
      ctx.shadowColor = "#ffd25a";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#ffd25a";
      ctx.beginPath();
      ctx.arc(pin.sx, pin.sy, 3.5, 0, 7);
      ctx.fill();
      ctx.restore();
      pill(item[0], pin.sx, pin.sy, item[3], item[4], item[5], alpha, font, scale);
    }
    ctx.globalAlpha = 1;
  }

  function boot(land) {
    resize();
    window.addEventListener("resize", resize);
    function frame(time) {
      if (!visible || document.hidden) {
        running = false;
        return;
      }
      if (running) return;
      running = true;
      draw(land, time);
      window.requestAnimationFrame(function (next) {
        running = false;
        frame(next);
      });
    }
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible && !reduce) frame(performance.now());
      }).observe(canvas);
    }
    if (reduce) {
      draw(land, 0);
      return;
    }
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden && visible && !running) frame(performance.now());
    });
    frame(performance.now());
  }

  fetch("js/globe-land.json")
    .then(function (response) { return response.json(); })
    .then(boot)
    .catch(function () {});
})();
