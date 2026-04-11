// ═══════════════════════════════════════════════════════════
// AgentArena — Helpers & Utilities
// ═══════════════════════════════════════════════════════════

const Helpers = {
  /**
   * Format a date string to a readable format
   */
  formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  },

  /**
   * Format milliseconds to readable time
   */
  formatMs(ms) {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  },

  /**
   * Get CSS class for score value
   */
  scoreClass(score) {
    if (score >= 71) return 'high';
    if (score >= 41) return 'mid';
    return 'low';
  },

  /**
   * Get color for score value
   */
  scoreColor(score) {
    if (score >= 71) return 'var(--success)';
    if (score >= 41) return 'var(--warning)';
    return 'var(--danger)';
  },

  /**
   * Badge tier display
   */
  tierBadge(tier) {
    const labels = {
      unverified: '○ Unverified',
      tested: '◐ Tested',
      verified: '● Verified',
      elite: '★ Elite'
    };
    return `<span class="badge badge-${tier}">${labels[tier] || tier}</span>`;
  },

  /**
   * Category badge
   */
  categoryBadge(category) {
    return `<span class="badge badge-category">${category}</span>`;
  },

  /**
   * Status badge
   */
  statusBadge(status) {
    return `<span class="badge badge-status badge-${status}">${status}</span>`;
  },

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * Truncate text
   */
  truncate(str, max = 100) {
    if (!str || str.length <= max) return str;
    return str.substring(0, max) + '…';
  },

  /**
   * Show toast notification
   */
  toast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(40px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  /**
   * Get current timestamp string for terminal
   */
  timestamp() {
    return new Date().toLocaleTimeString('en-US', { hour12: false });
  },

  /**
   * Render markdown to HTML using marked.js + highlight.js
   */
  renderMarkdown(text) {
    if (!text) return '';
    try {
      marked.setOptions({
        breaks: true,
        gfm: true,
        highlight: function(code, lang) {
          if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
            return hljs.highlight(code, { language: lang }).value;
          }
          return code;
        }
      });
      return marked.parse(text);
    } catch {
      // Fallback: basic formatting if marked fails
      return text
        .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
    }
  },

  /**
   * Stream text word-by-word into an element (ChatGPT typewriter effect)
   * Returns a promise that resolves when streaming is done
   */
  streamText(element, text, speed = 20) {
    return new Promise((resolve) => {
      const words = text.split(/(\s+)/); // Split keeping whitespace
      let index = 0;
      let accumulated = '';

      // Add blinking cursor
      const cursor = document.createElement('span');
      cursor.className = 'stream-cursor';
      cursor.textContent = '▊';

      function addNextChunk() {
        if (index >= words.length) {
          // Done streaming — render final markdown and remove cursor
          cursor.remove();
          element.innerHTML = Helpers.renderMarkdown(accumulated);
          // Highlight code blocks after render
          element.querySelectorAll('pre code').forEach(block => {
            if (typeof hljs !== 'undefined') hljs.highlightElement(block);
          });
          resolve();
          return;
        }

        // Add 3-5 words at a time for natural feel
        const chunkSize = Math.floor(Math.random() * 3) + 3;
        for (let i = 0; i < chunkSize && index < words.length; i++) {
          accumulated += words[index];
          index++;
        }

        // Show raw text while streaming (markdown rendered at end)
        element.textContent = accumulated;
        element.appendChild(cursor);

        // Auto-scroll parent
        const parent = element.closest('.lane-body');
        if (parent) parent.scrollTop = parent.scrollHeight;

        // Vary speed slightly for natural feel
        const delay = speed + Math.random() * 15;
        setTimeout(addNextChunk, delay);
      }

      addNextChunk();
    });
  }
};
