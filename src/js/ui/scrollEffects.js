// Efectos ligados al scroll: marquee, texto que se revela por letra y tarjetas apiladas.
const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initScrollEffects() {
  const marquee = document.querySelector('.marquee');
  const rows = [...document.querySelectorAll('.marquee__row')];
  const stack = document.querySelector('.stack');
  const cards = [...document.querySelectorAll('.card')];
  const texto = document.querySelector('[data-reveal]');
  const chars = texto ? splitChars(texto) : [];

  let marqueeTop = 0;
  const medir = () => {
    if (marquee) marqueeTop = marquee.getBoundingClientRect().top + scrollY;
    // Cada fila está triplicada: arrancamos en el set central para que nunca queden huecos
    rows.forEach((r) => (r.style.marginLeft = `-${r.scrollWidth / 3}px`));
  };

  const actualizar = () => {
    const vh = innerHeight;
    if (marquee && !reduce) {
      const offset = (scrollY - marqueeTop + vh) * 0.3;
      if (rows[0]) rows[0].style.transform = `translateX(${offset - 200}px)`;
      if (rows[1]) rows[1].style.transform = `translateX(${-(offset - 200)}px)`;
    }
    if (texto) {
      const r = texto.getBoundingClientRect();
      const p = clamp((0.8 * vh - r.top) / (r.height + 0.6 * vh));
      chars.forEach((c, i) => {
        c.style.opacity = 0.2 + 0.8 * clamp((p * chars.length - i));
      });
    }
    if (stack && !reduce) {
      const total = stack.offsetHeight - vh;
      const p = clamp(-stack.getBoundingClientRect().top / total);
      cards.forEach((card, i) => {
        const target = 1 - (cards.length - 1 - i) * 0.03;
        const t = clamp((p - i * 0.25) / (1 - i * 0.25));
        card.style.transform = `scale(${1 - (1 - target) * t})`;
      });
    }
  };

  let pend = false;
  addEventListener('scroll', () => {
    if (pend) return;
    pend = true;
    requestAnimationFrame(() => { pend = false; actualizar(); });
  }, { passive: true });
  addEventListener('resize', () => { medir(); actualizar(); });
  medir();
  actualizar();
}

// Cada letra = marcador invisible + capa animada (mantiene el salto de línea estable)
function splitChars(el) {
  const palabras = el.textContent.trim().split(/\s+/);
  el.textContent = '';
  el.setAttribute('aria-label', palabras.join(' '));
  const out = [];
  palabras.forEach((p, i) => {
    const w = document.createElement('span');
    w.className = 'word';
    w.setAttribute('aria-hidden', 'true');
    for (const ch of p) {
      const c = document.createElement('span');
      c.className = 'ch';
      c.innerHTML = `<span class="ch__ph"></span><span class="ch__fx"></span>`;
      c.firstChild.textContent = ch;
      const fx = c.lastChild;
      fx.textContent = ch;
      w.append(c);
      out.push(fx);
    }
    el.append(w, i < palabras.length - 1 ? ' ' : '');
  });
  return out;
}
