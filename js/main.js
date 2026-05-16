/* TRUSTUS Care — main.js */

/* ---- Services Dropdown (click toggle) ---- */
document.querySelectorAll('.has-dropdown').forEach(dropdown => {
  const trigger = dropdown.querySelector('button, a');
  if (!trigger) return;
  trigger.addEventListener('click', e => {
    e.preventDefault();
    const isOpen = dropdown.classList.contains('open');
    document.querySelectorAll('.has-dropdown').forEach(d => d.classList.remove('open'));
    if (!isOpen) dropdown.classList.add('open');
  });
});

document.addEventListener('click', e => {
  if (!e.target.closest('.has-dropdown')) {
    document.querySelectorAll('.has-dropdown').forEach(d => d.classList.remove('open'));
  }
});

/* ---- Mobile Nav ---- */
const hamburger   = document.getElementById('hamburger');
const mobileNav   = document.getElementById('mobileNav');
const mobileClose = document.getElementById('mobileClose');

hamburger  && hamburger.addEventListener('click', () => mobileNav.classList.add('open'));
mobileClose && mobileClose.addEventListener('click', () => mobileNav.classList.remove('open'));

/* Mobile services submenu */
const mobileServicesBtn = document.getElementById('mobileServicesBtn');
const mobileSubmenu     = document.getElementById('mobileSubmenu');
mobileServicesBtn && mobileServicesBtn.addEventListener('click', () => {
  mobileSubmenu && mobileSubmenu.classList.toggle('open');
});

/* ---- Hero / Page-Hero Slideshow ---- */
function initSlideshow(containerSelector, interval) {
  document.querySelectorAll(containerSelector).forEach(container => {
    const slides = container.querySelectorAll('.hero-slide, .page-hero-slide');
    if (slides.length < 2) { slides[0] && slides[0].classList.add('active'); return; }
    let current = 0;
    slides[current].classList.add('active');
    setInterval(() => {
      slides[current].classList.remove('active');
      current = (current + 1) % slides.length;
      slides[current].classList.add('active');
    }, interval);
  });
}

initSlideshow('.hero-slides', 5000);
initSlideshow('.page-hero-slides', 5000);

/* ---- Property Gallery + Lightbox ---- */
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
  lightbox && lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox && lightbox.classList.remove('open');
  document.body.style.overflow = '';
}

function showLightboxImage() {
  if (!lightboxImg) return;
  lightboxImg.src = lightboxImages[lightboxIndex];
  if (lightboxCtr) lightboxCtr.textContent = (lightboxIndex + 1) + ' / ' + lightboxImages.length;
}

lightboxClose && lightboxClose.addEventListener('click', closeLightbox);
lightbox      && lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });

lightboxPrev && lightboxPrev.addEventListener('click', () => {
  lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
  showLightboxImage();
});
lightboxNext && lightboxNext.addEventListener('click', () => {
  lightboxIndex = (lightboxIndex + 1) % lightboxImages.length;
  showLightboxImage();
});

document.addEventListener('keydown', e => {
  if (!lightbox || !lightbox.classList.contains('open')) return;
  if (e.key === 'Escape')     closeLightbox();
  if (e.key === 'ArrowLeft')  { lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length; showLightboxImage(); }
  if (e.key === 'ArrowRight') { lightboxIndex = (lightboxIndex + 1) % lightboxImages.length; showLightboxImage(); }
});

/* Property gallery blocks */
document.querySelectorAll('.property-gallery-block').forEach(block => {
  const imagesAttr = block.dataset.images;
  if (!imagesAttr) return;
  let images;
  try { images = JSON.parse(imagesAttr); } catch(e) { return; }

  const mainImg  = block.querySelector('.property-main-img');
  const thumbs   = block.querySelectorAll('.property-thumb');

  mainImg && mainImg.addEventListener('click', () => openLightbox(images, 0));
  thumbs.forEach((thumb, i) => {
    thumb.addEventListener('click', () => {
      openLightbox(images, i + 1 < images.length ? i + 1 : i);
    });
  });
});

/* ---- Stat Counter Animation ---- */
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
