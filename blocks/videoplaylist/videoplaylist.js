
/**
 * Videoplaylist (EDS/Franklin block) — Slick Carousel version (optimized)
 *
 * Performance Optimizations:
 * - ✅ DO NOT inject any iframe on initial load (fastest startup)
 * - ✅ Create iframe only on user intent (Play click / arrow nav / end auto-advance)
 * - ✅ Preconnect to video origins on intent (hover/focus/click/arrow)
 * - ✅ Teardown iframe + player on slide blur (only one active player in DOM)
 *
 * Preserved features:
 * - 1 slide visible
 * - Arrow navigation only (no swipe/drag)
 * - Auto-advance on video end (and loop last -> first)
 * - YouTube + Vimeo resume timestamps
 */

import { loadScript } from '../../scripts/aem.js';

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('aria-')) node.setAttribute(k, v);
    else if (k in node) node[k] = v;
    else node.setAttribute(k, v);
  });
  (Array.isArray(children) ? children : [children]).filter(Boolean).forEach((c) => {
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  });
  return node;
}

function text(node) {
  return (node?.textContent || '').trim();
}

function pickUrl(cell) {
  if (!cell) return '';
  const a = cell.querySelector('a[href]');
  if (a?.href) return a.href.trim();
  return text(cell);
}

function normalizeVideoUrl(raw) {
  if (!raw) return null;
  const url = raw.trim();

  // Already embed URLs
  if (url.includes('youtube.com/embed/')) return url;
  if (url.includes('player.vimeo.com/video/')) return url;

  // youtu.be/<id>
  const ytShort = url.match(/https?:\/\/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (ytShort) return `https://www.youtube.com/embed/${ytShort[1]}`;

  // youtube.com/watch?v=<id>
  if (url.includes('youtube.com/watch')) {
    const id = new URL(url).searchParams.get('v');
    if (id) return `https://www.youtube.com/embed/${id}`;
  }

   // vimeo.com/<id>
  const vimeo = url.match(/https?:\/\/player\.vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;

  return url;
}

function providerFromSrc(src) {
  try {
    const u = new URL(src, window.location.href);
    if (u.hostname.includes('youtube.com')) return 'youtube';
    if (u.hostname.includes('vimeo.com')) return 'vimeo';
  } catch (e) {
    // ignore
  }
  return 'other';
}

function youtubeIdFromEmbed(embedUrl) {
  const m = embedUrl.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

function buildYouTubePoster(embedUrl) {
  const id = youtubeIdFromEmbed(embedUrl);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

function loadScriptOnce(src, id) {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id);
    if (existing) return resolve();
    const s = document.createElement('script');
    s.id = id;
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(s);
  });
}

// --- YouTube API loader ---
let ytApiPromise;
function ensureYouTubeApi() {
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve, reject) => {
    if (window.YT?.Player) return resolve(window.YT);

    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === 'function') prev();
      resolve(window.YT);
    };

    loadScriptOnce('https://www.youtube.com/iframe_api', 'yt-iframe-api').catch(reject);
  });
  return ytApiPromise;
}

// --- Vimeo API loader ---
let vimeoApiPromise;
function ensureVimeoApi() {
  if (vimeoApiPromise) return vimeoApiPromise;
  vimeoApiPromise = new Promise((resolve, reject) => {
    if (window.Vimeo?.Player) return resolve(window.Vimeo);
    loadScriptOnce('https://player.vimeo.com/api/player.js', 'vimeo-player-api')
      .then(() => resolve(window.Vimeo))
      .catch(reject);
  });
  return vimeoApiPromise;
}

/**
 * Build iframe (kept lazy by default for perf).
 * We DO NOT create iframes on initial load anyway.
 */
function buildIframe(src, title = 'Video', { loading = 'lazy', fetchPriority } = {}) {
  const u = new URL(src, window.location.href);

  if (u.hostname.includes('youtube.com')) {
    u.searchParams.set('rel', '0');
    u.searchParams.set('modestbranding', '1');
    u.searchParams.set('playsinline', '1');
    u.searchParams.set('enablejsapi', '1');
    u.searchParams.set('origin', window.location.origin);
  }

  const iframe = el('iframe', {
    class: 'vp-iframe',
    src: u.toString(),
    title,
    loading, // keep lazy
    allow:
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
    allowFullscreen: true,
    referrerPolicy: 'strict-origin-when-cross-origin',
  });

  if (fetchPriority) iframe.setAttribute('fetchpriority', fetchPriority);

  return iframe;
}

/**
 * Autoplay params:
 * - YouTube requires mute=1 for autoplay in many cases
 * - Vimeo uses muted=1
 */
