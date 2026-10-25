(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(name, attrs, parent) {
    var node = document.createElementNS(NS, name);
    for (var k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }

  function clamp(x, a, b) { return Math.min(b, Math.max(a, x)); }
  function smooth(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }

  function mix(c1, c2, t) {
    var a = parseInt(c1.slice(1), 16), b = parseInt(c2.slice(1), 16);
    var r = Math.round((a >> 16) + ((b >> 16) - (a >> 16)) * t);
    var g = Math.round(((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * t);
    var bl = Math.round((a & 255) + ((b & 255) - (a & 255)) * t);
    return 'rgb(' + r + ',' + g + ',' + bl + ')';
  }

  /* ---------- Journée : plante animée ---------- */

  var hero = document.getElementById('hero');
  if (hero) {
    var leavesGroup = document.getElementById('leaves');
    var leaves = [];

    // Une feuille composée : un rachis portant des paires de folioles.
    function buildLeaf(y, mirror, base) {
      var outer = el('g', { transform: 'translate(300,' + y + ')' + (mirror ? ' scale(-1,1)' : '') }, leavesGroup);
      var petiole = el('g', {}, outer);
      el('path', { d: 'M0,0 H150', stroke: '#3d7a3a', 'stroke-width': 3, 'stroke-linecap': 'round' }, petiole);
      var folioles = [];
      for (var i = 0; i < 8; i++) {
        var x = 22 + i * 17, ry = 15 - i * 0.6;
        ['up', 'down'].forEach(function (side) {
          var g = el('g', {}, petiole);
          el('ellipse', { cx: 0, cy: -ry, rx: 5, ry: ry, fill: side === 'up' ? '#4f9a4a' : '#468c42' }, g);
          folioles.push({ g: g, x: x, side: side });
        });
      }
      leaves.push({ petiole: petiole, folioles: folioles, base: base });
    }

    buildLeaf(180, false, -5);
    buildLeaf(180, true, -5);
    buildLeaf(125, false, -25);
    buildLeaf(125, true, -25);

    var sky = document.getElementById('sky');
    var sun = document.getElementById('sun');
    var moon = document.getElementById('moon');
    var stars = document.getElementById('stars');
    var shade = document.getElementById('shade');
    var slider = document.getElementById('hour');
    var clock = document.getElementById('clock');
    var status = document.getElementById('status');
    var playBtn = document.getElementById('play');

    // Ouverture des folioles : 1 le jour, 0 la nuit.
    function openness(h) {
      if (h >= 7 && h <= 17) return 1;
      if (h > 17 && h < 20) return 1 - smooth((h - 17) / 3);
      if (h > 4 && h < 7) return smooth((h - 4) / 3);
      return 0;
    }

    function skyColor(e) {
      if (e >= 0.25) return '#a6d8f2';
      if (e >= 0) return mix('#e9a36f', '#a6d8f2', e / 0.25);
      if (e > -0.2) return mix('#121a35', '#e9a36f', (e + 0.2) / 0.2);
      return '#121a35';
    }

    function render(h) {
      var theta = Math.PI * (h - 6) / 12;
      var e = Math.sin(theta);
      sky.setAttribute('fill', skyColor(e));
      sun.setAttribute('cx', 300 - 250 * Math.cos(theta));
      sun.setAttribute('cy', 272 - 220 * e);
      moon.setAttribute('cx', 300 + 250 * Math.cos(theta));
      moon.setAttribute('cy', 272 + 220 * e);
      moon.setAttribute('opacity', clamp(-e * 4, 0, 1));
      stars.setAttribute('opacity', clamp(-e / 0.25, 0, 1));
      var dayness = clamp((e + 0.1) / 0.35, 0, 1);
      shade.setAttribute('opacity', (1 - dayness) * 0.35);

      var o = openness(h);
      var fold = (1 - o) * 80;
      leaves.forEach(function (leaf) {
        leaf.petiole.setAttribute('transform', 'rotate(' + (leaf.base + (1 - o) * 35) + ')');
        leaf.folioles.forEach(function (f) {
          var a = f.side === 'up' ? fold : 180 - fold;
          f.g.setAttribute('transform', 'translate(' + f.x + ',0) rotate(' + a + ')');
        });
      });

      var hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 60);
      clock.textContent = hh + ' h ' + (mm < 10 ? '0' : '') + mm;

      var text;
      if (o > 0.98) text = 'Jour : les folioles sont étalées pour capter la lumière.';
      else if (o < 0.02) text = 'Nuit : les folioles sont repliées et la feuille est abaissée.';
      else if (h > 12) text = 'Le soir : les folioles se replient progressivement…';
      else text = 'À l\'aube : les folioles se rouvrent, avant même le lever du soleil.';
      if (status.textContent !== text) status.textContent = text;
    }

    var hour = 12, playing = !reduceMotion, last = null;
    var HOURS_PER_MS = 24 / 20000;

    function setPlaying(p) {
      playing = p;
      playBtn.textContent = p ? 'Pause' : 'Lecture';
      playBtn.setAttribute('aria-pressed', String(p));
      last = null;
      if (p) requestAnimationFrame(tick);
    }

    function tick(t) {
      if (!playing) return;
      if (last !== null) {
        hour = (hour + (t - last) * HOURS_PER_MS) % 24;
        slider.value = hour;
        render(hour);
      }
      last = t;
      requestAnimationFrame(tick);
    }

    slider.addEventListener('input', function () {
      if (playing) setPlaying(false);
      hour = parseFloat(slider.value);
      render(hour);
    });
    playBtn.addEventListener('click', function () { setPlaying(!playing); });

    render(hour);
    setPlaying(playing);
  }

  /* ---------- Pulvinus : jour / nuit ---------- */

  var pv = document.getElementById('pulvinus');
  if (pv) {
    var pvStatus = document.getElementById('pv-status');
    var texts = {
      day: 'Jour : les cellules de l\'extenseur sont gorgées d\'eau. Elles poussent la feuille vers le haut.',
      night: 'Nuit : l\'extenseur perd ses ions, puis son eau. Ses cellules se vident et la feuille s\'abaisse.'
    };
    var buttons = pv.querySelectorAll('button[data-set]');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var state = btn.getAttribute('data-set');
        pv.setAttribute('data-state', state);
        pvStatus.textContent = texts[state];
        buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
      });
    });
  }

  /* ---------- Courbe de Mairan : tracé à l'apparition ---------- */

  var chart = document.getElementById('mairan');
  if (chart) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      chart.classList.add('seen');
    } else {
      var io = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          chart.classList.add('seen');
          io.disconnect();
        }
      }, { threshold: 0.4 });
      io.observe(chart);
    }
  }
})();
