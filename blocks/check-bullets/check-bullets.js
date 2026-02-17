import { moveInstrumentation } from '../../scripts/scripts.js';

const CHECKMARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
<path d="M10.0025 0C4.47829 0 0 4.47829 0 10.0025C0 15.5268 4.47829 20.0051 10.0025 20.0051C15.5268 20.0051 20 15.5268 20 10.0025C20 4.47829 15.5217 0 10.0025 0ZM8.43869 15.1561L4.70678 11.7644L6.06245 10.2716L8.22036 12.2315L13.2927 6.01168L14.8566 7.28611L8.43869 15.1561Z" fill="#007580"/>
</svg>`;

export default function decorate(block) {
  const ul = document.createElement('ul');
  ul.className = 'check-bullets-list';

  // Find all p tags in the block and convert to bullet items
  const paragraphs = block.querySelectorAll('p');

  paragraphs.forEach((p) => {
    // Skip empty paragraphs
    if (!p.textContent.trim()) return;

    const li = document.createElement('li');
    li.className = 'check-bullets-item';

    // Create icon container
    const iconSpan = document.createElement('span');
    iconSpan.className = 'check-bullets-icon';
    iconSpan.innerHTML = CHECKMARK_SVG;

    // Create text container
    const textSpan = document.createElement('span');
    textSpan.className = 'check-bullets-text';
    textSpan.innerHTML = p.innerHTML;

    // Move AEM instrumentation to list item
    moveInstrumentation(p, li);

    li.append(iconSpan, textSpan);
    ul.append(li);
  });

  block.replaceChildren(ul);
}
