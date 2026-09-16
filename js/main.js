(function () {
  var overlay = document.getElementById("intro-overlay");
  var site = document.getElementById("site");
  var handle = document.getElementById("pulley-handle");
  var track = handle ? handle.closest(".pulley-track") : null;
  var successMsg = document.getElementById("intro-success");
  var skipBtn = document.getElementById("skip-intro");
  var whatsappFloat = document.getElementById("whatsapp-float");

  var STORAGE_KEY = "tribo-intro-done";
  var DRAG_THRESHOLD = 120; // px puxados para completar o movimento
  var completed = false;

  function revealSite() {
    if (!overlay) return;
    overlay.classList.add("is-hidden");
    site.removeAttribute("aria-hidden");
    if (whatsappFloat) whatsappFloat.hidden = false;
    document.body.style.overflow = "";
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch (e) {
      /* sessionStorage indisponível: apenas segue sem persistir */
    }
  }

  function completeMovement() {
    if (completed) return;
    completed = true;

    if (handle) handle.classList.add("is-complete");
    if (successMsg) successMsg.classList.add("is-visible");

    setTimeout(revealSite, 1400);
  }

  function skipIntro() {
    completed = true;
    revealSite();
  }

  // Trava o scroll do site principal enquanto a intro está ativa
  document.body.style.overflow = "hidden";

  try {
    if (sessionStorage.getItem(STORAGE_KEY) === "1") {
      completed = true;
      revealSite();
    }
  } catch (e) {
    /* sessionStorage indisponível: intro roda normalmente */
  }

  if (skipBtn) {
    skipBtn.addEventListener("click", skipIntro);
  }

  if (handle && track) {
    var dragging = false;
    var startY = 0;

    handle.addEventListener("pointerdown", function (e) {
      if (completed) return;
      dragging = true;
      startY = e.clientY;
      handle.setPointerCapture(e.pointerId);
    });

    handle.addEventListener("pointermove", function (e) {
      if (!dragging || completed) return;
      var deltaY = e.clientY - startY;
      if (deltaY < 0) deltaY = 0;

      var trackHeight = track.clientHeight;
      var maxTravel = trackHeight - 80;
      var travel = Math.min(deltaY, maxTravel);

      handle.style.top = 14 + travel + "px";

      if (deltaY >= DRAG_THRESHOLD) {
        dragging = false;
        completeMovement();
      }
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      if (!completed) {
        // não puxou o suficiente: volta para a posição inicial
        handle.style.top = "";
      }
    }

    handle.addEventListener("pointerup", endDrag);
    handle.addEventListener("pointercancel", endDrag);

    // Fallback de acessibilidade: teclado/clique também completa o movimento
    handle.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        completeMovement();
      }
    });

    handle.addEventListener("click", function () {
      if (!completed) completeMovement();
    });
  }

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
