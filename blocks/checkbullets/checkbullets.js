import { moveInstrumentation } from '../../scripts/scripts.js';

const checkmarkSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
  <path d="M10.0025 0C4.47829 0 0 4.47829 0 10.0025C0 15.5268 4.47829 20.0051 10.0025 20.0051C15.5268 20.0051 20 15.5268 20 10.0025C20 4.47829 15.5217 0 10.0025 0ZM8.43869 15.1561L4.70678 11.7644L6.06245 10.2716L8.22036 12.2315L13.2927 6.01168L14.8566 7.28611L8.43869 15.1561Z" fill="#007580"/>
</svg>`;

export default function decorate(block) {
  // Get all paragraph elements from the block content
  const paragraphs = block.querySelectorAll('p');
  
  // Create a container for the bullet list
  const bulletList = document.createElement('ul');
  bulletList.className = 'checkbullets-list';
  
  paragraphs.forEach((p) => {
    const textContent = p.textContent.trim();
    if (textContent) {
      // Create list item
      const listItem = document.createElement('li');
      listItem.className = 'checkbullets-item';
      
      // Create icon wrapper
      const iconWrapper = document.createElement('span');
      iconWrapper.className = 'checkbullets-icon';
      iconWrapper.innerHTML = checkmarkSVG;
      
      // Create text wrapper
      const textWrapper = document.createElement('span');
      textWrapper.className = 'checkbullets-text';
      textWrapper.textContent = textContent;
      
      // Preserve AEM instrumentation
      moveInstrumentation(p, listItem);
      
      // Assemble the list item
      listItem.appendChild(iconWrapper);
      listItem.appendChild(textWrapper);
      bulletList.appendChild(listItem);
    }
  });
  
  // Clear the block and append the transformed content
  block.textContent = '';
  block.appendChild(bulletList);
}
