import React from 'react';

export default function ShotShapeIcon({ shapeId, active, color }) {
  const stroke = active ? '#fff' : color;

  const paths = {
    hook: 'M 18 36 L 18 14 Q 18 10 14 10 L 8 10',
    draw: 'M 22 34 Q 16 24 10 16 L 6 12',
    straight: 'M 16 36 L 16 6',
    fade: 'M 10 34 Q 16 24 22 16 L 26 12',
    slice: 'M 14 36 L 14 14 Q 14 10 18 10 L 24 10',
  };

  const arrowHeads = {
    hook:     { x: 8,  y: 10, dir: 'left' },
    draw:     { x: 6,  y: 12, dir: 'upLeft' },
    straight: { x: 16, y: 6,  dir: 'up' },
    fade:     { x: 26, y: 12, dir: 'upRight' },
    slice:    { x: 24, y: 10, dir: 'right' },
  };

  const path = paths[shapeId] || paths.straight;
  const head = arrowHeads[shapeId] || arrowHeads.straight;

  const getArrowPolygon = (h) => {
    const s = 4;
    switch (h.dir) {
      case 'up':
        return `${h.x},${h.y - s} ${h.x - s + 1},${h.y + 1} ${h.x + s - 1},${h.y + 1}`;
      case 'left':
        return `${h.x - s},${h.y} ${h.x + 1},${h.y - s + 1} ${h.x + 1},${h.y + s - 1}`;
      case 'right':
        return `${h.x + s},${h.y} ${h.x - 1},${h.y - s + 1} ${h.x - 1},${h.y + s - 1}`;
      case 'upLeft':
        return `${h.x - 3},${h.y - 3} ${h.x + 2},${h.y - 1} ${h.x - 1},${h.y + 2}`;
      case 'upRight':
        return `${h.x + 3},${h.y - 3} ${h.x - 2},${h.y - 1} ${h.x + 1},${h.y + 2}`;
      default:
        return `${h.x},${h.y - s} ${h.x - s + 1},${h.y + 1} ${h.x + s - 1},${h.y + 1}`;
    }
  };

  return (
    <svg width="32" height="44" viewBox="0 0 32 44" style={{ marginBottom: '2px' }}>
      <path
        d={path}
        stroke={stroke}
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon
        points={getArrowPolygon(head)}
        fill={stroke}
      />
    </svg>
  );
}
