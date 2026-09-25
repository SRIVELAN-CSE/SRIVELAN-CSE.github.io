(() => {
  'use strict';

  const navigation = document.querySelector('.navigation');
  const menuButton = document.querySelector('.menu-toggle');
  const menu = document.querySelector('#nav-links');
  const navLinks = [...document.querySelectorAll('.nav-links a')];
  const sections = [...document.querySelectorAll('main > section[id]')];
  const mobile = window.matchMedia('(max-width: 50rem)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;

  // Reserve the collapsed navigation's actual height, including resized text.
  const updateNavigationOffset = () => {
    const header = document.querySelector('.site-header');
    if (!header) return;
    const top = parseFloat(getComputedStyle(header).top) || 0;
    const gap = parseFloat(getComputedStyle(root).fontSize);
    root.style.setProperty('--nav-clearance', `${header.offsetHeight + top + gap}px`);
  };

  // Without JavaScript, navigation stays visible and project details remain native.
  if (navigation && menuButton && menu) {
    const setMenu = (open, restoreFocus = false) => {
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.querySelector('.menu-label').textContent = open ? 'Close' : 'Menu';
      menu.hidden = mobile.matches && !open;
      if (!open) updateNavigationOffset();
      if (restoreFocus) menuButton.focus();
    };
    const syncMenu = () => {
      menuButton.hidden = !mobile.matches;
      setMenu(false);
    };
    menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
    navigation.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') setMenu(false, true);
    });
    document.addEventListener('click', (event) => {
      if (!navigation.contains(event.target)) setMenu(false);
    });
    navigation.addEventListener('focusout', () => {
      requestAnimationFrame(() => {
        if (!navigation.contains(document.activeElement)) setMenu(false);
      });
    });
    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        setMenu(false);
        const target = document.getElementById(link.hash.slice(1));
        if (target) target.focus({ preventScroll: true });
        // Native anchors preserve scrolling, URL fragments, and browser history.
      });
    });
    mobile.addEventListener('change', syncMenu);
    syncMenu();
    navigation.classList.add('enhanced');
    root.classList.add('nav-enhanced');
    updateNavigationOffset();
    if ('ResizeObserver' in window) {
      new ResizeObserver(() => {
        if (menuButton.getAttribute('aria-expanded') !== 'true') updateNavigationOffset();
      }).observe(navigation);
    }
  }

  let scrollPending = false;
  const updateActiveSection = () => {
    const offset = Math.max(parseFloat(getComputedStyle(root).getPropertyValue('--nav-clearance')) || 100, Math.min(window.innerHeight * 0.3, 220));
    let active = sections[0];
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= offset) active = section;
    }
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) active = sections[sections.length - 1];
    navLinks.forEach((link) => {
      if (active && link.hash === `#${active.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    scrollPending = false;
  };
  const scheduleActiveUpdate = () => {
    if (!scrollPending) {
      scrollPending = true;
      requestAnimationFrame(updateActiveSection);
    }
  };
  window.addEventListener('scroll', scheduleActiveUpdate, { passive: true });
  window.addEventListener('resize', scheduleActiveUpdate);
  document.querySelectorAll('details').forEach((details) => details.addEventListener('toggle', scheduleActiveUpdate));
  updateActiveSection();

  // Content is never hidden while waiting for an observer or JavaScript to run.
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        if (!reducedMotion.matches && typeof entry.target.animate === 'function') {
          entry.target.animate(
            [{ transform: 'translateY(18px)' }, { transform: 'translateY(0)' }],
            { duration: 650, easing: 'cubic-bezier(.2,.7,.2,1)' }
          );
        }
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08 });
    document.querySelectorAll('[data-reveal]').forEach((element) => observer.observe(element));
    reducedMotion.addEventListener('change', () => {
      if (reducedMotion.matches) document.getAnimations().forEach((animation) => animation.cancel());
    });
  }
})();
