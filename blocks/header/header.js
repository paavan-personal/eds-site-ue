import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 900px)');

function closeOnEscape(e) {
  if (e.code === 'Escape') {
    const nav = document.getElementById('nav');
    const navSections = nav.querySelector('.nav-sections');
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections);
      navSectionExpanded.focus();
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections);
      nav.querySelector('button').focus();
    }
  }
}

function closeOnFocusLost(e) {
  const nav = e.currentTarget;
  if (!nav.contains(e.relatedTarget)) {
    const navSections = nav.querySelector('.nav-sections');
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections, false);
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections, false);
    }
  }
}

function openOnKeydown(e) {
  const focused = document.activeElement;
  const isNavDrop = focused.className === 'nav-drop';
  if (isNavDrop && (e.code === 'Enter' || e.code === 'Space')) {
    const dropExpanded = focused.getAttribute('aria-expanded') === 'true';
    // eslint-disable-next-line no-use-before-define
    toggleAllNavSections(focused.closest('.nav-sections'));
    focused.setAttribute('aria-expanded', dropExpanded ? 'false' : 'true');
  }
}

function focusNavSection() {
  document.activeElement.addEventListener('keydown', openOnKeydown);
}

/**
 * Toggles all nav sections
 * @param {Element} sections The container element
 * @param {Boolean} expanded Whether the element should be expanded or collapsed
 */
function toggleAllNavSections(sections, expanded = false) {
  sections.querySelectorAll('.nav-sections .default-content-wrapper > ul > li').forEach((section) => {
    section.setAttribute('aria-expanded', expanded);
  });
}

/**
 * Handles mouseleave event for nav items on desktop
 * Delayed close to allow moving into dropdown
 * @param {Element} navSection The nav section mouse left from
 */
function handleNavLeave(navSection) {
  if (isDesktop.matches) {
    // Use a timeout to allow mouse to move into dropdown
    const closeTimeout = setTimeout(() => {
      navSection.setAttribute('aria-expanded', 'false');
    }, 1000);
    
    // Store timeout ID on the element
    navSection.dataset.closeTimeout = closeTimeout;
  }
}

/**
 * Cancels the close timeout when mouse enters nav section or dropdown
 * @param {Element} navSection The nav section being hovered
 */
function cancelNavClose(navSection) {
  if (navSection.dataset.closeTimeout) {
    clearTimeout(navSection.dataset.closeTimeout);
    delete navSection.dataset.closeTimeout;
  }
}

/**
 * Creates a mobile dialog menu matching the live site structure
 * @param {Element} navSections The nav sections element
 * @returns {Element} The dialog element
 */
function createMobileDialog(navSections) {
  const dialog = document.createElement('div');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-label', 'Navigation Menu');
  dialog.setAttribute('data-state', 'closed');
  dialog.setAttribute('data-slot', 'dialog-content');
  dialog.className = 'mobile-nav-dialog';
  dialog.setAttribute('tabindex', '-1');
  
  const dialogInner = document.createElement('div');
  dialogInner.className = 'mobile-nav-content';
  
  // Clone nav items
  const navItems = navSections.querySelectorAll(':scope .default-content-wrapper > ul > li');
  navItems.forEach((item, index) => {
    const link = item.querySelector('a');
    if (link) {
      const wrapper = document.createElement('a');
      wrapper.className = 'mobile-nav-item-wrapper';
      wrapper.href = link.href;
      
      const button = document.createElement('button');
      button.setAttribute('data-slot', 'button');
      button.className = 'mobile-nav-button';
      
      const textDiv = document.createElement('div');
      textDiv.className = 'mobile-nav-text';
      textDiv.textContent = link.textContent;
      
      const iconDiv = document.createElement('div');
      iconDiv.className = 'mobile-nav-icon';
      iconDiv.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12,3 L21,8.5 L21,15.5 L12,21 L3,15.5 L3,8.5 Z"></path></svg>';
      
      button.appendChild(textDiv);
      button.appendChild(iconDiv);
      wrapper.appendChild(button);
      dialogInner.appendChild(wrapper);
      
      // Add separator except after last item
      if (index < navItems.length - 1) {
        const separator = document.createElement('div');
        separator.className = 'mobile-nav-separator';
        dialogInner.appendChild(separator);
      }
    }
  });
  
  dialog.appendChild(dialogInner);
  return dialog;
}

/**
 * Toggles the entire nav
 * @param {Element} nav The container element
 * @param {Element} navSections The nav sections within the container element
 * @param {*} forceExpanded Optional param to force nav expand behavior when not null
 */