function withAutoplay(src) {
  const u = new URL(src, window.location.href);
  u.searchParams.set('autoplay', '1');
  u.searchParams.set('playsinline', '1');
  u.searchParams.set('loop', '0');

  if (u.hostname.includes('youtube.com')) u.searchParams.set('mute', '1');
  if (u.hostname.includes('vimeo.com')) u.searchParams.set('muted', '1');

  return u.toString();
}

async function ensureSlickAndJquery() {
  if (!window.jQuery) {
    await loadScript('/scripts/jquery.min.js');
  }
  await loadScript('/scripts/slick.min.js');

  if (!window.jQuery?.fn?.slick) {
    throw new Error('Slick failed to initialize: jQuery.fn.slick is missing.');
  }
}

function waitForNonZeroWidth(element, timeoutMs = 4000) {
  const start = performance.now();
  return new Promise((resolve) => {
    function tick() {
      const w = element?.getBoundingClientRect?.().width || 0;
      if (w > 2) return resolve(true);
      if (performance.now() - start > timeoutMs) return resolve(false);
      requestAnimationFrame(tick);
    }
    tick();
  });
}

/**
 * Visibility observer: instance-safe setPosition only.
 */
function observeVisibilityRefresh($, sliderEl) {
  const refresh = () => {
    if (sliderEl && sliderEl.slick && typeof sliderEl.slick.setPosition === 'function' && !sliderEl.slick.unslicked) {
      sliderEl.slick.setPosition();
    }
  };

  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => refresh());
    ro.observe(sliderEl);
  }

  if (window.IntersectionObserver) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) refresh();
      });
    }, { threshold: 0.01 });
    io.observe(sliderEl);
  }

  window.addEventListener('resize', refresh, { passive: true });
  window.addEventListener('load', refresh, { passive: true });
}

