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
  var header = document.querySelector(".header");

  var INTRO_END = 0.18; // peso termina de subir aqui (rápido)
  var REVEAL_TRIGGER = 0.35; // depois da mensagem de sucesso, dispara o corte de cena
  var REVEAL_DURATION = 650; // ms — deve bater com a transition de .hero-layer.is-revealed no CSS

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  var revealed = false;
  var revealing = false;

  function preventScroll(ev) {
    ev.preventDefault();
  }

  function lockScroll() {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    window.addEventListener("wheel", preventScroll, { passive: false });
    window.addEventListener("touchmove", preventScroll, { passive: false });
  }

  function unlockScroll() {
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    window.removeEventListener("wheel", preventScroll, { passive: false });
    window.removeEventListener("touchmove", preventScroll, { passive: false });
  }

  // Fase 2: corte de cena único — não é mais proporcional ao scroll pixel a
  // pixel. Ao cruzar o gatilho, uma máscara circular (aplicada via
  // clip-path direto no heroLayer) se expande sozinha a partir do centro,
  // como um portal se abrindo, revelando a hero por trás da intro.
  function triggerReveal() {
    if (revealed || revealing) return;
    revealing = true;
    lockScroll();

    if (introLayer) introLayer.style.pointerEvents = "none";
    if (heroLayer) {
      heroLayer.classList.add("is-revealed");
      heroLayer.style.pointerEvents = "auto";
    }

    window.setTimeout(function () {
      revealed = true;
      revealing = false;
      unlockScroll();
    }, REVEAL_DURATION);
  }

  var ticking = false;

  function updateIntro() {
    ticking = false;
    if (!section || !track || !weight) return;

    var rect = section.getBoundingClientRect();
    var scrollable = section.offsetHeight - window.innerHeight;
    var progress = scrollable > 0 ? clamp(-rect.top / scrollable, 0, 1) : 1;

    // Fase 1: peso sobe rápido, mensagem de sucesso aparece — sem mudanças.
    var introProgress = clamp(progress / INTRO_END, 0, 1);
    var travel = Math.max(track.clientHeight - weight.offsetHeight - 28, 0);
    weight.style.transform = "translate(-50%, " + -(introProgress * travel) + "px)";

    if (introStep) introStep.style.opacity = introProgress > 0.6 ? 0 : 1;
    if (introArrow) introArrow.style.opacity = introProgress > 0.4 ? 0 : 1;
    if (successMsg) successMsg.classList.toggle("is-visible", introProgress > 0.75);

    if (!revealed && !revealing && progress > REVEAL_TRIGGER) {
      triggerReveal();
    }

    // Cabeçalho e WhatsApp só aparecem depois do corte de cena da intro.
    if (whatsappFloat) whatsappFloat.hidden = !revealed;
    if (header) header.classList.toggle("is-visible", revealed);
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

// Revela ao rolar: fade + leve translateY pra seções que hoje aparecem
// estáticas (Sobre, Horários, Localização), dando movimento consistente
// com o resto do site sem uma animação diferente por seção.
(function () {
  var elements = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  if (elements.length === 0) return;

  if (!("IntersectionObserver" in window)) {
    elements.forEach(function (el) {
      el.classList.add("is-visible");
    });
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  elements.forEach(function (el) {
    observer.observe(el);
  });
})();

// Planos: painéis que expandem. Clique alterna qual painel fica aberto;
// em dispositivos com mouse, passar por cima também abre (hover-intent).
(function () {
  var panels = Array.prototype.slice.call(document.querySelectorAll(".plan-panel"));
  if (panels.length === 0) return;

  var hasHover = window.matchMedia && window.matchMedia("(hover: hover)").matches;

  function openPanel(target) {
    panels.forEach(function (p) {
      p.classList.toggle("is-open", p === target);
    });
  }

  panels.forEach(function (panel) {
    panel.addEventListener("click", function () {
      openPanel(panel);
    });
    if (hasHover) {
      panel.addEventListener("mouseenter", function () {
        openPanel(panel);
      });
    }
  });
})();
