import { moveInstrumentation } from '../../scripts/scripts.js';

export default function decorate(block) {
  const rows = [...block.children];
  
  // Create wrapper structure
  const wrapper = document.createElement('div');
  wrapper.className = 'callouts-content';
  
  // Process rows to identify content structure
  // Expected structure: eyebrow, header, body text, buttons
  rows.forEach((row, index) => {
    const cells = [...row.children];
    cells.forEach((cell) => {
      // Check for paragraphs, headings, or links
      const textContent = cell.textContent.trim();
      
      // First row - eyebrow text
      if (index === 0 && textContent) {
        const eyebrow = document.createElement('p');
        eyebrow.className = 'callouts-eyebrow';
        eyebrow.textContent = textContent;
        moveInstrumentation(cell, eyebrow);
        wrapper.appendChild(eyebrow);
      }
      // Second row - header
      else if (index === 1 && textContent) {
        const header = document.createElement('h3');
        header.className = 'callouts-header';
        header.textContent = textContent;
        moveInstrumentation(cell, header);
        wrapper.appendChild(header);
      }
      // Third row - body text
      else if (index === 2 && textContent) {
        const body = document.createElement('p');
        body.className = 'callouts-body';
        body.textContent = textContent;
        moveInstrumentation(cell, body);
        wrapper.appendChild(body);
      }
      // Fourth row and beyond - buttons/CTAs
      else if (index >= 3) {
        const links = cell.querySelectorAll('a');
        if (links.length > 0) {
          let buttonsContainer = wrapper.querySelector('.callouts-buttons');
          if (!buttonsContainer) {
            buttonsContainer = document.createElement('div');
            buttonsContainer.className = 'callouts-buttons';
            wrapper.appendChild(buttonsContainer);
          }
          
          links.forEach((link) => {
            const button = document.createElement('a');
            button.className = 'callouts-cta';
            button.href = link.href;
            button.textContent = link.textContent;
            button.setAttribute('target', link.target || '_self');
            moveInstrumentation(link, button);
            
            // Add arrow icon
            const arrow = document.createElement('span');
            arrow.className = 'callouts-cta-arrow';
            arrow.innerHTML = '&#8594;';
            button.appendChild(arrow);
            
            buttonsContainer.appendChild(button);
          });
        }
      }
    });
  });
  
  // Add decorative accent element
  const accent = document.createElement('div');
  accent.className = 'callouts-accent';
  
  block.textContent = '';
  block.appendChild(wrapper);
  block.appendChild(accent);
}