export default async function decorate(block) {
  await ensureSlickAndJquery();
  const $ = window.jQuery;

  const rows = [...block.querySelectorAll(':scope > div')];
  const items = rows
    .map((row) => {
      const cols = [...row.children];
      const rawUrl = pickUrl(cols[0]);
      const title = text(cols[1]);
      const src = normalizeVideoUrl(rawUrl);
      if (!src) return null;
      return { src, title: title || '', provider: providerFromSrc(src) };
    })
    .filter(Boolean);

  if (!items.length) return;

  block.textContent = '';
  block.classList.add('vp');

  const shell = el('div', { class: 'vp-shell' });
  const slider = el('div', { class: 'vp-slider', 'aria-label': 'Video playlist carousel' });
  shell.append(slider);
  block.append(shell);

  // =====================
  // Performance knobs
  // =====================
  const LOAD_IFRAME_ON_INIT = false; // fastest startup (no iframe on load)
  const TEARDOWN_ON_BLUR = true;     // keep only one iframe alive
  const PRECONNECT_ON_INTENT = true; // preconnect on hover/focus/click/arrow

  // --- State ---
  const resumeTime = new Map();   // index -> seconds
  const ytPlayers = new Map();    // index -> YT.Player
  const vimeoPlayers = new Map(); // index -> Vimeo.Player

  let active = 0;
  let autoplayOnChange = false;
  let stopPromise = Promise.resolve();

  function isSlickReady() {
    return !!(slider && slider.slick && typeof slider.slick.setPosition === 'function' && !slider.slick.unslicked);
  }

  function safeSetPosition() {
    if (isSlickReady()) slider.slick.setPosition();
  }

  // -----------------------
  // Resource hints (intent)
  // -----------------------
  function addPreconnect(href) {
    if (!href) return;
    const key = `vp-preconnect:${href}`;
    if (document.head.querySelector(`link[data-vp="${key}"]`)) return;

    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = href;
    link.crossOrigin = 'anonymous';
    link.dataset.vp = key;
    document.head.appendChild(link);
  }

  function preconnectForProvider(provider) {
    if (!PRECONNECT_ON_INTENT) return;
    if (provider === 'vimeo') {
      addPreconnect('https://player.vimeo.com');
    }
    if (provider === 'youtube') {
      addPreconnect('https://www.youtube.com');
      addPreconnect('https://i.ytimg.com');
    }
  }

  function advanceIfPossible(fromIndex) {
    if (fromIndex !== active) return;

    if (active < items.length - 1) {
      autoplayOnChange = true;
      $(slider).slick('slickGoTo', active + 1);
      return;
    }

    // last ended -> restart to first and autoplay
    resumeTime.set(0, 0);
    autoplayOnChange = true;
    $(slider).slick('slickGoTo', 0);
  }

  async function ensureYouTubePlayer(index, iframe) {
    await ensureYouTubeApi();
    if (ytPlayers.has(index)) return ytPlayers.get(index);

    const player = new window.YT.Player(iframe, {
      events: {
        onStateChange: (event) => {
          if (event.data === window.YT.PlayerState.PAUSED) {
            try {
              const t = player.getCurrentTime();
              if (typeof t === 'number') resumeTime.set(index, t);
            } catch (e) { /* ignore */ }
          }
          if (event.data === window.YT.PlayerState.ENDED) {
            resumeTime.set(index, 0);
            advanceIfPossible(index);
          }
        },
      },
    });

    ytPlayers.set(index, player);
    return player;
  }

  async function ensureVimeoPlayer(index, iframe) {
    await ensureVimeoApi();
    if (vimeoPlayers.has(index)) return vimeoPlayers.get(index);

    const player = new window.Vimeo.Player(iframe);
    try { await player.ready(); } catch (e) { /* ignore */ }

    player.on('pause', async () => {
      try {
        const t = await player.getCurrentTime();
        if (typeof t === 'number') resumeTime.set(index, t);
      } catch (e) { /* ignore */ }
    });

    player.on('ended', () => {
      resumeTime.set(index, 0);
      advanceIfPossible(index);
    });

    vimeoPlayers.set(index, player);
    return player;
  }

  async function teardownSlide(index) {
    const slide = slides[index];
    if (!slide) return;
    const media = slide.querySelector('.vp-media');
    if (!media) return;

    // remove iframe to stop all network/CPU
    const iframe = media.querySelector('iframe');
    if (iframe) iframe.remove();

    media.setAttribute('data-loaded', 'false');
    slide.classList.remove('is-playing');
  }

  async function stop(index) {
    const slide = slides[index];
    if (!slide) return;
    const media = slide.querySelector('.vp-media');
    if (!media) return;

    const provider = media.getAttribute('data-provider');
    slide.classList.remove('is-playing');

    if (provider === 'youtube') {
      const p = ytPlayers.get(index);
      if (p) {
        try {
          const t = p.getCurrentTime?.();
          if (typeof t === 'number' && !Number.isNaN(t)) resumeTime.set(index, t);
          p.pauseVideo?.();
        } catch (e) { /* ignore */ }
      }

      if (TEARDOWN_ON_BLUR) {
        // attempt to destroy instance to free resources
        try { p?.destroy?.(); } catch (e) { /* ignore */ }
        ytPlayers.delete(index);
        await teardownSlide(index);
      }
      return;
    }

    if (provider === 'vimeo') {
      const p = vimeoPlayers.get(index);
      if (p) {
        try {
          const t = await p.getCurrentTime();
          if (typeof t === 'number' && !Number.isNaN(t)) resumeTime.set(index, t);
          await p.pause();
        } catch (e) { /* ignore */ }
      }

      if (TEARDOWN_ON_BLUR) {
        try { await p?.unload?.(); } catch (e) { /* ignore */ }
        try { await p?.destroy?.(); } catch (e) { /* ignore */ }
        vimeoPlayers.delete(index);
        await teardownSlide(index);
      }
      return;
    }

    // other providers: teardown iframe
    if (TEARDOWN_ON_BLUR) {
      await teardownSlide(index);
    }
  }

  async function load(index, { autoPlay = false } = {}) {
    const slide = slides[index];
    if (!slide) return;

    const media = slide.querySelector('.vp-media');
    const baseSrc = media?.getAttribute('data-src');
    const provider = media?.getAttribute('data-provider');
    if (!media || !baseSrc) return;

    // Preconnect on load intent (arrow/end/play)
    preconnectForProvider(provider);

    const loaded = media.getAttribute('data-loaded') === 'true';

    if (!loaded) {
      const src = autoPlay ? withAutoplay(baseSrc) : baseSrc;

      // Keep iframe lazy; we only create it when needed anyway.
      const iframe = buildIframe(src, items[index].title || `Video ${index + 1}`, {
        loading: 'lazy',
      });

      media.append(iframe);
      media.setAttribute('data-loaded', 'true');

      requestAnimationFrame(() => safeSetPosition());
      setTimeout(() => safeSetPosition(), 50);
      setTimeout(() => safeSetPosition(), 200);
    }

    const iframe = media.querySelector('iframe');
    if (!iframe) return;

    const t = resumeTime.get(index) || 0;

    if (provider === 'youtube') {
      const player = await ensureYouTubePlayer(index, iframe);

      if (t > 0) {
        try { player.seekTo(t, true); } catch (e) { /* ignore */ }
      }

      if (autoPlay) {
        try {
          player.playVideo?.();
          slide.classList.add('is-playing');
        } catch (e) {
          slide.classList.remove('is-playing');
        }
      }
      return;
    }

    if (provider === 'vimeo') {
      const player = await ensureVimeoPlayer(index, iframe);

      if (t > 0) {
        try { await player.setCurrentTime(t); } catch (e) { /* ignore */ }
      }

      if (autoPlay) {
        try {
          await player.play();
          slide.classList.add('is-playing');
        } catch (e) {
          slide.classList.remove('is-playing');
        }
      }
      return;
    }

    if (autoPlay) slide.classList.add('is-playing');
  }

  // --- Build slides (facade only; no iframe injected here) ---
  const slides = items.map((item, i) => {
    // YouTube poster only; Vimeo poster intentionally omitted (avoid extra oEmbed calls).
    const poster = item.src.includes('youtube.com/embed/') ? buildYouTubePoster(item.src) : null;

    const media = el('div', {
      class: `vp-media${poster ? ' has-poster' : ''}`,
      'data-src': item.src,
      'data-loaded': 'false',
      'data-provider': item.provider,
      ...(poster ? { style: `--vp-poster:url("${poster}")` } : {}),
    });

    const play = el(
      'button',
      {
        class: 'vp-play',
        type: 'button',
        'aria-label': item.title ? `Play: ${item.title}` : 'Play video',
      },
      el('span', { class: 'vp-play-icon' }),
    );

    const caption = item.title ? el('div', { class: 'vp-caption' }, item.title) : null;

    const slide = el(
      'div',
      {
        class: 'vp-slide',
        'data-index': String(i),
        role: 'group',
        'aria-roledescription': 'slide',
        'aria-label': `${i + 1} of ${items.length}`,
      },
      el('div', { class: 'vp-card' }, [media, play, caption]),
    );

    // intent preconnect on hover/focus
    play.addEventListener('mouseenter', () => preconnectForProvider(item.provider));
    play.addEventListener('focus', () => preconnectForProvider(item.provider));
    media.addEventListener('mouseenter', () => preconnectForProvider(item.provider));
    media.addEventListener('focusin', () => preconnectForProvider(item.provider));

    const playThis = async () => {
      // Preconnect immediately on click
      preconnectForProvider(item.provider);

      if (active !== i) {
        autoplayOnChange = true; // maintain behavior: navigate + autoplay
        $(slider).slick('slickGoTo', i);
        return;
      }

      // if already active, load iframe & autoplay
      await load(i, { autoPlay: true });
    };

    play.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      playThis();
    });

    media.addEventListener('click', playThis);

    slider.append(slide);
    return slide;
  });

  // ---- init slick only when layout width is available ----
  const visibleNow = await waitForNonZeroWidth(slider, 4000);

  $(slider).on('init', () => {
    const list = slider.querySelector('.slick-list');
    if (list) {
      list.addEventListener(
        'wheel',
        (e) => {
          if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) e.preventDefault();
        },
        { passive: false },
      );
    }

    observeVisibilityRefresh($, slider);

    safeSetPosition();
    setTimeout(() => safeSetPosition(), 100);
    setTimeout(() => safeSetPosition(), 300);

    // ✅ Perf mode: do NOT inject iframes on init
    if (LOAD_IFRAME_ON_INIT) {
      active = 0;
      load(0, { autoPlay: false });
    }
  });

  // Serialize stop->load to avoid race when pause is async
  $(slider).on('beforeChange', (e, slick, currentSlide, nextSlide) => {
    // preconnect next on arrow navigation
    const nextProvider = items?.[nextSlide]?.provider;
    if (nextProvider) preconnectForProvider(nextProvider);

    stopPromise = stop(currentSlide);
  });

  $(slider).on('afterChange', (e, slick, currentSlide) => {
    active = currentSlide;

    Promise.resolve(stopPromise).finally(() => {
      // Only load iframe on slide change if autoplay was requested (arrow/end)
      // This preserves your old behavior while keeping init light.
      if (autoplayOnChange) {
        load(currentSlide, { autoPlay: true });
      }
      autoplayOnChange = false;
      requestAnimationFrame(() => safeSetPosition());
    });
  });

  // Mark arrow clicks should autoplay on navigation + preconnect target
  shell.addEventListener('click', (e) => {
    const prev = e.target?.closest?.('.vp-prev');
    const next = e.target?.closest?.('.vp-next');

    if (prev) {
      autoplayOnChange = true;
      const target = Math.max(0, active - 1);
      preconnectForProvider(items[target]?.provider);
    } else if (next) {
      autoplayOnChange = true;
      const target = Math.min(items.length - 1, active + 1);
      preconnectForProvider(items[target]?.provider);
    }
  });

  $(slider).slick({
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: true,
    dots: false,
    infinite: false,
    speed: 280,
    swipe: false,
    draggable: false,
    touchMove: false,
    accessibility: true,
    adaptiveHeight: false,
    prevArrow:
      '<button class="vp-nav vp-prev" type="button" aria-label="Previous video"><span class="vp-nav-icon">‹</span></button>',
    nextArrow:
      '<button class="vp-nav vp-next" type="button" aria-label="Next video"><span class="vp-nav-icon">›</span></button>',
  });

  if (!visibleNow) {
    setTimeout(() => safeSetPosition(), 500);
    setTimeout(() => safeSetPosition(), 1200);
  }
}
