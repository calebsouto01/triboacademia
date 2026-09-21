// Intro: a própria frase de resultado nasce comprimida/ilegível e só se
// estica em texto limpo conforme o usuário arrasta a alça abaixo dela —
// a copy É o mecanismo, não um comentário sobre ele. Nada de academia
// visível ainda; a marca só aparece no corte de cena, como resposta.
// Tudo controlado por gesto (Pointer Events, mouse e toque), não por
// scroll — não tem como "vencer" a leitura rolando rápido.
(function () {
  var cableText = document.getElementById("introCableText");
  var railTrack = document.querySelector(".drag-rail");
  var dragHandle = document.getElementById("dragHandle");
  var dragRailMark = document.getElementById("dragRailMark");
  var dragHint = document.getElementById("dragHint");
  var introLayer = document.getElementById("introLayer");
  var heroLayer = document.getElementById("heroLayer");
  var whatsappFloat = document.getElementById("whatsapp-float");
  var header = document.querySelector(".header");
  var skipIntro = document.getElementById("skipIntro");

  if (!cableText || !railTrack || !dragHandle) return;

  var TEXT_COMPLETE_VALUE = 30; // o texto termina de esticar (fica 100% legível) aqui
  var TRIGGER_VALUE = 45; // só depois disso o corte de cena dispara — dá uma folga pra ler o texto já pronto antes de cortar
  var REVEAL_DURATION = 650; // ms — deve bater com a transition de .hero-layer.is-revealed no CSS

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // Amarra visualmente a trilha ao texto: a marcação fica exatamente no
  // ponto em que a frase termina de abrir (TEXT_COMPLETE_VALUE), não no
  // meio do curso do puxador.
  function positionRailMark() {
    if (!dragRailMark) return;
    var railTravel = Math.max(railTrack.clientHeight - dragHandle.offsetHeight, 0);
    var centerY = (TEXT_COMPLETE_VALUE / 100) * railTravel + dragHandle.offsetHeight / 2;
    dragRailMark.style.top = centerY + "px";
  }

  var revealed = false;
  var revealing = false;
  var dragging = false;
  var value = 0; // 0-100
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

  // A página fica travada até o usuário puxar (ou pular a intro) — sem
  // isso, dava pra rolar direto pro site sem o cabeçalho/whatsapp
  // aparecerem (eles só ligam depois do corte de cena).
  lockScroll();

  function applyValue(v) {
    value = clamp(v, 0, 100);
    var frac = value / 100;
    // O texto usa sua própria fração, que chega em 1 (totalmente esticado
    // e legível) bem antes do gatilho do corte de cena — assim ele nunca é
    // interrompido no meio do esticamento.
    var textFrac = clamp(value / TEXT_COMPLETE_VALUE, 0, 1);

    var scaleY = lerp(2.4, 1, textFrac);
    var scaleX = lerp(0.4, 1, textFrac);
    var tracking = lerp(-6, 0.5, textFrac);
    var blur = lerp(2, 0, textFrac);
    var opacity = lerp(0.3, 1, textFrac);
    cableText.style.transform = "scale(" + scaleX + ", " + scaleY + ")";
    cableText.style.letterSpacing = tracking + "px";
    cableText.style.filter = "blur(" + blur + "px)";
    cableText.style.opacity = opacity;

    var railTravel = Math.max(railTrack.clientHeight - dragHandle.offsetHeight, 0);
    dragHandle.style.transform = "translateY(" + frac * railTravel + "px)";

    if (dragHint) dragHint.style.opacity = frac > 0.05 ? 0 : 1;
    if (dragRailMark) dragRailMark.classList.toggle("is-reached", value >= TEXT_COMPLETE_VALUE);

    if (!revealed && !revealing && value >= TRIGGER_VALUE) {
      triggerReveal();
    }
  }

  // Soltou antes de puxar o suficiente: tudo volta ao início, convidando a
  // puxar de novo.
  function snapBack() {
    var easing = "0.4s cubic-bezier(0.34, 1.56, 0.64, 1)";
    cableText.style.transition = "transform " + easing + ", letter-spacing " + easing + ", filter " + easing + ", opacity " + easing;
    dragHandle.style.transition = "transform " + easing;
    applyValue(0);
    window.setTimeout(function () {
      cableText.style.transition = "";
      dragHandle.style.transition = "";
    }, 400);
  }

  // Corte de cena único: uma máscara circular (clip-path direto no
  // heroLayer) se expande a partir do centro, como um portal se abrindo,
  // revelando a hero — e a marca — por trás da intro.
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
    cableText.style.transition = "";
    dragHandle.style.transition = "";
    if (dragHandle.setPointerCapture) dragHandle.setPointerCapture(ev.pointerId);
    ev.preventDefault();
  }

  function onPointerMove(ev) {
    if (!dragging) return;
    var railTravel = Math.max(railTrack.clientHeight - dragHandle.offsetHeight, 0);
    var deltaValue = railTravel > 0 ? ((ev.clientY - startY) / railTravel) * 100 : 0;
    applyValue(startValue + deltaValue);
  }

  function onPointerUp() {
    if (!dragging) return;
    dragging = false;
    if (!revealed && !revealing) snapBack();
  }

  dragHandle.addEventListener("pointerdown", onPointerDown);
  dragHandle.addEventListener("pointermove", onPointerMove);
  dragHandle.addEventListener("pointerup", onPointerUp);
  dragHandle.addEventListener("pointercancel", onPointerUp);

  if (skipIntro) {
    skipIntro.addEventListener("click", function (ev) {
      ev.preventDefault();
      if (!revealed && !revealing) triggerReveal();
    });
  }

  positionRailMark();
  window.addEventListener("resize", positionRailMark);
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