function toggleMenu(nav, navSections, forceExpanded = null) {
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  
  // Mobile dialog behavior
  if (!isDesktop.matches) {
    let dialog = document.querySelector('.mobile-nav-dialog');
    
    if (!expanded) {
      // Opening menu - create dialog
      if (!dialog) {
        dialog = createMobileDialog(navSections);
        document.body.appendChild(dialog);
      }
      
      // Trigger animation
      requestAnimationFrame(() => {
        dialog.setAttribute('data-state', 'open');
      });
      
      document.body.style.overflowY = 'hidden';
      
      // Close on click outside or escape
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
          toggleMenu(nav, navSections, true);
        }
      });
    } else {
      // Closing menu
      if (dialog) {
        dialog.setAttribute('data-state', 'closed');
        setTimeout(() => {
          dialog.remove();
        }, 200);
      }
      document.body.style.overflowY = '';
    }
  }
  
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  toggleAllNavSections(navSections, expanded || isDesktop.matches ? 'false' : 'true');
  button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
  // enable nav dropdown keyboard accessibility
  const navDrops = navSections.querySelectorAll('.nav-drop');
  if (isDesktop.matches) {
    navDrops.forEach((drop) => {
      if (!drop.hasAttribute('tabindex')) {
        drop.setAttribute('tabindex', 0);
        drop.addEventListener('focus', focusNavSection);
      }
    });
  } else {
    navDrops.forEach((drop) => {
      drop.removeAttribute('tabindex');
      drop.removeEventListener('focus', focusNavSection);
    });
  }

  // enable menu collapse on escape keypress
  if (!expanded || isDesktop.matches) {
    // collapse menu on escape press
    window.addEventListener('keydown', closeOnEscape);
    // collapse menu on focus lost
    nav.addEventListener('focusout', closeOnFocusLost);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
    nav.removeEventListener('focusout', closeOnFocusLost);
  }
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // load nav as fragment
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);

  // decorate nav DOM
  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  const classes = ['brand', 'sections', 'tools'];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  const navBrand = nav.querySelector('.nav-brand');
  const brandLink = navBrand.querySelector('.button');
  if (brandLink) {
    brandLink.className = '';
    brandLink.closest('.button-container').className = '';
  }

  const navSections = nav.querySelector('.nav-sections');
  if (navSections) {
    const navItems = navSections.querySelectorAll(':scope .default-content-wrapper > ul > li');
    const firstNavItemWithDropdown = Array.from(navItems).find(item => item.querySelector('ul'));
    const hasAnyDropdowns = Array.from(navItems).some(item => item.querySelector('ul'));
    
    let navCloseTimeout = null;
    
    // Show first item's dropdown when hovering anywhere on nav (only if dropdowns exist)
    nav.addEventListener('mouseenter', () => {
      if (navCloseTimeout) {
        clearTimeout(navCloseTimeout);
        navCloseTimeout = null;
      }
      
      if (isDesktop.matches && hasAnyDropdowns && firstNavItemWithDropdown) {
        firstNavItemWithDropdown.setAttribute('aria-expanded', 'true');
      }
    });
    
    nav.addEventListener('mouseleave', () => {
      if (isDesktop.matches) {
        navCloseTimeout = setTimeout(() => {
          toggleAllNavSections(navSections, false);
          navCloseTimeout = null;
        }, 1000);
      }
    });
    
    navItems.forEach((navSection, index) => {
      // if (navSection.querySelector('ul')) navSection.classList.add('nav-drop');
      
      // Remove title attributes to prevent tooltips on hover
      const links = navSection.querySelectorAll('a');
      links.forEach(link => link.removeAttribute('title'));
      
      // Add separator after each nav item except the last one (for mobile)
      if (index < navItems.length - 1) {
        const separator = document.createElement('div');
        separator.className = 'link-separator';
        navSection.after(separator);
      }
      
      // Add hover listeners for desktop - switch dropdown when hovering specific nav items
      navSection.addEventListener('mouseenter', () => {
        if (isDesktop.matches) {
          if (navCloseTimeout) {
            clearTimeout(navCloseTimeout);
            navCloseTimeout = null;
          }
          
          const hasSublinks = navSection.querySelector('ul');
          
          // Close all expanded sections
          navSections.querySelectorAll(':scope .default-content-wrapper > ul > li[aria-expanded="true"]').forEach((openSection) => {
            openSection.setAttribute('aria-expanded', 'false');
          });
          
          // Only show dropdown if this item has sub-links
          if (hasSublinks) {
            navSection.setAttribute('aria-expanded', 'true');
          }
        }
      });
      
      navSection.addEventListener('click', () => {
        if (isDesktop.matches) {
          const expanded = navSection.getAttribute('aria-expanded') === 'true';
          toggleAllNavSections(navSections);
          navSection.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        }
      });
    });
  }

  // hamburger for mobile
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav, navSections));
  nav.prepend(hamburger);
  nav.setAttribute('aria-expanded', 'false');
  // prevent mobile nav behavior on window resize
  toggleMenu(nav, navSections, isDesktop.matches);
  isDesktop.addEventListener('change', () => toggleMenu(nav, navSections, isDesktop.matches));

  // Extract nav-tools from nav to place it outside
  const navTools = nav.querySelector('.nav-tools');
  
  // Decorate nav-tools with custom button structure
  if (navTools) {
    // Get the existing picture/img element
    const picture = navTools.querySelector('picture');
    const img = navTools.querySelector('img');
    const iconSrc = img ? img.src : '';
    
    // Get button text from link or paragraph
    const link = navTools.querySelector('a');
    const buttonText = link ? link.textContent.trim() : navTools.textContent.trim();
    const buttonHref = link ? link.href : '#';
    
    // Clear existing content
    navTools.textContent = '';
    
    // Create button structure
    const buttonDiv = document.createElement('a');
    buttonDiv.href = buttonHref;
    buttonDiv.setAttribute('data-slot', 'button');
    buttonDiv.className = 'nav-tools-button';
    
    // Create icon element
    if (iconSrc) {
      const icon = document.createElement('img');
      icon.src = iconSrc;
      icon.alt = '';
      icon.className = 'nav-tools-icon';
      buttonDiv.appendChild(icon);
    }
    
    // Create text span
    const textSpan = document.createElement('span');
    textSpan.textContent = buttonText;
    buttonDiv.appendChild(textSpan);
    
    navTools.appendChild(buttonDiv);
  }

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  if (navTools) {
    navWrapper.append(navTools);
  }
  block.append(navWrapper);
}
