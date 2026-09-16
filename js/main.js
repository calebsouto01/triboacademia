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

  // Fração do scroll da seção dedicada a cada fase.
  var INTRO_END = 0.35; // peso termina de subir aqui (rápido)
  var CROSS_START = 0.3; // hero começa a aparecer (com sobreposição)
  var CROSS_END = 0.55; // hero totalmente visível

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

    if (introLayer) {
      introLayer.style.opacity = 1 - crossProgress;
      introLayer.style.transform = "translateY(" + -(crossProgress * 30) + "px)";
      introLayer.style.pointerEvents = crossProgress > 0.9 ? "none" : "auto";
    }

    if (heroLayer) {
      heroLayer.style.opacity = crossProgress;
      heroLayer.style.transform = "translateY(" + ((1 - crossProgress) * 30) + "px)";
      heroLayer.style.pointerEvents = crossProgress > 0.1 ? "auto" : "none";
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
