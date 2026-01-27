import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Creates a carousel card element from row data
 * @param {Element} row - The row element containing card data
 * @returns {Element} The card element
 */
function createCard(row) {
  const card = document.createElement('div');
  card.className = 'carousel-card';

  const cols = [...row.children];

  // Build card structure based on available columns
  if (cols.length >= 1) {
    // First column: Title and Description
    const titleCol = cols[0];
    const cardHeader = document.createElement('div');
    cardHeader.className = 'carousel-card-header';

    const titleEl = titleCol.querySelector('h1, h2, h3, h4, h5, h6, p strong, strong');
    if (titleEl) {
      const cardTitle = document.createElement('h3');
      cardTitle.className = 'carousel-card-title';
      cardTitle.textContent = titleEl.textContent;
      cardHeader.appendChild(cardTitle);
    }

    const descEl = titleCol.querySelector('p:not(:has(strong))') || titleCol.querySelector('p');
    if (descEl && !descEl.querySelector('strong')) {
      const cardDesc = document.createElement('p');
      cardDesc.className = 'carousel-card-description';
      cardDesc.textContent = descEl.textContent;
      cardHeader.appendChild(cardDesc);
    } else {
      // Get all text content that isn't the title
      const paragraphs = titleCol.querySelectorAll('p');
      paragraphs.forEach((p) => {
        if (!p.querySelector('strong') && p !== titleEl?.parentElement) {
          const cardDesc = document.createElement('p');
          cardDesc.className = 'carousel-card-description';
          cardDesc.textContent = p.textContent;
          cardHeader.appendChild(cardDesc);
        }
      });
    }

    card.appendChild(cardHeader);
    moveInstrumentation(titleCol, cardHeader);
  }

  // Second column: Status
  if (cols.length >= 2) {
    const statusCol = cols[1];
    const statusSection = document.createElement('div');
    statusSection.className = 'carousel-card-field';

    const statusLabel = document.createElement('h4');
    statusLabel.className = 'carousel-card-label';
    statusLabel.textContent = 'STATUS';

    const statusValue = document.createElement('p');
    statusValue.className = 'carousel-card-value carousel-card-status';
    statusValue.textContent = statusCol.textContent.trim();

    // Add status indicator class
    const statusText = statusCol.textContent.toLowerCase();
    if (statusText.includes('recruiting') && !statusText.includes('not recruiting')) {
      statusValue.classList.add('status-recruiting');
    } else if (statusText.includes('not recruiting')) {
      statusValue.classList.add('status-not-recruiting');
    }

    statusSection.appendChild(statusLabel);
    statusSection.appendChild(statusValue);
    card.appendChild(statusSection);
    moveInstrumentation(statusCol, statusSection);
  }

  // Third column: Phase
  if (cols.length >= 3) {
    const phaseCol = cols[2];
    const phaseSection = document.createElement('div');
    phaseSection.className = 'carousel-card-field';

    const phaseLabel = document.createElement('h4');
    phaseLabel.className = 'carousel-card-label';
    phaseLabel.textContent = 'PHASE';

    const phaseValue = document.createElement('p');
    phaseValue.className = 'carousel-card-value';
    phaseValue.textContent = phaseCol.textContent.trim();

    phaseSection.appendChild(phaseLabel);
    phaseSection.appendChild(phaseValue);
    card.appendChild(phaseSection);
    moveInstrumentation(phaseCol, phaseSection);
  }

  // Fourth column: Medical Conditions
  if (cols.length >= 4) {
    const conditionsCol = cols[3];
    const conditionsSection = document.createElement('div');
    conditionsSection.className = 'carousel-card-field carousel-card-conditions';

    const conditionsLabel = document.createElement('h4');
    conditionsLabel.className = 'carousel-card-label';
    conditionsLabel.textContent = 'MEDICAL CONDITIONS';

    const conditionsValue = document.createElement('p');
    conditionsValue.className = 'carousel-card-value';
    conditionsValue.textContent = conditionsCol.textContent.trim();

    conditionsSection.appendChild(conditionsLabel);
    conditionsSection.appendChild(conditionsValue);
    card.appendChild(conditionsSection);
    moveInstrumentation(conditionsCol, conditionsSection);
  }

  // Fifth column: Link (optional)
  if (cols.length >= 5) {
    const linkCol = cols[4];
    const link = linkCol.querySelector('a');
    if (link) {
      const cardLink = document.createElement('a');
      cardLink.className = 'carousel-card-link';
      cardLink.href = link.href;
      cardLink.textContent = link.textContent || 'View Details';
      cardLink.title = link.title || link.textContent;
      card.appendChild(cardLink);
      moveInstrumentation(linkCol, cardLink);
    }
  }

  return card;
}

