// All page motion runs through GSAP. Content is visible by default; every
// tween animates *from* a hidden state, so a failed script never hides the page.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollSmoother } from 'gsap/ScrollSmoother';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { LORDICON_SRC, PARTICLE_REVEAL } from '../config.js';
import {
  createParticleReveal,
  supportsHtmlInCanvas,
} from '../components/canvasui/ParticleRevealVanilla.ts';

gsap.registerPlugin(ScrollTrigger, ScrollSmoother, SplitText, DrawSVGPlugin);

const EASE = 'expo.out';
const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
let smoother = null;
let particleMounted = false;

function topOffset() {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar')) || 56;
}

/* ---------- Hero mark: Lordicon if configured, else the SVG eye draws itself ---------- */
function mountMark(motion) {
  const mark = document.getElementById('intro-mark');
  if (LORDICON_SRC) {
    const script = document.createElement('script');
    script.src = 'https://cdn.lordicon.com/lordicon.js';
    script.async = true;
    document.head.appendChild(script);
    const icon = document.createElement('lord-icon');
    icon.setAttribute('src', LORDICON_SRC);
    // "in" plays once when the icon enters the viewport, i.e. on load here.
    icon.setAttribute('trigger', motion ? 'in' : 'none');
    icon.setAttribute('colors', 'primary:#ecece8,secondary:#e8b04a');
    icon.setAttribute('aria-hidden', 'true');
    mark.replaceChildren(icon);
    const credits = document.getElementById('credits');
    credits.insertAdjacentHTML(
      'beforeend',
      ' Animated icon by <a href="https://lordicon.com" target="_blank" rel="noreferrer">Lordicon.com</a>.',
    );
    return null;
  }
  if (!motion) return null;
  const parts = mark.querySelectorAll('.intro-eye path, .intro-eye circle');
  return gsap.from(parts, { drawSVG: '0%', duration: 1.4, ease: 'power2.inOut', stagger: 0.25 });
}

/* ---------- Canvas UI particle reveal on the hero heading ---------- */
function mountParticleReveal() {
  // Needs the experimental HTML-in-Canvas API. Elsewhere, children of a
  // <canvas> are not painted, so we leave the plain heading alone.
  if (!PARTICLE_REVEAL || !supportsHtmlInCanvas() || !window.matchMedia('(pointer: fine)').matches) return false;
  const host = document.getElementById('intro-title-host');
  const h1 = document.getElementById('intro-title');
  const height = h1.offsetHeight;

  const source = document.createElement('canvas');
  source.setAttribute('layoutsubtree', '');
  source.className = 'pr-source';
  source.style.height = height + 'px';
  const content = document.createElement('div');
  content.className = 'pr-content';
  const output = document.createElement('canvas');
  output.className = 'pr-output';
  output.setAttribute('aria-hidden', 'true');

  content.appendChild(h1);
  source.appendChild(content);
  host.append(source, output);

  const instance = createParticleReveal(
    { source, content, output },
    { background: '#111111', radius: 280, scatter: 18, aberration: 18, bend: 24 },
  );
  if (!instance) {
    host.replaceChildren(h1);
    return false;
  }
  new ResizeObserver(() => {
    source.style.height = content.scrollHeight + 'px';
    instance.resize();
  }).observe(content);
  return true;
}

/* ---------- Load sequence: the one authored moment ---------- */
function introTimeline(motion) {
  const tl = gsap.timeline({ defaults: { ease: EASE } });
  if (!motion) {
    tl.from('.intro-inner > *', { opacity: 0, duration: 0.4, stagger: 0.05 });
    return tl;
  }
  const draw = mountMark(true);
  if (draw) tl.add(draw, 0);
  else tl.from('#intro-mark', { opacity: 0, scale: 0.8, duration: 0.8 }, 0);

  if (!particleMounted) {
    const split = SplitText.create('#intro-title', { type: 'lines', mask: 'lines' });
    tl.from(split.lines, { yPercent: 105, duration: 1.1, stagger: 0.12 }, 0.25);
  } else {
    tl.from('#intro-title-host', { opacity: 0, duration: 1 }, 0.25);
  }
  tl.from('.intro-lede', { opacity: 0, y: 16, filter: 'blur(6px)', duration: 0.9 }, 0.7)
    .from('.intro-cta > *', { opacity: 0, y: 12, duration: 0.7, stagger: 0.08 }, 0.85)
    .from('.intro-orbit', { opacity: 0, scale: 0.85, duration: 2.2 }, 0)
    .from('.scroll-cue', { opacity: 0, duration: 0.6 }, 1.4);
  gsap.to('.scroll-cue .ico', { y: 6, duration: 1.1, ease: 'sine.inOut', repeat: -1, yoyo: true, delay: 2 });
  return tl;
}

