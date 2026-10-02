// Canvas UI's components import "../rect-cache", but the registry does not
// publish it. This keeps an element's client rect fresh without calling
// getBoundingClientRect() on every pointer move.
export interface RectCache {
  readonly current: DOMRect;
  destroy: () => void;
}

export function createRectCache(el: Element): RectCache {
  let rect = el.getBoundingClientRect();
  let queued = false;

  const update = () => {
    queued = false;
    rect = el.getBoundingClientRect();
  };
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };

  const resize = new ResizeObserver(schedule);
  resize.observe(el);
  window.addEventListener('scroll', schedule, { passive: true, capture: true });
  window.addEventListener('resize', schedule, { passive: true });

  return {
    get current() {
      return rect;
    },
    destroy() {
      resize.disconnect();
      window.removeEventListener('scroll', schedule, { capture: true });
      window.removeEventListener('resize', schedule);
    },
  };
}
