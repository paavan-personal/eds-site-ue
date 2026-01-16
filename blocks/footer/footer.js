import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

function selectRelevantButton(footer) {
  const isHCP = sessionStorage.getItem("isHCP") === "true";

  // Select the buttons by their anchor title (most reliable)
  const hcpLink = footer.querySelector('a.revmed[title="Healthcare Site"]');
  const patientLink = footer.querySelector('a.revmed[title="Patient Site"]');

  if (isHCP) {
    // Remove Healthcare Site button
    hcpLink?.closest("p.button-container")?.remove();
  } else {
    // Remove Patient Site button
    patientLink?.closest("p.button-container")?.remove();
  }

  hcpLink?.addEventListener("click", () => {
    sessionStorage.setItem("isHCP", "true"); // store as string
  });

  // On click: Patient -> isHCP = false
  patientLink?.addEventListener("click", () => {
    sessionStorage.setItem("isHCP", "false"); // store as string
  });

}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // load footer as fragment
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);

  // decorate footer DOM
  block.textContent = '';
  const footer = document.createElement('div');
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);
  
  selectRelevantButton(footer);

  const bgSection = footer.querySelector('.section[data-bg-image]');
  const bgImage = bgSection?.dataset.bgImage;
  block.style.backgroundImage = `url("${bgImage}")`;

  block.append(footer);
}


