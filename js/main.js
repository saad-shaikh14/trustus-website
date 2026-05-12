/* TRUSTUS — main.js */

/* ---- Mobile Nav ---- */
const hamburger  = document.getElementById('hamburger');
const mobileNav  = document.getElementById('mobileNav');
const mobileClose = document.getElementById('mobileClose');

if (hamburger && mobileNav) {
  hamburger.addEventListener('click', () => mobileNav.classList.add('open'));
  mobileClose && mobileClose.addEventListener('click', () => mobileNav.classList.remove('open'));
}

/* ---- FAQ Accordion ---- */
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  });
});

/* ---- Property Lightbox ---- */
let lightboxImages = [];
let lightboxIndex  = 0;

const lightbox      = document.getElementById('lightbox');
const lightboxImg   = document.getElementById('lightboxImg');
const lightboxClose = document.getElementById('lightboxClose');
const lightboxPrev  = document.getElementById('lightboxPrev');
const lightboxNext  = document.getElementById('lightboxNext');
const lightboxCtr   = document.getElementById('lightboxCounter');

function openLightbox(images, idx) {
  lightboxImages = images;
  lightboxIndex  = idx;
  showLightboxImage();
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox && lightbox.classList.remove('open');
  document.body.style.overflow = '';
}

function showLightboxImage() {
  if (!lightboxImg) return;
  lightboxImg.src = lightboxImages[lightboxIndex];
  lightboxCtr && (lightboxCtr.textContent = (lightboxIndex + 1) + ' / ' + lightboxImages.length);
}

lightboxClose && lightboxClose.addEventListener('click', closeLightbox);
lightboxPrev  && lightboxPrev.addEventListener('click', () => { lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length; showLightboxImage(); });
lightboxNext  && lightboxNext.addEventListener('click', () => { lightboxIndex = (lightboxIndex + 1) % lightboxImages.length; showLightboxImage(); });
lightbox && lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });

document.addEventListener('keydown', e => {
  if (!lightbox || !lightbox.classList.contains('open')) return;
  if (e.key === 'Escape')     closeLightbox();
  if (e.key === 'ArrowLeft')  { lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length; showLightboxImage(); }
  if (e.key === 'ArrowRight') { lightboxIndex = (lightboxIndex + 1) % lightboxImages.length; showLightboxImage(); }
});

/* ---- Single property feature gallery ---- */
document.querySelectorAll('.property-feature-gallery').forEach(gallery => {
  const images = (() => { try { return JSON.parse(gallery.dataset.images || '[]'); } catch(e) { return []; } })();
  if (!images.length) return;
  const main = gallery.querySelector('.property-feature-main');
  main && main.addEventListener('click', () => openLightbox(images, 0));
  gallery.querySelectorAll('.property-thumb-img').forEach((img, i) => {
    img.addEventListener('click', () => openLightbox(images, i + 1));
  });
});

document.querySelectorAll('.property-card').forEach(card => {
  card.addEventListener('click', () => {
    try {
      const images = JSON.parse(card.dataset.images || '[]');
      if (images.length) openLightbox(images, 0);
    } catch(e) {}
  });
});

/* ---- Stat Counter ---- */
function animateCounters() {
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count, 10);
    const duration = 1800;
    const step = target / (duration / 16);
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = Math.floor(current);
      if (current >= target) clearInterval(timer);
    }, 16);
  });
}

const statsSection = document.querySelector('.stats-bar');
if (statsSection) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { animateCounters(); observer.disconnect(); }
    });
  }, { threshold: 0.3 });
  observer.observe(statsSection);
}
