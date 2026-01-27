import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Loads jQuery and Slick carousel library
 * @returns {Promise} Promise that resolves when both scripts are loaded
 */
async function loadSlickDependencies() {
  const jqueryLoaded = new Promise((resolve) => {
    if (window.jQuery) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = `${window.hlx.codeBasePath}/scripts/jquery.min.js`;
    script.onload = resolve;
    document.head.appendChild(script);
  });

  await jqueryLoaded;

  return new Promise((resolve) => {
    if (window.jQuery.fn.slick) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = `${window.hlx.codeBasePath}/scripts/slick.min.js`;
    script.onload = resolve;
    document.head.appendChild(script);
  });
}

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
 * Initializes the Slick carousel
 * @param {Element} carouselContainer - The container element for the carousel
 */
function initSlickCarousel(carouselContainer) {
  const $carousel = window.jQuery(carouselContainer);

  $carousel.slick({
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    arrows: true,
    prevArrow: '<button type="button" class="carousel-prev" aria-label="Previous slide"><span class="carousel-arrow-icon">&lt;</span><span class="carousel-arrow-text">Previous slide</span></button>',
    nextArrow: '<button type="button" class="carousel-next" aria-label="Next slide"><span class="carousel-arrow-icon">&gt;</span><span class="carousel-arrow-text">Next slide</span></button>',
    responsive: [
      {
        breakpoint: 1200,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  });
}

/**
 * Decorates the carousel block
 * @param {Element} block - The block element
 */
export default async function decorate(block) {
  // Load dependencies
  await loadSlickDependencies();

  // Create carousel structure
  const carouselWrapper = document.createElement('div');
  carouselWrapper.className = 'carousel-wrapper';

  const carouselContainer = document.createElement('div');
  carouselContainer.className = 'carousel-container';

  // Process each row as a card
  const rows = [...block.children];
  rows.forEach((row) => {
    const card = createCard(row);
    carouselContainer.appendChild(card);
  });

  carouselWrapper.appendChild(carouselContainer);

  // Clear block and append new structure
  block.textContent = '';
  block.appendChild(carouselWrapper);

  // Initialize Slick carousel
  initSlickCarousel(carouselContainer);
}
