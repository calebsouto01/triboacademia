// Intro: a própria frase de resultado nasce comprimida/ilegível e só se
// estica em texto limpo conforme o usuário arrasta a alça abaixo dela —
// a copy É o mecanismo, não um comentário sobre ele. Nada de academia
// visível ainda; a marca só aparece no corte de cena, como resposta.
// Tudo controlado por gesto (Pointer Events, mouse e toque), não por
// scroll — não tem como "vencer" a leitura rolando rápido.
//
// Duas puxadas: a primeira abre o texto e trava num checkpoint na metade
// da trilha (tipo catraca — não volta mais pro zero); a segunda, opcional
// na hora mas obrigatória pra revelar, arrasta até o fim da barra e vai
// "raspando" o corte de cena ao vivo, junto com o movimento — solta antes
// do fim e o corte recolhe de volta pro checkpoint.
(function () {
  var cableText = document.getElementById("introCableText");
  var railTrack = document.querySelector(".drag-rail");
  var dragHandle = document.getElementById("dragHandle");
  var dragRailMark = document.getElementById("dragRailMark");
  var dragHint = document.getElementById("dragHint");
  var dragHintLabel = document.getElementById("dragHintLabel");
  var introLayer = document.getElementById("introLayer");
  var heroLayer = document.getElementById("heroLayer");
  var whatsappFloat = document.getElementById("whatsapp-float");
  var header = document.querySelector(".header");
  var skipIntro = document.getElementById("skipIntro");

  if (!cableText || !railTrack || !dragHandle) return;

  var CHECKPOINT_VALUE = 50; // trava da 1ª puxada — cai na metade da trilha; texto já está 100% aberto aqui
  var TRIGGER_VALUE = 95; // 2ª puxada precisa chegar perto do fim da barra pra o corte se consumar sozinho
  var REVEAL_DURATION = 650; // ms — duração do corte quando ele se completa sozinho (bate com a transition padrão do CSS)
  var HERO_CLIP_MAX = 150; // % — mesmo valor usado em .hero-layer.is-revealed no CSS

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // Amarra visualmente a trilha ao checkpoint: a marcação fica exatamente
  // na metade do curso do puxador, onde a 1ª puxada trava.
  function positionRailMark() {
    if (!dragRailMark) return;
    var railTravel = Math.max(railTrack.clientHeight - dragHandle.offsetHeight, 0);
    var centerY = (CHECKPOINT_VALUE / 100) * railTravel + dragHandle.offsetHeight / 2;
    dragRailMark.style.top = centerY + "px";
  }

  var revealed = false;
  var revealing = false;
  var dragging = false;
  var checkpointReached = false; // uma vez true, nunca mais volta a false nesta carga de página
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
    // Depois do checkpoint, o piso deixa de ser 0: é catraca, não dá mais
    // pra puxar de volta além do ponto já conquistado.
    var minValue = checkpointReached ? CHECKPOINT_VALUE : 0;
    value = clamp(v, minValue, 100);

    // O texto termina de abrir exatamente no checkpoint — nunca antes nem
    // depois, então ele já está pronto quando a 1ª puxada trava.
    var textFrac = clamp(value / CHECKPOINT_VALUE, 0, 1);

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
    dragHandle.style.transform = "translateY(" + (value / 100) * railTravel + "px)";

    if (dragRailMark) dragRailMark.classList.toggle("is-reached", value >= CHECKPOINT_VALUE);

    if (!checkpointReached && value >= CHECKPOINT_VALUE) {
      checkpointReached = true;
      if (dragHintLabel) dragHintLabel.textContent = "Puxe de novo";
    }

    // 2ª puxada: o corte de cena é raspado ao vivo pela posição do
    // puxador, não por uma animação de duração fixa — a transição
    // acontece junto com o movimento, não depois dele.
    if (checkpointReached && !revealed && !revealing && heroLayer) {
      var stage2Frac = clamp((value - CHECKPOINT_VALUE) / (100 - CHECKPOINT_VALUE), 0, 1);
      heroLayer.style.clipPath = "circle(" + stage2Frac * HERO_CLIP_MAX + "% at 50% 50%)";
    }

    if (!revealed && !revealing && value >= TRIGGER_VALUE) {
      triggerReveal();
    }
  }

  // Soltou antes de puxar o suficiente na 1ª puxada: tudo volta ao início,
  // convidando a puxar de novo.
  function snapBack() {
    var easing = "0.4s cubic-bezier(0.34, 1.56, 0.64, 1)";
    cableText.style.transition = "transform " + easing + ", letter-spacing " + easing + ", filter " + easing + ", opacity " + easing;
    dragHandle.style.transition = "transform " + easing;
    applyValue(0);
    if (dragHint) dragHint.style.opacity = 1;
    window.setTimeout(function () {
      cableText.style.transition = "";
      dragHandle.style.transition = "";
    }, 400);
  }

  // Soltou depois do checkpoint mas antes do fim da 2ª puxada: o puxador
  // recua até o checkpoint (nunca até o zero — a 1ª puxada já foi
  // conquistada) e o corte de cena, que já estava sendo raspado ao vivo,
  // recolhe de volta a zero.
  function retractToCheckpoint() {
    var easing = "0.4s cubic-bezier(0.34, 1.56, 0.64, 1)";
    dragHandle.style.transition = "transform " + easing;
    if (heroLayer) heroLayer.style.transition = "clip-path " + easing;
    applyValue(CHECKPOINT_VALUE);
    if (dragHint) dragHint.style.opacity = 1;
    window.setTimeout(function () {
      dragHandle.style.transition = "";
      if (heroLayer) heroLayer.style.transition = "";
    }, 400);
  }

  // Corte de cena: a máscara circular (clip-path no heroLayer) termina de
  // se expandir sozinha a partir de onde a 2ª puxada a deixou, revelando a
  // hero — e a marca — por trás da intro.
  function triggerReveal() {
    if (revealed || revealing) return;
    revealing = true;

    if (introLayer) introLayer.style.pointerEvents = "none";
    if (dragHint) dragHint.style.opacity = 0;
    if (heroLayer) {
      heroLayer.style.transition = "clip-path " + REVEAL_DURATION + "ms cubic-bezier(0.65, 0, 0.35, 1)";
      heroLayer.classList.add("is-revealed");
      heroLayer.style.clipPath = "circle(" + HERO_CLIP_MAX + "% at 50% 50%)";
      heroLayer.style.pointerEvents = "auto";
    }

    window.setTimeout(function () {
      revealed = true;
      revealing = false;
      unlockScroll();
      if (whatsappFloat) whatsappFloat.hidden = false;
      if (header) header.classList.add("is-visible");
      if (heroLayer) {
        heroLayer.style.transition = "";
        heroLayer.style.clipPath = "";
      }
    }, REVEAL_DURATION);
  }

  function onPointerDown(ev) {
    if (revealed || revealing) return;
    dragging = true;
    startY = ev.clientY;
    startValue = value;
    cableText.style.transition = "";
    dragHandle.style.transition = "";
    if (heroLayer) heroLayer.style.transition = "none"; // raspagem ao vivo, sem lag de transition
    if (dragHint) dragHint.style.opacity = 0;
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
    if (revealed || revealing) return;
    if (checkpointReached) {
      retractToCheckpoint();
    } else {
      snapBack();
    }
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
