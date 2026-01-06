/**
 * Vimeo block (EDS + Universal Editor)
 * - Uses UE fields: videoUrl, title (optional)
 * - Falls back to hardcoded URL if author doesn't provide one
 */

const HARDCODED_VIMEO_URL = 'https://vimeo.com/76979871';
const USE_DNT = true;

function textFrom(el) {
  return (el?.textContent || '').trim();
}

function firstLinkHref(el) {
  const a = el?.querySelector?.('a[href]');
  return a?.href || null;
}

function getUEFields(block) {
  // UE/EDS emits each field into its own <div> (unless grouped).
  // We keep extraction tolerant.
  const fieldWrappers = Array.from(block.children);

  const urlField = fieldWrappers[0] || null;
  const titleField = fieldWrappers[1] || null;

  const authoredUrl = firstLinkHref(urlField) || textFrom(urlField);

  const authoredTitle = textFrom(titleField);

  return {
    videoUrl: authoredUrl || '',
    title: authoredTitle || ''
  };
}

function parseVimeo(inputUrl) {
  try {
    const url = new URL(inputUrl);
    const parts = url.pathname.split('/').filter(Boolean);

    let id = null;
    if (url.hostname.includes('player.vimeo.com')) {
      const idx = parts.indexOf('video');
      if (idx !== -1 && parts[idx + 1]) id = parts[idx + 1];
    } else {
      id = parts.find((p) => /^\d+$/.test(p)) || null;
    }

    const h = url.searchParams.get('h'); // for unlisted videos
    return { id, h };
  } catch (e) {
    return { id: null, h: null };
  }
}

function buildEmbedSrc({ id, h }) {
  const embed = new URL(`https://player.vimeo.com/video/${id}`);

  // Preserve unlisted privacy hash if present (h=...)
  if (h) embed.searchParams.set('h', h);

  // Common Vimeo parameters (supported via query string)
  embed.searchParams.set('title', '0');
  embed.searchParams.set('byline', '0');
  embed.searchParams.set('portrait', '0');

  // DNT reduces cookies set during the viewing session (doesn't block already-stored cookies)
  if (USE_DNT) embed.searchParams.set('dnt', '1');

  return embed.toString();
}

export default function decorate(block) {
  const { videoUrl, title } = getUEFields(block);
  const effectiveUrl = videoUrl || HARDCODED_VIMEO_URL;

  const { id, h } = parseVimeo(effectiveUrl);

  if (!id) {
    block.innerHTML = `
      <div class="vimeo__error">
        <p><strong>Vimeo block:</strong> Could not detect a Vimeo video id from:</p>
        <p><code>${effectiveUrl}</code></p>
      </div>`;
    return;
  }

  const src = buildEmbedSrc({ id, h });

  const wrapper = document.createElement('div');
  wrapper.className = 'vimeo__frame';

  const iframe = document.createElement('iframe');
  iframe.className = 'vimeo__iframe';
  iframe.src = src;
  iframe.loading = 'lazy';
  iframe.title = title || 'Vimeo video player';
  iframe.allow = 'autoplay; fullscreen; picture-in-picture';
  iframe.setAttribute('allowfullscreen', '');

  wrapper.appendChild(iframe);

  // Replace the authored field markup with the final player
  block.textContent = '';
  block.appendChild(wrapper);
}
