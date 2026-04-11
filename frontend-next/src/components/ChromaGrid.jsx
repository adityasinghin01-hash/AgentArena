'use client';

import { useRef, useState, useCallback } from 'react';
import './ChromaGrid.css';

/**
 * ChromaGrid — Interactive card grid with mouse-tracking chromatic glow.
 *
 * Props:
 *  - items: Array of { id, icon, title, subtitle, borderColor, gradient }
 *  - selectedId: Currently selected item ID
 *  - onSelect: Callback(id)
 *  - columns: Number of grid columns (default: 2)
 *  - radius: Glow radius in px (default: 300)
 */
const ChromaGrid = ({ items = [], selectedId, onSelect, columns = 2, radius = 300 }) => {
  return (
    <div
      className="chroma-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '1.5rem',
      }}
    >
      {items.map((item) => (
        <ChromaCard
          key={item.id}
          item={item}
          isSelected={selectedId === item.id}
          onSelect={onSelect}
          radius={radius}
        />
      ))}
    </div>
  );
};

const ChromaCard = ({ item, isSelected, onSelect, radius }) => {
  const cardRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = useCallback(
    (e) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    },
    []
  );

  const handleMouseEnter = useCallback(() => setIsHovering(true), []);
  const handleMouseLeave = useCallback(() => setIsHovering(false), []);

  const glowOpacity = isHovering ? 1 : 0;
  const selectedScale = isSelected ? 1 : 0;

  return (
    <button
      ref={cardRef}
      type="button"
      onClick={() => onSelect(item.id)}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="chroma-card"
      style={{
        '--card-border': item.borderColor,
        '--card-gradient': item.gradient,
        '--glow-x': `${mousePos.x}px`,
        '--glow-y': `${mousePos.y}px`,
        '--glow-radius': `${radius}px`,
        '--glow-opacity': glowOpacity,
        '--selected-scale': selectedScale,
      }}
      aria-pressed={isSelected}
    >
      {/* Mouse-tracking glow layer */}
      <div className="chroma-card-glow" />

      {/* Selected ring pulse */}
      <div className="chroma-card-ring" />

      {/* Content */}
      <div className="chroma-card-content">
        <div className="chroma-card-icon">
          <span className="material-symbols-outlined">{item.icon}</span>
        </div>
        <h3 className="chroma-card-title">{item.title}</h3>
        <p className="chroma-card-subtitle">{item.subtitle}</p>

        {/* Selection indicator */}
        <div className="chroma-card-check" style={{ opacity: isSelected ? 1 : 0 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>check_circle</span>
        </div>
      </div>
    </button>
  );
};

export default ChromaGrid;
