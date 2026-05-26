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

/* ---------- Custom cursor ---------- */
const cursor = document.querySelector(".cursor");
const cursorDot = document.querySelector(".cursor-dot");
let cx = window.innerWidth / 2;
let cy = window.innerHeight / 2;
let tx = cx;
let ty = cy;

window.addEventListener("mousemove", (e) => {
  tx = e.clientX;
  ty = e.clientY;
  cursorDot.style.transform = `translate(${tx}px, ${ty}px) translate(-50%, -50%)`;
});

function cursorLoop() {
  cx += (tx - cx) * 0.18;
  cy += (ty - cy) * 0.18;
  cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
  requestAnimationFrame(cursorLoop);
}
cursorLoop();

document.querySelectorAll("a, button, .sector, .sol, .step").forEach((el) => {
  el.addEventListener("mouseenter", () => cursor.classList.add("is-hover"));
  el.addEventListener("mouseleave", () => cursor.classList.remove("is-hover"));
});

/* ---------- Loader ---------- */
const loader = document.getElementById("loader");
const loaderFill = loader.querySelector(".loader__bar-fill");
const loaderCount = loader.querySelector(".loader__count");

let p = 0;
const loaderInterval = setInterval(() => {
  p += Math.random() * 14 + 6;
  if (p >= 100) {
    p = 100;
    clearInterval(loaderInterval);
    finishLoader();
  }
  loaderFill.style.transform = `scaleX(${p / 100})`;
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

/* ---------- Resize handler ---------- */
window.addEventListener("resize", () => {
  ScrollTrigger.refresh();
});
