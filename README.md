# VisualNACert · Rediseño 2026

Sitio web del rebrand de VisualNACert — la capa de inteligencia artificial del sector agroalimentario.

## Stack

- HTML/CSS/JS estático
- GSAP + ScrollTrigger (animaciones)
- Lenis (smooth scroll)
- Outfit + Bricolage Grotesque (Google Fonts)
- Vídeo hero con scroll-scrub estilo Apple

## Estructura

```
.
├── index.html              Home con vídeo scroll-scrub
├── soluciones.html         Catálogo de 17 soluciones (scrollers horizontales)
├── visual-app.html         Visual App — features móviles
├── visual-lab.html         Visual Lab — laboratorio en El Puig
├── visual-academy.html     Academy — formación y certificaciones
├── clientes.html           Clientes y casos de éxito
├── nosotros.html           Historia y fundadoras
├── contacto.html           Formulario y datos de contacto
├── styles.css              Estilos globales
├── script.js               Animaciones + scroll-scrub
├── fonts/                  Tipografías locales
├── img/                    Imágenes brand-customizadas
└── video/hero.mp4          Vídeo del hero (scroll-scrubable)
```

## Desarrollo

```bash
python3 -m http.server 4322
```

Abre http://localhost:4322

## Branding

- Naranja corporativo: `#FD801D`
- Ink (charcoal): `#16140F`
- Cream: `#F5F1EA`
- Wordmark: Bricolage Grotesque (Visual 700 + NACert 500)
- Display & body: Outfit