/* ---------- Scroll-driven sections ---------- */
function scrollScenes() {
  // Pinned hero: the field pulls back and the headline lifts away.
  gsap.timeline({
    scrollTrigger: { trigger: '.intro', start: 'top top', end: '+=70%', scrub: 0.6, pin: true },
  })
    .to('.intro-orbit', { scale: 1.45, rotate: 28, opacity: 0.12, ease: 'none' }, 0)
    .to('.intro-inner', { yPercent: -14, opacity: 0, filter: 'blur(8px)', ease: 'none' }, 0)
    .to('.scroll-cue', { opacity: 0, ease: 'none' }, 0);

  // Section headings: lines rise out of a mask as they scroll in.
  for (const h of gsap.utils.toArray('h2.reveal')) {
    SplitText.create(h, {
      type: 'lines',
      mask: 'lines',
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.lines, {
          yPercent: 110,
          duration: 0.9,
          ease: EASE,
          stagger: 0.08,
          scrollTrigger: { trigger: h, start: 'top 88%', once: true },
        }),
    });
  }
  for (const p of gsap.utils.toArray('.section-head .lede')) {
    gsap.from(p, {
      opacity: 0,
      y: 14,
      duration: 0.8,
      ease: EASE,
      scrollTrigger: { trigger: p, start: 'top 90%', once: true },
    });
  }

  // Each section enters in a way that matches its content.
  gsap.from('.predict > *', {
    opacity: 0,
    y: 28,
    duration: 0.9,
    ease: EASE,
    stagger: 0.12,
    scrollTrigger: { trigger: '.predict', start: 'top 80%', once: true },
  });
  // Charts wipe in left to right, the way the field is read.
  gsap.from('.viz .panel', {
    clipPath: 'inset(0 100% 0 0)',
    duration: 1.2,
    ease: 'expo.inOut',
    stagger: 0.15,
    scrollTrigger: { trigger: '.viz', start: 'top 80%', once: true },
  });
  // History slides in like a ticker.
  ScrollTrigger.batch('.draw', {
    start: 'top 92%',
    once: true,
    onEnter: (items) =>
      gsap.from(items, { opacity: 0, x: 36, duration: 0.7, ease: EASE, stagger: 0.05 }),
  });
  gsap.from('.metric', {
    opacity: 0,
    duration: 0.8,
    ease: 'power2.out',
    stagger: 0.1,
    scrollTrigger: { trigger: '.metrics', start: 'top 85%', once: true },
  });
}

/* ---------- Side nav: highlight the section in view ---------- */
function trackSections() {
  const links = [...document.querySelectorAll('.sidenav a')];
  for (const link of links) {
    const section = document.getElementById(link.dataset.nav);
    if (!section) continue;
    ScrollTrigger.create({
      trigger: section,
      start: 'top 45%',
      end: 'bottom 45%',
      onToggle: (self) => {
        if (!self.isActive) return;
        for (const l of links) l.setAttribute('aria-current', String(l === link));
      },
    });
  }
}

/* ---------- In-page links go through the smoother ---------- */
function bindAnchors() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    const target = id === 'top' ? document.body : document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    const offset = topOffset() + 16;
    if (smoother) {
      smoother.scrollTo(id === 'top' ? 0 : target, true, `top ${offset}px`);
    } else if (id === 'top') {
      window.scrollTo({ top: 0, behavior: reduceQuery.matches ? 'auto' : 'smooth' });
    } else {
      target.scrollIntoView({ behavior: reduceQuery.matches ? 'auto' : 'smooth' });
    }
    if (id !== 'top') {
      const focusable = target.querySelector('h2') || target;
      focusable.setAttribute('tabindex', '-1');
      focusable.focus({ preventScroll: true });
    }
  });
}

/* ---------- New picks: cards rise in, strength bars fill ---------- */
function bindPicks() {
  document.getElementById('picks').addEventListener('picks:new', () => {
    const cards = document.querySelectorAll('#picks .pick');
    const bars = document.querySelectorAll('#picks .conf > i');
    if (reduceQuery.matches) {
      gsap.from(cards, { opacity: 0, duration: 0.3, stagger: 0.03 });
      return;
    }
    gsap.from(cards, { opacity: 0, y: 14, scale: 0.97, duration: 0.6, ease: EASE, stagger: 0.06 });
    gsap.from(bars, { scaleX: 0, duration: 0.9, ease: EASE, stagger: 0.06, delay: 0.15 });
  });
}

export function initMotion() {
  bindAnchors();
  bindPicks();

  gsap.matchMedia().add(
    { motion: '(prefers-reduced-motion: no-preference)', reduce: '(prefers-reduced-motion: reduce)' },
    (ctx) => {
      const { motion } = ctx.conditions;
      if (motion) {
        smoother = ScrollSmoother.create({
          wrapper: '#smooth-wrapper',
          content: '#smooth-content',
          smooth: 1.1,
          effects: true,
        });
        if (!particleMounted) particleMounted = mountParticleReveal();
        introTimeline(true);
        scrollScenes();
      } else {
        mountMark(false);
        introTimeline(false);
      }
      return () => {
        smoother = null;
      };
    },
  );

  trackSections();
  // Fonts change line breaks; re-measure once they land.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}
