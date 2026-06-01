/* =================================================
   VISUAL NACERT — Interacciones
   ================================================= */

gsap.registerPlugin(ScrollTrigger);

/* ---------- Lenis smooth scroll (defensive) ---------- */
if (typeof Lenis !== "undefined") {
  try {
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    lenis.on("scroll", ScrollTrigger.update);
  } catch (e) {
    console.warn("Lenis init failed, falling back to native scroll", e);
  }
} else {
  console.warn("Lenis not loaded, using native scroll");
}

/* ---------- Custom cursor · isotipo de hexágonos ---------- */
const cursor = document.querySelector(".cursor");
const cursorDot = document.querySelector(".cursor-dot");

// Inyecta un único hexágono naranja dentro del wrapper .cursor.
// Tamaño estándar de puntero (~18px) — mismo peso visual que un cursor de SO.
if (cursor && !cursor.querySelector("svg")) {
  cursor.innerHTML = `
    <svg viewBox="0 0 40 35" aria-hidden="true">
      <polygon points="40,17.32 30,34.64 10,34.64 0,17.32 10,0 30,0"/>
    </svg>`;
}

let cx = window.innerWidth / 2;
let cy = window.innerHeight / 2;
let tx = cx;
let ty = cy;

window.addEventListener("mousemove", (e) => {
  tx = e.clientX;
  ty = e.clientY;
  if (cursorDot) cursorDot.style.transform = `translate(${tx}px, ${ty}px) translate(-50%, -50%)`;
});

function cursorLoop() {
  cx += (tx - cx) * 0.18;
  cy += (ty - cy) * 0.18;
  if (cursor) cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
  requestAnimationFrame(cursorLoop);
}
cursorLoop();

document.querySelectorAll("a, button, .sector, .sol, .step").forEach((el) => {
  el.addEventListener("mouseenter", () => cursor && cursor.classList.add("is-hover"));
  el.addEventListener("mouseleave", () => cursor && cursor.classList.remove("is-hover"));
});

/* ---------- Loader ---------- */
const loader = document.getElementById("loader");
const loaderCount = loader.querySelector(".loader__count");

let p = 0;
const loaderInterval = setInterval(() => {
  p += Math.random() * 14 + 6;
  if (p >= 100) {
    p = 100;
    clearInterval(loaderInterval);
    finishLoader();
  }
  loaderCount.textContent = `${Math.floor(p)}`;
}, 110);

function finishLoader() {
  setTimeout(() => {
    loader.classList.add("is-hidden");
    document.body.classList.add("is-ready");
    playIntro();
  }, 350);
}

/* ---------- Intro animation ---------- */
function playIntro() {
  // Home hero
  const lines = document.querySelectorAll(".hero__line > span");
  if (lines.length) {
    gsap.fromTo(lines,
      { yPercent: 110, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 1.2, stagger: 0.12, ease: "expo.out" }
    );
    gsap.from(".hero__top", { opacity: 0, y: -16, duration: 0.8, delay: 0.3, ease: "power2.out" });
    gsap.from(".hero__lead p, .hero__pillars, .hero__actions, .hero__scroll", {
      opacity: 0, y: 24, duration: 1, delay: 0.9, stagger: 0.12, ease: "power3.out",
    });
  }

  // Page-hero (inner pages)
  const pageHero = document.querySelector(".page-hero");
  if (pageHero) {
    gsap.from(".page-hero__top", { opacity: 0, y: -16, duration: 0.8, delay: 0.1, ease: "power2.out" });
    gsap.from(".page-hero__title", { opacity: 0, y: 40, duration: 1.1, delay: 0.25, ease: "expo.out" });
    gsap.from(".page-hero__lead", { opacity: 0, y: 24, duration: 1, delay: 0.5, ease: "power3.out" });
  }

  // Nav appears after intro
  setTimeout(() => {
    document.getElementById("nav").classList.add("is-visible");
  }, 800);
}

