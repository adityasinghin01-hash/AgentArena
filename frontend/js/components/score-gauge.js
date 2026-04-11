// ═══════════════════════════════════════════════════════════
// AgentArena — Score Gauge Component (SVG)
// ═══════════════════════════════════════════════════════════

const ScoreGauge = {
  render(score, size = 80, label = '') {
    const r = (size / 2) - 8;
    const circumference = 2 * Math.PI * r;
    const cls = Helpers.scoreClass(score);

    return `
      <div class="score-gauge score-${cls}" style="width:${size}px;height:${size}px;">
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          <circle class="gauge-track" cx="${size/2}" cy="${size/2}" r="${r}"/>
          <circle class="gauge-fill" cx="${size/2}" cy="${size/2}" r="${r}"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${circumference}"
            data-target="${score}" data-circumference="${circumference}"/>
        </svg>
        <span class="gauge-label" style="font-size:${size > 60 ? 'var(--text-lg)' : 'var(--text-sm)'}">0</span>
        ${label ? `<span class="text-xs text-muted" style="position:absolute;bottom:-18px;white-space:nowrap">${label}</span>` : ''}
      </div>
    `;
  },

  /**
   * Animate all score gauges in a container
   */
  animateAll(container) {
    const gauges = container.querySelectorAll('.score-gauge');
    gauges.forEach((gauge, i) => {
      const fill = gauge.querySelector('.gauge-fill');
      const label = gauge.querySelector('.gauge-label');
      if (!fill) return;

      const target = parseFloat(fill.dataset.target) || 0;
      const circumference = parseFloat(fill.dataset.circumference);
      const offset = circumference - (target / 100) * circumference;

      setTimeout(() => {
        anime({
          targets: fill,
          strokeDashoffset: [circumference, offset],
          easing: 'easeOutExpo',
          duration: 1200,
        });

        anime({
          targets: { val: 0 },
          val: target,
          round: 1,
          easing: 'easeOutExpo',
          duration: 1200,
          update: (anim) => {
            label.textContent = Math.round(anim.animations[0].currentValue);
          },
        });
      }, i * 100);
    });
  }
};