/**
 * Gets the number of slides to show based on viewport width
 * @returns {number} Number of slides to display
 */
function getSlidesToShow() {
  if (window.innerWidth <= 768) return 1;
  if (window.innerWidth <= 1200) return 2;
  return 3;
}

/**
 * Updates the carousel position and navigation state
 * @param {Object} carousel - Carousel state object
 */
function updateCarousel(carousel) {
  const { track, cards, currentIndex, prevBtn, nextBtn } = carousel;
  const slidesToShow = getSlidesToShow();
  const maxIndex = Math.max(0, cards.length - slidesToShow);

  // Clamp current index
  carousel.currentIndex = Math.max(0, Math.min(currentIndex, maxIndex));

  // Calculate transform
  const cardWidth = 100 / slidesToShow;
  const translateX = -carousel.currentIndex * cardWidth;
  track.style.transform = `translateX(${translateX}%)`;

  // Update button states
  prevBtn.disabled = carousel.currentIndex === 0;
  nextBtn.disabled = carousel.currentIndex >= maxIndex;

  prevBtn.classList.toggle('carousel-nav-disabled', carousel.currentIndex === 0);
  nextBtn.classList.toggle('carousel-nav-disabled', carousel.currentIndex >= maxIndex);
}

/**
 * Initializes the carousel functionality
 * @param {Element} block - The carousel block element
 * @param {Object} carousel - Carousel state object
 */
function initCarousel(block, carousel) {
  const { prevBtn, nextBtn } = carousel;

  // Previous button click
  prevBtn.addEventListener('click', () => {
    carousel.currentIndex -= 1;
    updateCarousel(carousel);
  });

  // Next button click
  nextBtn.addEventListener('click', () => {
    carousel.currentIndex += 1;
    updateCarousel(carousel);
  });

  // Handle window resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      updateCarousel(carousel);
    }, 100);
  });

  // Touch/swipe support
  let touchStartX = 0;
  let touchEndX = 0;

  carousel.track.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  carousel.track.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        // Swipe left - next
        carousel.currentIndex += 1;
      } else {
        // Swipe right - previous
        carousel.currentIndex -= 1;
      }
      updateCarousel(carousel);
    }
  }, { passive: true });

  // Initial update
  updateCarousel(carousel);
}

/**
 * Decorates the carousel block
 * @param {Element} block - The block element
 */
export default function decorate(block) {
  // Create carousel structure
  const carouselWrapper = document.createElement('div');
  carouselWrapper.className = 'carousel-wrapper';

  const carouselTrack = document.createElement('div');
  carouselTrack.className = 'carousel-track';

  // Process each row as a card
  const rows = [...block.children];
  const cards = [];

  rows.forEach((row) => {
    const card = createCard(row);
    cards.push(card);
    carouselTrack.appendChild(card);
  });

  // Create navigation buttons
  const prevBtn = document.createElement('button');
  prevBtn.className = 'carousel-nav carousel-prev';
  prevBtn.setAttribute('aria-label', 'Previous slide');
  prevBtn.innerHTML = '<span class="carousel-arrow-icon">&#10094;</span><span class="carousel-arrow-text">Previous slide</span>';

  const nextBtn = document.createElement('button');
  nextBtn.className = 'carousel-nav carousel-next';
  nextBtn.setAttribute('aria-label', 'Next slide');
  nextBtn.innerHTML = '<span class="carousel-arrow-icon">&#10095;</span><span class="carousel-arrow-text">Next slide</span>';

  carouselWrapper.appendChild(prevBtn);
  carouselWrapper.appendChild(carouselTrack);
  carouselWrapper.appendChild(nextBtn);

  // Clear block and append new structure
  block.textContent = '';
  block.appendChild(carouselWrapper);

  // Initialize carousel
  const carousel = {
    track: carouselTrack,
    cards,
    currentIndex: 0,
    prevBtn,
    nextBtn,
  };

  initCarousel(block, carousel);
}
