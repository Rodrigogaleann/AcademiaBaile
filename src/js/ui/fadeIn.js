// FadeIn: aparece al entrar en pantalla. Atributos: data-fade, data-x, data-y, data-delay, data-duration
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const EASE = 'cubic-bezier(0.25, 0.1, 0.25, 1)';

const io = new IntersectionObserver((entries) => {
  for (const { isIntersecting, target: el } of entries) {
    if (!isIntersecting) continue;
    io.unobserve(el);
    const { x = 0, y = 30, delay = 0, duration = 0.7 } = Object.fromEntries(
      Object.entries(el.dataset).map(([k, v]) => [k, parseFloat(v)])
    );
    const anim = el.animate(
      [{ opacity: 0, transform: `translate(${x}px, ${y}px)` }, { opacity: 1, transform: 'none' }],
      { duration: duration * 1000, delay: delay * 1000, easing: EASE, fill: 'both' }
    );
    anim.onfinish = () => { el.style.opacity = 1; anim.cancel(); };
  }
}, { rootMargin: '50px' });

export function initFadeIn(root = document) {
  root.querySelectorAll('[data-fade]:not([data-fx])').forEach((el) => {
    el.dataset.fx = '1';
    if (reduce) el.style.opacity = 1; else io.observe(el);
  });
}
