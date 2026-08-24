(function initAnimationsModule(global) {
  const CONFIG = Object.freeze({
    threshold: 0.08,
    rootMargin: '0px 0px -8% 0px',
    maxDelayItems: 6,
    delayStepMs: 55,
  });

  let observer = null;
  let reducedMotionMedia = null;

  function showImmediately(elements) {
    elements.forEach((element) => element.classList.add('visible'));
  }

  function handleIntersections(entries) {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      entry.target.classList.add('visible');
      observer?.unobserve(entry.target);
    });
  }

  function createObserver() {
    if (!('IntersectionObserver' in global)) return null;

    return new IntersectionObserver(handleIntersections, {
      threshold: CONFIG.threshold,
      rootMargin: CONFIG.rootMargin,
    });
  }

  function getElements(root = document) {
    return [...root.querySelectorAll('.reveal:not(.visible)')];
  }

  function applyTransitionDelay(elements) {
    elements.forEach((element, index) => {
      element.style.transitionDelay = `${Math.min(index % CONFIG.maxDelayItems, CONFIG.maxDelayItems - 1) * CONFIG.delayStepMs}ms`;
    });
  }

  function observeRevealElements(root = document) {
    const elements = getElements(root);
    if (!elements.length) return;

    reducedMotionMedia ??= global.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotionMedia.matches) {
      showImmediately(elements);
      return;
    }

    observer ??= createObserver();
    if (!observer) {
      showImmediately(elements);
      return;
    }

    applyTransitionDelay(elements);
    elements.forEach((element) => observer.observe(element));
  }

  global.PROLIOSK = global.PROLIOSK || {};
  global.PROLIOSK.observeRevealElements = observeRevealElements;
})(window);
