(function () {
  var section = document.getElementById("intro-hero");
  var track = document.querySelector(".pulley-track");
  var weight = document.getElementById("pulley-weight");
  var introLayer = document.getElementById("introLayer");
  var introStep = document.querySelector(".intro-step");
  var introArrow = document.querySelector(".pulley-arrow");
  var successMsg = document.getElementById("intro-success");
  var heroLayer = document.getElementById("heroLayer");
  var whatsappFloat = document.getElementById("whatsapp-float");

  // Fração do scroll da seção dedicada a cada fase (seção agora é mais alta,
  // então o peso continua subindo rápido em pixels, e sobra bastante scroll
  // para uma transição lenta e suave até a hero).
  var INTRO_END = 0.18; // peso termina de subir aqui (rápido)
  var CROSS_START = 0.24; // hero começa a aparecer, depois da mensagem de sucesso
  var CROSS_END = 0.75; // transição longa e suave até a hero assentar

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  var ticking = false;

  function updateIntro() {
    ticking = false;
    if (!section || !track || !weight) return;

    var rect = section.getBoundingClientRect();
    var scrollable = section.offsetHeight - window.innerHeight;
    var progress = scrollable > 0 ? clamp(-rect.top / scrollable, 0, 1) : 1;

    // Fase 1: peso sobe rápido.
    var introProgress = clamp(progress / INTRO_END, 0, 1);
    var travel = Math.max(track.clientHeight - weight.offsetHeight - 28, 0);
    weight.style.transform = "translate(-50%, " + -(introProgress * travel) + "px)";

    if (introStep) introStep.style.opacity = introProgress > 0.6 ? 0 : 1;
    if (introArrow) introArrow.style.opacity = introProgress > 0.4 ? 0 : 1;
    if (successMsg) successMsg.classList.toggle("is-visible", introProgress > 0.75);

    // Fase 2: transição (crossfade) da intro para a hero, como uma sessão única.
    var crossProgress = clamp((progress - CROSS_START) / (CROSS_END - CROSS_START), 0, 1);

    // Suavização (ease-in-out) para o movimento não parecer linear/mecânico.
    var eased = crossProgress * crossProgress * (3 - 2 * crossProgress);

    if (introLayer) {
      introLayer.style.opacity = 1 - eased;
      introLayer.style.transform =
        "translateY(" + -(eased * 50) + "px) scale(" + (1 - eased * 0.08) + ")";
      introLayer.style.pointerEvents = eased > 0.9 ? "none" : "auto";
    }

    if (heroLayer) {
      heroLayer.style.opacity = eased;
      heroLayer.style.transform =
        "translateY(" + ((1 - eased) * 50) + "px) scale(" + (0.94 + eased * 0.06) + ")";
      heroLayer.style.pointerEvents = eased > 0.1 ? "auto" : "none";
    }

    // O restante do site só aparece (fica acessível) após a hero terminar de aparecer.
    if (whatsappFloat) whatsappFloat.hidden = progress < 0.97;
  }

  function requestUpdate() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(updateIntro);
    }
  }

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  updateIntro();

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();

// Partículas que fogem do mouse na hero: decoração sutil sobre o banner,
// pausada via IntersectionObserver quando a hero sai da tela (economia de CPU).
(function () {
  var canvas = document.getElementById("heroParticles");
  if (!canvas) return;

  var ctx = canvas.getContext("2d");
  var section = document.getElementById("intro-hero");
  var points = [];
  var mouse = { x: -999, y: -999 };
  var raf = null;
  var running = false;

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function measure() {
    var rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    points = [];
    var gap = 44;
    for (var y = gap / 2; y < canvas.height; y += gap) {
      for (var x = gap / 2; x < canvas.width; x += gap) {
        points.push({ ox: x, oy: y, x: x, y: y });
      }
    }
  }

  function onMove(ev) {
    var rect = canvas.getBoundingClientRect();
    mouse.x = ev.clientX - rect.left;
    mouse.y = ev.clientY - rect.top;
  }

  function onLeave() {
    mouse.x = mouse.y = -999;
  }

  function draw() {
    if (!running) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    points.forEach(function (p) {
      var dx = p.x - mouse.x;
      var dy = p.y - mouse.y;
      var d = Math.hypot(dx, dy);

      if (d < 80 && d > 0) {
        var f = (80 - d) / 80;
        p.x += (dx / d) * f * 7;
        p.y += (dy / d) * f * 7;
      }

      p.x = lerp(p.x, p.ox, 0.08);
      p.y = lerp(p.y, p.oy, 0.08);

      var brilho = clamp(1 - Math.hypot(p.x - p.ox, p.y - p.oy) / 30, 0.25, 1);
      ctx.fillStyle = "rgba(255, 255, 255, " + (brilho * 0.7).toFixed(2) + ")";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    });

    raf = requestAnimationFrame(draw);
  }

  function start() {
    if (running) return;
    running = true;
    raf = requestAnimationFrame(draw);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
  }

  measure();
  window.addEventListener("resize", measure);
  window.addEventListener("mousemove", onMove, { passive: true });
  window.addEventListener("mouseleave", onLeave);

  if (section && "IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        if (entries[0].isIntersecting) start();
        else stop();
      },
      { threshold: 0 }
    );
    observer.observe(section);
  } else {
    start();
  }
})();

// Seção "Nosso Time": cartões que empilham na rolagem normal da página.
// Cada cartão gruda no topo (position: sticky) e o seguinte sobe por cima
// dele; o de baixo encolhe e escurece, criando a sensação de pilha.
(function () {
  var section = document.getElementById("equipe");
  if (!section) return;

  var folhas = Array.prototype.slice.call(section.querySelectorAll(".team-folha"));
  if (folhas.length === 0) return;

  var TOPO = 90; // mesmo valor do "top" do sticky no CSS (.team-folha)

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function medirPosicoesNaturais() {
    return folhas.map(function (f) {
      var antes = f.style.position;
      f.style.position = "static";
      var y = f.getBoundingClientRect().top + window.scrollY;
      f.style.position = antes;
      return y;
    });
  }

  var naturais = medirPosicoesNaturais();
  var ticking = false;

  function update() {
    ticking = false;
    folhas.forEach(function (f, i) {
      var vao = f.offsetHeight + 16;
      var preso = clamp((window.scrollY + TOPO - naturais[i]) / vao, 0, 1);
      f.style.transform = "scale(" + (1 - preso * 0.1) + ")";
      f.style.filter = "brightness(" + (1 - preso * 0.5) + ")";
      f.style.zIndex = i;
    });
  }

  function requestUpdate() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", function () {
    naturais = medirPosicoesNaturais();
    requestUpdate();
  });
  update();
})();
