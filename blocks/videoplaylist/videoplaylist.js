
/**
 * Videoplaylist (EDS/Franklin block) — Slick Carousel version (fixed)
 *
 * Fixes:
 * - Calls slick('setPosition') after iframe injection and on visibility changes
 * - Slick init only when element has non-zero width (tabs/hidden panels safe)
 * - Prevents async stop/load race during slide change
 * - ✅ FIX: Load first slide reliably by triggering same lifecycle as arrow navigation
 * - ✅ FIX: Avoid "Cannot read properties of undefined (reading 'setPosition')" by using instance-safe setPosition
 *
 * Preserved features:
 * - 1 slide visible
 * - Navigation ONLY via arrows OR auto-advance on video end
 * - No swipe/drag/touch horizontal navigation
 * - YouTube + Vimeo timestamp persistence/resume
 * - Loop only when last video ends -> go to first & autoplay
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
 * allow controlling iframe loading strategy
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
    loading,
    allow:
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
    allowFullscreen: true,
    referrerPolicy: 'strict-origin-when-cross-origin',
  });

  if (fetchPriority) iframe.setAttribute('fetchpriority', fetchPriority);

  return iframe;
}

/**
 * Vimeo autoplay reliability uses `muted=1` (not `mute=1`)
 */
function withAutoplay(src) {
  const u = new URL(src, window.location.href);
  u.searchParams.set('autoplay', '1');
  u.searchParams.set('playsinline', '1');

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

/**
 * Wait until element has a measurable width.
 */
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
 * Visibility observer to refresh slick once it becomes visible.
 * ✅ PATCH: instance-safe setPosition (no $.fn.slick('setPosition') call)
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

  // --- State ---
  const resumeTime = new Map();
  const ytPlayers = new Map();
  const vimeoPlayers = new Map();

  let active = 0;
  let autoplayOnChange = false;
  let stopPromise = Promise.resolve();

  // ✅ PATCH: instance-ready guard
  function isSlickReady() {
    return !!(slider && slider.slick && typeof slider.slick.setPosition === 'function' && !slider.slick.unslicked);
  }

  // ✅ PATCH: use instance-safe setPosition (prevents "undefined setPosition" crash)
  function safeSetPosition() {
    if (isSlickReady()) slider.slick.setPosition();
  }

  // ✅ PATCH: force slick lifecycle like arrow navigation to load slide-0 reliably
  let didBootstrap = false;
  function bootstrapInitialAfterChange() {
    if (didBootstrap) return;
    didBootstrap = true;

    // if only 1 slide
    if (items.length < 2) return;

    slider.classList.add('vp-bootstrapping');

    requestAnimationFrame(() => {
      autoplayOnChange = false;
      // bounce 0 -> 1 -> 0 (jump=true => no animation)
      $(slider).slick('slickGoTo', 1, true);
      $(slider).slick('slickGoTo', 0, true);

      setTimeout(() => {
        safeSetPosition();
        slider.classList.remove('vp-bootstrapping');
      }, 0);
    });
  }

  function advanceIfPossible(fromIndex) {
    if (fromIndex !== active) return;

    if (active < items.length - 1) {
      autoplayOnChange = true;
      $(slider).slick('slickGoTo', active + 1);
      return;
    }
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

    // Optional stability: wait for ready (won't throw if blocked)
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
      return;
    }

    const iframe = media.querySelector('iframe');
    if (iframe) iframe.remove();
    media.setAttribute('data-loaded', 'false');
  }

  async function load(index, { autoPlay = false } = {}) {
    const slide = slides[index];
    if (!slide) return;
    const media = slide.querySelector('.vp-media');
    const baseSrc = media?.getAttribute('data-src');
    const provider = media?.getAttribute('data-provider');
    if (!media || !baseSrc) return;

    const loaded = media.getAttribute('data-loaded') === 'true';

    if (!loaded) {
      const src = autoPlay ? withAutoplay(baseSrc) : baseSrc;

      const isActive = index === active;
      const isFirst = index === 0;

      const iframe = buildIframe(src, items[index].title || `Video ${index + 1}`, {
        loading: isActive ? 'eager' : 'lazy',
        fetchPriority: isFirst ? 'high' : undefined,
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

  // --- Build slides ---
  const slides = items.map((item, i) => {
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

    const playThis = () => {
      if (active !== i) {
        autoplayOnChange = true;
        $(slider).slick('slickGoTo', i);
      } else {
        load(i, { autoPlay: true });
      }
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

  // ---- IMPORTANT: init slick only when layout width is available ----
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

    // ✅ now safe (instance check)
    safeSetPosition();
    setTimeout(() => safeSetPosition(), 100);
    setTimeout(() => safeSetPosition(), 300);

    // ✅ make first slide load via same lifecycle as arrow navigation
    // wait a frame so slick instance is definitely attached
    requestAnimationFrame(() => {
      if (isSlickReady()) bootstrapInitialAfterChange();
      else {
        // fallback: try again shortly
        setTimeout(() => {
          if (isSlickReady()) bootstrapInitialAfterChange();
        }, 50);
      }
    });
  });

  $(slider).on('beforeChange', (e, slick, currentSlide) => {
    stopPromise = stop(currentSlide);
  });

  $(slider).on('afterChange', (e, slick, currentSlide) => {
    active = currentSlide;
    Promise.resolve(stopPromise).finally(() => {
      load(currentSlide, { autoPlay: autoplayOnChange });
      autoplayOnChange = false;
      requestAnimationFrame(() => safeSetPosition());
    });
  });

  shell.addEventListener('click', (e) => {
    const btn = e.target?.closest?.('.vp-prev, .vp-next');
    if (btn) autoplayOnChange = true;
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
