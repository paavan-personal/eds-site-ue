/**
 * videoplaylist.js (EDS / Franklin block)
 * Reads the "container" composite multi-field from the DOM and returns an array:
 * [{ videoUrl: '...', placeholder1: '...' }, ...]
 */

function splitByHr(containerEl) {
  // Composite multi-field items with multiple semantic elements are separated by <hr>
  // (per Adobe docs). [1](https://www.aem.live/developer/component-model-definitions)
  const groups = [];
  let current = [];

  [...containerEl.childNodes].forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'HR') {
      if (current.length) groups.push(current);
      current = [];
    } else if (
      // ignore empty text nodes
      !(node.nodeType === Node.TEXT_NODE && !node.textContent.trim())
    ) {
      current.push(node);
    }
  });

  if (current.length) groups.push(current);
  return groups;
}

function extractItem(nodes) {
  // Wrap nodes in a fragment so we can query them
  const frag = document.createElement('div');
  nodes.forEach((n) => frag.appendChild(n.cloneNode(true)));

  // videoUrl can be inferred/rendered as a link <a> by the UE/EDS pipeline. [1](https://www.aem.live/developer/component-model-definitions)
  const a = frag.querySelector('a');
  const videoUrl = a ? a.href : frag.textContent.trim();

  // placeholder1 is a reference; if it’s an image, it’s typically rendered as <picture><img> [1](https://www.aem.live/developer/component-model-definitions)
  const img = frag.querySelector('picture img, img');
  const placeholder1 = img ? img.currentSrc || img.src : '';

  return { videoUrl, placeholder1 };
}

export default async function decorate(block) {
  // Your block model has only ONE top-level field: "container".
  // In EDS/UE, each model field becomes a "row", and the value is in the first cell. [1](https://www.aem.live/developer/component-model-definitions)
  const firstRow = block.firstElementChild;
  const cell = firstRow ? firstRow.firstElementChild : null;

  if (!cell) {
    // nothing authored
    return;
  }

  // If only one item exists, UE may render without <hr> separation; handle both. [1](https://www.aem.live/developer/component-model-definitions)
  const groups = cell.querySelector('hr')
    ? splitByHr(cell)
    : [[...cell.childNodes].filter(n => !(n.nodeType === Node.TEXT_NODE && !n.textContent.trim()))];

  const items = groups.map(extractItem)
    .filter((it) => it.videoUrl); // keep only valid entries

  // ✅ Now you have the authored values:
  // eslint-disable-next-line no-console
  console.log('videoplaylist items:', items);

  /**
   * From here, you can:
   * - build DOM markup for a carousel
   * - call your existing video block logic for each item
   * - etc.
   */
}