/* ---------- Nav scrolled state ---------- */
const nav = document.getElementById("nav");
ScrollTrigger.create({
  trigger: "body",
  start: "100 top",
  end: "max",
  onUpdate: (self) => {
    nav.classList.toggle("is-scrolled", self.scroll() > 80);
  },
});

/* ---------- Hero · scroll-scrub del vídeo (Apple style) ----------
   El servidor estático no soporta Range requests, así que precargamos
   el vídeo completo en memoria como Blob URL — esto hace que el browser
   pueda hacer seek a cualquier currentTime fluidamente. */
(() => {
  const heroEl = document.querySelector(".hero--scrub");
  const videoEl = document.querySelector(".hero__video");
  if (!heroEl || !videoEl) return;

  // Toma la URL de la primera <source>
  const sourceEl = videoEl.querySelector("source");
  const videoUrl = sourceEl?.src || videoEl.currentSrc;
  if (!videoUrl) return;

  let videoReady = false;
  let ticking = false;
  let lastTarget = -1;

  // Precarga como Blob → seekable inmediato
  fetch(videoUrl)
    .then((r) => r.blob())
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      // Reemplaza la <source> y recarga
      if (sourceEl) sourceEl.src = blobUrl;
      videoEl.src = blobUrl;
      videoEl.load();
    })
    .catch((err) => console.warn("hero video preload failed", err));

  function setupOnReady() {
    videoReady = true;
    try { videoEl.pause(); } catch (_) {}
    try { videoEl.currentTime = 0; } catch (_) {}
    scrub();
  }

  function scrub() {
    if (!videoReady || !videoEl.duration || !isFinite(videoEl.duration)) return;
    const rect = heroEl.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    if (total <= 0) return;
    const scrolled = -rect.top;
    const progress = Math.max(0, Math.min(1, scrolled / total));
    const target = videoEl.duration * progress;
    if (Math.abs(target - lastTarget) < 0.015) return;
    lastTarget = target;
    try { videoEl.currentTime = target; } catch (_) {}
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      scrub();
    });
  }

  videoEl.addEventListener("loadedmetadata", setupOnReady);
  videoEl.addEventListener("canplaythrough", () => { scrub(); });
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
})();

if (document.querySelector(".page-hero")) {
  gsap.to(".page-hero__image", {
    yPercent: 15,
    scale: 1.06,
    ease: "none",
    scrollTrigger: {
      trigger: ".page-hero",
      start: "top top",
      end: "bottom top",
      scrub: true,
    },
  });
}

// Sin fade del texto durante el scrub: el contenido permanece visible
// todo el rato mientras el vídeo (a la derecha) avanza. Cuando termina la
// sección sticky aparece el ticker debajo, en sincronía con el final del vídeo.

/* ---------- Reveal on scroll ---------- */
const reveals = document.querySelectorAll("[data-reveal]");
reveals.forEach((el) => {
  ScrollTrigger.create({
    trigger: el,
    start: "top 85%",
    onEnter: () => el.classList.add("is-in"),
  });
});

/* ---------- Manifesto: text fade-in by word ---------- */
const manifestoTitle = document.querySelector(".manifesto__title");
if (manifestoTitle) {
  const html = manifestoTitle.innerHTML;
  const tokens = html.split(/(<br\s*\/?>|<em>[\s\S]*?<\/em>|\s+)/);
  let out = "";
  tokens.forEach((t) => {
    if (!t) return;
    if (t.match(/<br/i)) {
      out += t;
    } else if (t.match(/<em>/i)) {
      const inner = t.replace(/<\/?em>/g, "");
      out += `<em><span class="rword"><span>${inner}</span></span></em>`;
    } else if (t.trim() === "") {
      out += t;
    } else {
      out += t
        .split(/\s+/)
        .map((w) => (w ? `<span class="rword"><span>${w}</span></span>` : ""))
        .join(" ");
    }
  });
  manifestoTitle.innerHTML = out;

  const style = document.createElement("style");
  style.textContent = `
    .manifesto__title .rword { display: inline-block; overflow: hidden; padding-bottom: 0.05em; }
    .manifesto__title .rword > span { display: inline-block; transform: translateY(110%); }
    .manifesto__title em .rword { padding-bottom: 0.1em; }
  `;
  document.head.appendChild(style);

  gsap.to(".manifesto__title .rword > span", {
    y: 0,
    duration: 1,
    stagger: 0.035,
    ease: "expo.out",
    scrollTrigger: {
      trigger: manifestoTitle,
      start: "top 80%",
    },
  });
}

