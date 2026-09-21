// Intro: o usuário PUXA a barra triangular (mouse ou toque) pra levantar o
// peso, como numa máquina de cabo de verdade. Nada mais depende de scroll —
// o gesto é discreto e controlado pelo próprio usuário, então não tem como
// "vencer" a leitura rolando rápido: ele só avança quando decide puxar.
(function () {
  var weight = document.getElementById("pulley-weight");
  var track = document.querySelector(".pulley-track");
  var scaleIndicator = document.getElementById("pulleyScaleIndicator");
  var pullTrack = document.getElementById("pullTrack");
  var pullBar = document.getElementById("pullBar");
  var pullCable = document.getElementById("pullCable");
  var introLayer = document.getElementById("introLayer");
  var heroLayer = document.getElementById("heroLayer");
  var whatsappFloat = document.getElementById("whatsapp-float");
  var header = document.querySelector(".header");
  var skipIntro = document.getElementById("skipIntro");

  if (!weight || !track || !pullTrack || !pullBar) return;

  var TRIGGER_VALUE = 45; // cruzou isso na escala 0-100, o corte de cena dispara sozinho
  var REVEAL_DURATION = 650; // ms — deve bater com a transition de .hero-layer.is-revealed no CSS

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  var revealed = false;
  var revealing = false;
  var dragging = false;
  var value = 0; // 0-100, posição atual na "escala de carga"
  var startY = 0;
  var startValue = 0;

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

  // A página fica travada até o usuário puxar a barra (ou pular a intro) —
  // sem isso, dava pra rolar direto pro site sem o cabeçalho/whatsapp
  // aparecerem (eles só ligam depois do corte de cena).
  lockScroll();

  function applyValue(v) {
    value = clamp(v, 0, 100);
    var frac = value / 100;

    var weightTravel = Math.max(track.clientHeight - weight.offsetHeight - 28, 0);
    weight.style.transform = "translate(-50%, " + -(frac * weightTravel) + "px)";

    var barTravel = Math.max(pullTrack.clientHeight - pullBar.offsetHeight - 20, 0);
    pullBar.style.transform = "translate(-50%, " + frac * barTravel + "px)";

    if (scaleIndicator) scaleIndicator.style.bottom = frac * 100 + "%";
    if (pullCable) pullCable.style.setProperty("--tension", frac);

    if (!revealed && !revealing && value >= TRIGGER_VALUE) {
      triggerReveal();
    }
  }

  // Soltou antes de puxar o suficiente: o cabo "recolhe" o peso de volta,
  // convidando a puxar de novo.
  function snapBack() {
    pullBar.style.transition = "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)";
    weight.style.transition = "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)";
    applyValue(0);
    window.setTimeout(function () {
      pullBar.style.transition = "";
      weight.style.transition = "";
    }, 400);
  }

  // Corte de cena único: uma máscara circular (clip-path direto no
  // heroLayer) se expande a partir do centro, como um portal se abrindo,
  // revelando a hero por trás da intro.
  function triggerReveal() {
    if (revealed || revealing) return;
    revealing = true;

    if (introLayer) introLayer.style.pointerEvents = "none";
    if (heroLayer) {
      heroLayer.classList.add("is-revealed");
      heroLayer.style.pointerEvents = "auto";
    }

    window.setTimeout(function () {
      revealed = true;
      revealing = false;
      unlockScroll();
      if (whatsappFloat) whatsappFloat.hidden = false;
      if (header) header.classList.add("is-visible");
    }, REVEAL_DURATION);
  }

  function onPointerDown(ev) {
    if (revealed || revealing) return;
    dragging = true;
    startY = ev.clientY;
    startValue = value;
    pullBar.style.transition = "";
    weight.style.transition = "";
    if (pullBar.setPointerCapture) pullBar.setPointerCapture(ev.pointerId);
    ev.preventDefault();
  }

  function onPointerMove(ev) {
    if (!dragging) return;
    var barTravel = Math.max(pullTrack.clientHeight - pullBar.offsetHeight - 20, 0);
    var deltaValue = barTravel > 0 ? ((ev.clientY - startY) / barTravel) * 100 : 0;
    applyValue(startValue + deltaValue);
  }

  function onPointerUp() {
    if (!dragging) return;
    dragging = false;
    if (!revealed && !revealing) snapBack();
  }

  pullBar.addEventListener("pointerdown", onPointerDown);
  pullBar.addEventListener("pointermove", onPointerMove);
  pullBar.addEventListener("pointerup", onPointerUp);
  pullBar.addEventListener("pointercancel", onPointerUp);

  if (skipIntro) {
    skipIntro.addEventListener("click", function (ev) {
      ev.preventDefault();
      if (!revealed && !revealing) triggerReveal();
    });
  }

  applyValue(0);

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
