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

// Seção "Nosso Time": card central que troca de profissional em cascata
// conforme o scroll, mesma técnica de scroll pinado + easing da intro/hero,
// generalizada para N fases (uma por profissional).
(function () {
  var section = document.getElementById("equipe");
  if (!section) return;

  var profiles = Array.prototype.slice.call(section.querySelectorAll(".team-profile"));
  var dots = Array.prototype.slice.call(section.querySelectorAll(".team-dot"));
  if (profiles.length === 0) return;

  var count = profiles.length;
  var ticking = false;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function smoothstep(t) {
    t = clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  }

  function update() {
    ticking = false;

    var rect = section.getBoundingClientRect();
    var scrollable = section.offsetHeight - window.innerHeight;
    var progress = scrollable > 0 ? clamp(-rect.top / scrollable, 0, 1) : 0;

    var scaled = progress * count;
    var index = Math.min(Math.floor(scaled), count - 1);
    var local = scaled - index;
    var isLast = index === count - 1;

    profiles.forEach(function (profile, i) {
      var opacity;

      if (i === index) {
        opacity = isLast || local < 0.7 ? 1 : 1 - smoothstep((local - 0.7) / 0.3);
      } else if (i === index + 1 && !isLast) {
        opacity = local < 0.7 ? 0 : smoothstep((local - 0.7) / 0.3);
      } else {
        opacity = 0;
      }

      profile.style.opacity = opacity;
      profile.style.transform = "translateY(" + (1 - opacity) * 16 + "px)";
      profile.style.pointerEvents = opacity > 0.5 ? "auto" : "none";
    });

    dots.forEach(function (dot, i) {
      dot.classList.toggle("is-active", i === index);
    });
  }

  function requestUpdate() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  update();
})();
