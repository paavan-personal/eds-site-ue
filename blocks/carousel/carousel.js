import { moveInstrumentation } from '../../scripts/scripts.js';

function createCard(row) {
  const card = document.createElement('div');
  card.className = 'carousel-card';

  // Move AEM instrumentation for Universal Editor support
  moveInstrumentation(row, card);

  const cols = [...row.children];

  // Column 0: Title
  const title = cols[0]?.textContent?.trim() || '';

  // Column 1: Description (richtext)
  const descriptionHtml = cols[1]?.innerHTML || '';

  // Column 2: Status
  const status = cols[2]?.textContent?.trim() || '';

  // Column 3: Phase
  const phase = cols[3]?.textContent?.trim() || '';

  // Column 4: Medical Conditions
  const conditions = cols[4]?.textContent?.trim() || '';

  // Column 5: Link
  const linkEl = cols[5]?.querySelector('a');
  const linkHref = linkEl?.href || '#';

  card.innerHTML = `
    <div class="card-inner">
      <div class="card-progress">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
      <a href="${linkHref}" class="card-title">${title}</a>
      <div class="card-description">${descriptionHtml}</div>
      <div class="card-divider"></div>
      <div class="card-field">
        <span class="field-label">STATUS</span>
        <span class="field-value">${status}</span>
      </div>
      <div class="card-field">
        <span class="field-label">PHASE</span>
        <span class="field-value">${phase}</span>
      </div>
      <div class="card-field">
        <span class="field-label">MEDICAL CONDITIONS</span>
        <span class="field-value">${conditions}</span>
      </div>
      <a href="${linkHref}" class="card-link">
        View trial details
        <span class="arrow">→</span>
      </a>
    </div>
  `;

  return card;
}

export default function decorate(block) {
  const rows = [...block.children];
  if (rows.length === 0) return;

  // Build cards
  const cards = rows.map((row) => createCard(row));

  // Clear block and build structure
  block.textContent = '';

  // Create track
  const track = document.createElement('div');
  track.className = 'carousel-track';
  cards.forEach((card) => track.appendChild(card));

  // Create viewport
  const viewport = document.createElement('div');
  viewport.className = 'carousel-viewport';
  viewport.appendChild(track);

  // Create nav buttons
  const prevBtn = document.createElement('button');
  prevBtn.className = 'carousel-btn carousel-prev';
  prevBtn.setAttribute('aria-label', 'Previous slide');
  prevBtn.innerHTML = '&#10094;';

  const nextBtn = document.createElement('button');
  nextBtn.className = 'carousel-btn carousel-next';
  nextBtn.setAttribute('aria-label', 'Next slide');
  nextBtn.innerHTML = '&#10095;';

  // Navigation container
  const nav = document.createElement('div');
  nav.className = 'carousel-nav';
  nav.appendChild(prevBtn);
  nav.appendChild(nextBtn);

  // Append to block
  block.appendChild(viewport);
  block.appendChild(nav);

  // State
  let currentIndex = 0;
  const totalCards = cards.length;
  const cardWidth = 50; // percentage of viewport (each card is 50% of the 80% viewport)
  const maxIndex = totalCards - 1; // can navigate to last index

  // Update position - different logic for first/last vs middle positions
  function updatePosition() {
    let offset;

    if (currentIndex === 0) {
      // First position: show first 2 cards fully, no peek
      offset = 0;
    } else if (currentIndex === maxIndex) {
      // Last position: show last 2 cards fully, no peek
      offset = (totalCards - 2) * cardWidth;
    } else {
      // Middle positions (1 to maxIndex-1): 
      // Half of prev card | 1 full card centered | half of next card
      // Center the current card: offset = (currentIndex * cardWidth) - 25%
      offset = (currentIndex * cardWidth) - 25;
    }

    track.style.transform = `translateX(-${offset}%)`;
  }

  // Handlers
  function goNext() {
    if (currentIndex < maxIndex) {
      currentIndex += 1;
      updatePosition();
      updateButtons();
    }
  }

  function goPrev() {
    if (currentIndex > 0) {
      currentIndex -= 1;
      updatePosition();
      updateButtons();
    }
  }

  // Event listeners
  nextBtn.addEventListener('click', goNext);
  prevBtn.addEventListener('click', goPrev);

  // Update button visibility
  function updateButtons() {
    prevBtn.style.opacity = currentIndex === 0 ? '0.5' : '1';
    nextBtn.style.opacity = currentIndex >= maxIndex ? '0.5' : '1';
  }

  // Initialize
  updatePosition();
  updateButtons();
}
