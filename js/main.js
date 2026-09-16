(function () {
  var introSection = document.getElementById("intro");
  var track = document.querySelector(".pulley-track");
  var weight = document.getElementById("pulley-weight");
  var introStep = document.querySelector(".intro-step");
  var introArrow = document.querySelector(".pulley-arrow");
  var successMsg = document.getElementById("intro-success");
  var whatsappFloat = document.getElementById("whatsapp-float");

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  var ticking = false;

  function updateIntro() {
    ticking = false;
    if (!introSection || !track || !weight) return;

    var rect = introSection.getBoundingClientRect();
    var scrollable = introSection.offsetHeight - window.innerHeight;
    var progress = scrollable > 0 ? clamp(-rect.top / scrollable, 0, 1) : 1;

    var travel = Math.max(track.clientHeight - weight.offsetHeight - 28, 0);
    weight.style.transform = "translate(-50%, " + -(progress * travel) + "px)";

    if (introStep) introStep.style.opacity = progress > 0.6 ? 0 : 1;
    if (introArrow) introArrow.style.opacity = progress > 0.4 ? 0 : 1;
    if (successMsg) successMsg.classList.toggle("is-visible", progress > 0.75);
    if (whatsappFloat) whatsappFloat.hidden = progress < 0.98;
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