/* ---------- Stats counters ---------- */
document.querySelectorAll(".stat__num").forEach((el) => {
  const target = parseFloat(el.dataset.count);
  const suffix = el.dataset.suffix || "";
  const obj = { val: 0 };
  ScrollTrigger.create({
    trigger: el,
    start: "top 85%",
    once: true,
    onEnter: () => {
      gsap.to(obj, {
        val: target,
        duration: 1.8,
        ease: "expo.out",
        onUpdate: () => {
          const v = obj.val;
          el.textContent =
            (v >= 100 ? Math.round(v) : v.toFixed(0).padStart(1, "0")) + suffix;
        },
      });
    },
  });
});

/* ---------- CTA Final parallax ---------- */
gsap.to(".cta-final__bg", {
  yPercent: 15,
  ease: "none",
  scrollTrigger: {
    trigger: ".cta-final",
    start: "top bottom",
    end: "bottom top",
    scrub: true,
  },
});

/* ---------- Horizontal scrollers ---------- */
document.querySelectorAll(".scroller").forEach((scroller) => {
  const track = scroller.querySelector(".scroller__track");
  const progressFill = scroller.querySelector(".scroller__progress-fill");
  const arrowPrev = scroller.querySelector(".scroller__arrow--prev");
  const arrowNext = scroller.querySelector(".scroller__arrow--next");
  if (!track) return;

  // Update progress bar
  const updateProgress = () => {
    const max = track.scrollWidth - track.clientWidth;
    if (max <= 0) {
      if (progressFill) progressFill.style.transform = "scaleX(1)";
      return;
    }
    const ratio = track.scrollLeft / max;
    if (progressFill) progressFill.style.transform = `scaleX(${ratio})`;
    if (arrowPrev) arrowPrev.disabled = ratio <= 0.005;
    if (arrowNext) arrowNext.disabled = ratio >= 0.995;
  };
  track.addEventListener("scroll", updateProgress);
  updateProgress();

  // Arrows
  const cardWidth = () => {
    const first = track.querySelector(":scope > *");
    if (!first) return 320;
    const gap = parseFloat(getComputedStyle(track).gap) || 20;
    return first.getBoundingClientRect().width + gap;
  };
  if (arrowPrev) {
    arrowPrev.addEventListener("click", () => {
      track.scrollBy({ left: -cardWidth(), behavior: "smooth" });
    });
  }
  if (arrowNext) {
    arrowNext.addEventListener("click", () => {
      track.scrollBy({ left: cardWidth(), behavior: "smooth" });
    });
  }

  // Drag to scroll
  let isDown = false;
  let startX, startScroll;
  track.addEventListener("pointerdown", (e) => {
    isDown = true;
    track.classList.add("is-grabbing");
    startX = e.pageX;
    startScroll = track.scrollLeft;
    track.setPointerCapture(e.pointerId);
  });
  track.addEventListener("pointermove", (e) => {
    if (!isDown) return;
    const walk = e.pageX - startX;
    track.scrollLeft = startScroll - walk;
  });
  const release = (e) => {
    isDown = false;
    track.classList.remove("is-grabbing");
    if (e && e.pointerId !== undefined) {
      try { track.releasePointerCapture(e.pointerId); } catch (_) {}
    }
  };
  track.addEventListener("pointerup", release);
  track.addEventListener("pointercancel", release);
  track.addEventListener("pointerleave", release);

  // Prevent click-after-drag from following link
  track.addEventListener("click", (e) => {
    const moved = Math.abs((track.scrollLeft - startScroll) || 0);
    if (moved > 6) {
      e.preventDefault();
      e.stopPropagation();
    }
  });
});

