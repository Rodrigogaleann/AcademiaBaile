// Magnet: el elemento sigue al mouse cuando el cursor está a menos de `padding` px de su borde.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fino = matchMedia('(hover: hover) and (pointer: fine)').matches;

export function magnet(el, {
  padding = 100, strength = 3,
  activeTransition = 'transform 0.3s ease-out',
  inactiveTransition = 'transform 0.6s ease-in-out'
} = {}) {
  if (!el || reduce || !fino) return;
  el.style.willChange = 'transform';
  let activo = false;
  window.addEventListener('mousemove', (e) => {
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const cerca = Math.abs(dx) < r.width / 2 + padding && Math.abs(dy) < r.height / 2 + padding;
    if (cerca) {
      activo = true;
      el.style.transition = activeTransition;
      el.style.transform = `translate3d(${dx / strength}px, ${dy / strength}px, 0)`;
    } else if (activo) {
      activo = false;
      el.style.transition = inactiveTransition;
      el.style.transform = 'translate3d(0, 0, 0)';
    }
  }, { passive: true });
}
