import { moveInstrumentation } from '../../scripts/scripts.js';

function createCard(row) {
  const card = document.createElement('div');
  card.className = 'carousel-card';

  // Get content from row divs
  const cols = [...row.children];

  // Extract data from columns
  const title = cols[0]?.textContent?.trim() || '';
  const description = cols[1]?.innerHTML || '';
  const status = cols[2]?.textContent?.trim() || '';
  const phase = cols[3]?.textContent?.trim() || '';
  const conditions = cols[4]?.textContent?.trim() || '';
  const linkEl = cols[5]?.querySelector('a');
  const link = linkEl?.href || '#';

  // Determine if recruiting
  const isRecruiting = status.toLowerCase().includes('recruiting')
    && !status.toLowerCase().includes('not recruiting');

  // Create progress dots
  const dotsHtml = `
    <div class="carousel-card-dots">
      <span class="dot filled"></span>
      <span class="dot filled"></span>
      <span class="dot filled"></span>
      <span class="dot ${isRecruiting ? 'filled' : ''}"></span>
    </div>
  `;

  card.innerHTML = `
    ${dotsHtml}
    <h3 class="carousel-card-title">${title}</h3>
    <div class="carousel-card-description">${description}</div>
    <div class="carousel-card-divider"></div>
    <div class="carousel-card-field">
      <span class="field-label">STATUS</span>
      <span class="field-value ${isRecruiting ? 'status-recruiting' : 'status-not-recruiting'}">${status}</span>
    </div>
    <div class="carousel-card-field">
      <span class="field-label">PHASE</span>
      <span class="field-value">${phase}</span>
    </div>
    <div class="carousel-card-field">
      <span class="field-label">MEDICAL CONDITIONS</span>
      <span class="field-value">${conditions}</span>
    </div>
    <a href="${link}" class="carousel-card-link" aria-label="View details for ${title}"></a>
  `;

  moveInstrumentation(row, card);
  return card;
}

export default function decorate(block) {
  const rows = [...block.children];
  if (rows.length === 0) return;

  // Create carousel structure
  const wrapper = document.createElement('div');
  wrapper.className = 'carousel-wrapper';

  const track = document.createElement('div');
  track.className = 'carousel-track';

  // Create cards from rows
  rows.forEach((row) => {
    const card = createCard(row);
    track.appendChild(card);
  });

  // Navigation arrows
  const prevBtn = document.createElement('button');
  prevBtn.className = 'carousel-nav carousel-prev';
  prevBtn.innerHTML = '<span class="carousel-arrow">&#8249;</span>';
  prevBtn.setAttribute('aria-label', 'Previous slide');

  const nextBtn = document.createElement('button');
  nextBtn.className = 'carousel-nav carousel-next';
  nextBtn.innerHTML = '<span class="carousel-arrow">&#8250;</span>';
  nextBtn.setAttribute('aria-label', 'Next slide');

  // Progress indicators
  const progress = document.createElement('div');
  progress.className = 'carousel-progress';

  wrapper.appendChild(prevBtn);
  wrapper.appendChild(track);
  wrapper.appendChild(nextBtn);

  block.textContent = '';
  block.appendChild(wrapper);
  block.appendChild(progress);

  // Carousel logic
  let currentIndex = 0;
  const cards = track.querySelectorAll('.carousel-card');
  const totalCards = cards.length;

  function getSlidesToShow() {
    if (window.innerWidth >= 1024) return 2;
    return 1;
  }

  function updateCarousel() {
    const slidesToShow = getSlidesToShow();
    const maxIndex = Math.max(0, totalCards - slidesToShow);
    currentIndex = Math.min(currentIndex, maxIndex);

    const gap = 24;
    const cardWidth = track.offsetWidth / slidesToShow - (gap * (slidesToShow - 1)) / slidesToShow;

    cards.forEach((card) => {
      card.style.minWidth = `${cardWidth}px`;
      card.style.maxWidth = `${cardWidth}px`;
    });

    const offset = currentIndex * (cardWidth + gap);
    track.style.transform = `translateX(-${offset}px)`;

    // Update progress bar
    const progressCount = maxIndex + 1;
    progress.innerHTML = '';
    for (let i = 0; i < progressCount; i += 1) {
      const bar = document.createElement('div');
      bar.className = `progress-bar ${i === currentIndex ? 'active' : ''}`;
      bar.addEventListener('click', () => {
        currentIndex = i;
        updateCarousel();
      });
      progress.appendChild(bar);
    }

    // Update button states
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex >= maxIndex;
  }

  prevBtn.addEventListener('click', () => {
    if (currentIndex > 0) {
      currentIndex -= 1;
      updateCarousel();
    }
  });

  nextBtn.addEventListener('click', () => {
    const slidesToShow = getSlidesToShow();
    const maxIndex = Math.max(0, totalCards - slidesToShow);
    if (currentIndex < maxIndex) {
      currentIndex += 1;
      updateCarousel();
    }
  });

  // Touch/swipe support
  let touchStartX = 0;
  let touchEndX = 0;

  track.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  track.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        nextBtn.click();
      } else {
        prevBtn.click();
      }
    }
  }, { passive: true });

  // Initialize and handle resize
  window.addEventListener('resize', () => {
    updateCarousel();
  });

  updateCarousel();
}