/* ---------- FAQ scroll spy del TOC ---------- */
(() => {
  const toc = document.querySelector(".faq-toc");
  if (!toc) return;
  const links = Array.from(toc.querySelectorAll(".faq-toc__link"));
  const groups = links
    .map((l) => document.querySelector(l.getAttribute("href")))
    .filter(Boolean);

  if (!groups.length) return;

  const setActive = (id) => {
    links.forEach((l) => l.classList.toggle("is-active", l.getAttribute("href") === "#" + id));
  };

  const obs = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((e) => e.isIntersecting);
      if (!visible.length) return;
      visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      setActive(visible[0].target.id);
    },
    { rootMargin: "-25% 0px -65% 0px", threshold: 0 }
  );
  groups.forEach((g) => obs.observe(g));

  // Smooth scroll al hacer click en un link del TOC
  links.forEach((l) => {
    l.addEventListener("click", (e) => {
      const id = l.getAttribute("href").slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top, behavior: "smooth" });
    });
  });
})();

/* ---------- Cookie consent · banner + modal granular ---------- */
(() => {
  const KEY = "vn-cookie-consent";

  // Estado por defecto
  const DEFAULTS = { functional: true, statistics: false, marketing: false };

  function loadConsent() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== "object") return null;
      return Object.assign({}, DEFAULTS, obj);
    } catch (_) { return null; }
  }
  function saveConsent(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        functional: true, // siempre
        statistics: !!state.statistics,
        marketing: !!state.marketing,
        timestamp: new Date().toISOString(),
      }));
    } catch (_) {}
  }

  // -------- BANNER COMPACTO (primera visita) --------
  function showBanner() {
    const html = `
    <div class="cookies" role="dialog" aria-labelledby="cookies-title" aria-describedby="cookies-desc">
      <div class="cookies__panel">
        <div class="cookies__icon" aria-hidden="true">
          <svg viewBox="0 0 200 200"><use href="#m-nucleo"/></svg>
        </div>
        <div class="cookies__body">
          <h3 id="cookies-title">Cookies</h3>
          <p id="cookies-desc">Usamos cookies propias y de terceros para habilitar funciones, analizar tráfico y entender cómo se usa el sitio. Puedes aceptar todas, rechazar las no esenciales o configurar tus preferencias. <a href="cookies.html" class="cookies__link">Política de cookies</a>.</p>
        </div>
        <div class="cookies__actions">
          <button class="btn btn--ghost cookies__btn" data-cookies="configure">Configurar</button>
          <button class="btn btn--ghost cookies__btn" data-cookies="reject">Rechazar</button>
          <button class="btn btn--primary cookies__btn" data-cookies="accept">
            <span>Aceptar todas</span>
            <span class="btn__arrow">→</span>
          </button>
        </div>
      </div>
    </div>`;

    const tmp = document.createElement("div");
    tmp.innerHTML = html.trim();
    const banner = tmp.firstChild;
    document.body.appendChild(banner);
    requestAnimationFrame(() => banner.classList.add("is-visible"));

    function dismiss() {
      banner.classList.remove("is-visible");
      setTimeout(() => banner.remove(), 400);
    }

    banner.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-cookies]");
      if (!btn) return;
      const action = btn.dataset.cookies;
      if (action === "accept") {
        saveConsent({ statistics: true, marketing: true });
        dismiss();
        showReopenChip();
      } else if (action === "reject") {
        saveConsent({ statistics: false, marketing: false });
        dismiss();
        showReopenChip();
      } else if (action === "configure") {
        dismiss();
        showModal();
      }
    });
  }

  // -------- MODAL GRANULAR (gestión avanzada) --------
  function showModal(state) {
    const current = state || loadConsent() || DEFAULTS;

    const html = `
    <div class="cookies-modal" role="dialog" aria-labelledby="cookies-modal-title" aria-modal="true">
      <div class="cookies-modal__overlay" data-cookies-close></div>
      <div class="cookies-modal__panel">
        <button class="cookies-modal__close" data-cookies-close aria-label="Cerrar">✕</button>
        <h3 id="cookies-modal-title" class="cookies-modal__title">Cookies</h3>
        <p class="cookies-modal__intro">Utilizamos cookies y tecnologías similares para habilitar los servicios y la funcionalidad de nuestro sitio y para comprender tu interacción con nuestro servicio.</p>

        <div class="cookies-row">
          <button class="cookies-row__header" data-cookies-toggle="functional">
            <span class="cookies-row__name">Funcionales</span>
            <span class="cookies-row__status cookies-row__status--always">Siempre activo</span>
            <span class="cookies-row__caret" aria-hidden="true"></span>
          </button>
          <div class="cookies-row__body">
            <p>Son imprescindibles para que el sitio funcione: sesión, idioma seleccionado, recuerdo de tu elección de cookies. No requieren consentimiento.</p>
          </div>
        </div>

        <div class="cookies-row">
          <button class="cookies-row__header" data-cookies-toggle="statistics">
            <span class="cookies-row__name">Estadísticas</span>
            <span class="cookies-switch ${current.statistics ? "is-on" : ""}" data-cookies-switch="statistics" role="switch" aria-checked="${current.statistics}" tabindex="0"><span class="cookies-switch__knob"></span></span>
            <span class="cookies-row__caret" aria-hidden="true"></span>
          </button>
          <div class="cookies-row__body">
            <p>Nos ayudan a entender de forma anónima cómo se usa el sitio (páginas visitadas, tiempo medio, dispositivos). Sin esto, no podemos mejorar la experiencia.</p>
          </div>
        </div>

        <div class="cookies-row">
          <button class="cookies-row__header" data-cookies-toggle="marketing">
            <span class="cookies-row__name">Marketing</span>
            <span class="cookies-switch ${current.marketing ? "is-on" : ""}" data-cookies-switch="marketing" role="switch" aria-checked="${current.marketing}" tabindex="0"><span class="cookies-switch__knob"></span></span>
            <span class="cookies-row__caret" aria-hidden="true"></span>
          </button>
          <div class="cookies-row__body">
            <p>Permiten mostrar contenido y mensajes relevantes para tus intereses. No las usamos por defecto.</p>
          </div>
        </div>

        <div class="cookies-modal__actions">
          <button class="btn btn--primary" data-cookies-action="accept-all"><span>Acepto</span></button>
          <button class="btn btn--ghost" data-cookies-action="reject-all"><span>Descartar</span></button>
          <button class="btn btn--primary" data-cookies-action="save"><span>Guardar preferencias</span></button>
        </div>

        <div class="cookies-modal__legal">
          <a href="cookies.html">Política de cookies</a>
          <a href="privacidad.html">Política de privacidad</a>
          <a href="aviso-legal.html">Privacidad y términos legales</a>
        </div>
      </div>
    </div>`;

    const tmp = document.createElement("div");
    tmp.innerHTML = html.trim();
    const modal = tmp.firstChild;
    document.body.appendChild(modal);
    document.body.classList.add("is-cookies-modal");
    requestAnimationFrame(() => modal.classList.add("is-visible"));

    const local = Object.assign({}, current);

    function close(persist) {
      modal.classList.remove("is-visible");
      document.body.classList.remove("is-cookies-modal");
      setTimeout(() => modal.remove(), 350);
      if (persist) showReopenChip();
    }

    // Toggles
    modal.querySelectorAll("[data-cookies-switch]").forEach((sw) => {
      const cat = sw.dataset.cookiesSwitch;
      const toggle = () => {
        local[cat] = !local[cat];
        sw.classList.toggle("is-on", local[cat]);
        sw.setAttribute("aria-checked", local[cat]);
      };
      sw.addEventListener("click", (e) => { e.stopPropagation(); toggle(); });
      sw.addEventListener("keydown", (e) => {
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(); }
      });
    });

    // Expand/collapse rows
    modal.querySelectorAll("[data-cookies-toggle]").forEach((header) => {
      header.addEventListener("click", (e) => {
        // No expandir si el click viene del switch
        if (e.target.closest("[data-cookies-switch]")) return;
        const row = header.parentElement;
        row.classList.toggle("is-open");
      });
    });

    // Cerrar
    modal.querySelectorAll("[data-cookies-close]").forEach((el) => {
      el.addEventListener("click", () => close(false));
    });

    // Acciones inferiores
    modal.querySelectorAll("[data-cookies-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.cookiesAction;
        if (action === "accept-all") {
          saveConsent({ statistics: true, marketing: true });
        } else if (action === "reject-all") {
          saveConsent({ statistics: false, marketing: false });
        } else if (action === "save") {
          saveConsent(local);
        }
        close(true);
      });
    });
  }

  // -------- Chip flotante "Cookies" (cuando ya hay consentimiento)
  function showReopenChip() {
    if (document.querySelector(".cookies-chip")) return;
    const chip = document.createElement("button");
    chip.className = "cookies-chip";
    chip.setAttribute("aria-label", "Configurar cookies");
    chip.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="8.5" cy="10" r="1.2" fill="currentColor"/><circle cx="14" cy="9" r="1" fill="currentColor"/><circle cx="15.5" cy="14" r="1.4" fill="currentColor"/><circle cx="10.5" cy="15" r="0.9" fill="currentColor"/></svg>`;
    chip.addEventListener("click", () => showModal());
    document.body.appendChild(chip);
    requestAnimationFrame(() => chip.classList.add("is-visible"));
  }

  // Init
  const stored = loadConsent();
  if (!stored) {
    showBanner();
  } else {
    showReopenChip();
  }

  // Hook global para enlaces "configurar cookies" en footer/legal
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest('[data-open-cookies]');
    if (trigger) { e.preventDefault(); showModal(); }
  });
})();

/* ---------- Hex Ring · rotación con scroll (Solutions) ----------
   El anillo de 6 hexágonos gira alrededor del núcleo central
   mientras se hace scroll por la sección. Cada nodo individual
   contra-rota internamente para mantener el texto vertical
   (eso lo hace el CSS con el transform compuesto). */
(() => {
  const ring = document.getElementById("hexRing");
  if (!ring) return;
  // Desactivar en mobile (CSS desactiva la transformación con !important)
  const mq = window.matchMedia("(max-width: 760px)");
  if (mq.matches) return;

  ScrollTrigger.create({
    trigger: ring.closest(".solutions"),
    start: "top 80%",
    end: "bottom 20%",
    scrub: 1,
    onUpdate: (self) => {
      // Una vuelta completa (360°) repartida en todo el recorrido.
      // El usuario percibe rotación clara sin marear.
      const rot = self.progress * 360;
      ring.style.setProperty("--ring-rot", rot + "deg");
    },
  });
})();

/* ---------- Resize handler ---------- */
window.addEventListener("resize", () => {
  ScrollTrigger.refresh();
});

/* ---------- Sticky CTA pill (home y sectores) ----------
   Aparece tras 600px de scroll, se oculta cerca del CTA final
   y de la propia página /demo para no duplicar acción. */
(() => {
  const cta = document.querySelector(".sticky-cta");
  if (!cta) return;

  let visible = false;
  const SHOW_AFTER = 600;
  // Si la página tiene un .cta-final o un .demo-hero al final, lo evitamos
  const stopEl = document.querySelector(".cta-final, .demo-hero, .post-cta");

  function update() {
    const y = window.scrollY || document.documentElement.scrollTop;
    let shouldShow = y > SHOW_AFTER;
    if (stopEl) {
      const stopTop = stopEl.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.5;
      if (y > stopTop) shouldShow = false;
    }
    if (shouldShow !== visible) {
      visible = shouldShow;
      cta.classList.toggle("is-visible", visible);
    }
  }
  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
})();
