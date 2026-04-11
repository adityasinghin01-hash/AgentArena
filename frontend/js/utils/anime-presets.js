// ═══════════════════════════════════════════════════════════
// AgentArena — Anime.js Presets
// Reusable animation timelines per @animejs-animation skill
// ═══════════════════════════════════════════════════════════

const AnimePresets = {
  /**
   * Stagger children entrance with translateY + opacity
   */
  entranceStagger(selector, delay = 0) {
    return anime({
      targets: selector,
      translateY: [30, 0],
      opacity: [0, 1],
      easing: 'spring(1, 80, 10, 0)',
      delay: anime.stagger(80, { start: delay }),
    });
  },

  /**
   * Single element fade in up
   */
  fadeInUp(selector, delay = 0) {
    return anime({
      targets: selector,
      translateY: [20, 0],
      opacity: [0, 1],
      easing: 'easeOutExpo',
      duration: 800,
      delay,
    });
  },

  /**
   * Scale pop entrance
   */
  popIn(selector, delay = 0) {
    return anime({
      targets: selector,
      scale: [0.8, 1],
      opacity: [0, 1],
      easing: 'spring(1, 60, 12, 0)',
      delay,
    });
  },

  /**
   * Animate a score gauge from 0 to target value
   */
  scoreReveal(element, targetValue) {
    const circumference = 2 * Math.PI * 45; // r=45
    const offset = circumference - (targetValue / 100) * circumference;

    const fill = element.querySelector('.gauge-fill');
    const label = element.querySelector('.gauge-label');

    if (fill) {
      fill.style.strokeDasharray = circumference;
      fill.style.strokeDashoffset = circumference;

      anime({
        targets: fill,
        strokeDashoffset: offset,
        easing: 'easeOutExpo',
        duration: 1200,
      });
    }

    if (label) {
      anime({
        targets: { value: 0 },
        value: targetValue,
        round: 1,
        easing: 'easeOutExpo',
        duration: 1200,
        update: (anim) => {
          label.textContent = Math.round(anim.animations[0].currentValue);
        },
      });
    }
  },

  /**
   * Winner burst — gold glow + subtle scale pulse
   */
  winnerBurst(selector) {
    return anime({
      targets: selector,
      scale: [1, 1.05, 1],
      boxShadow: [
        '0 0 0px rgba(245, 158, 11, 0)',
        '0 0 40px rgba(245, 158, 11, 0.4)',
        '0 0 20px rgba(245, 158, 11, 0.2)',
      ],
      easing: 'easeOutElastic(1, .6)',
      duration: 1000,
    });
  },

  /**
   * Typing reveal for terminal lines
   */
  typeReveal(element) {
    const text = element.textContent;
    element.textContent = '';
    element.style.opacity = 1;

    return anime({
      targets: { chars: 0 },
      chars: text.length,
      round: 1,
      easing: 'linear',
      duration: Math.min(text.length * 15, 600),
      update: (anim) => {
        const count = Math.round(anim.animations[0].currentValue);
        element.textContent = text.substring(0, count);
      },
    });
  },

  /**
   * Page transition — fade out old, fade in new
   */
  pageTransition(callback) {
    const app = document.getElementById('app');
    anime({
      targets: app,
      opacity: [1, 0],
      translateY: [0, -8],
      easing: 'easeInQuad',
      duration: 150,
      complete: () => {
        callback();
        anime({
          targets: app,
          opacity: [0, 1],
          translateY: [8, 0],
          easing: 'easeOutQuad',
          duration: 250,
        });
      },
    });
  },
};
