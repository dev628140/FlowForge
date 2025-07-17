'use client';

import React, { useState, useEffect } from 'react';

const colors = ['#29ABE2', '#FFD700', '#8A2BE2', '#32CD32', '#FF69B4'];

const ConfettiPiece = ({ style }: { style: React.CSSProperties }) => (
  <div className="confetti-piece" style={style} />
);

const Confetti = ({ active }: { active: boolean }) => {
  const [pieces, setPieces] = useState<React.ReactElement[]>([]);

  useEffect(() => {
    if (active) {
      const newPieces = Array.from({ length: 150 }).map((_, index) => {
        const style: React.CSSProperties = {
          left: `${Math.random() * 100}%`,
          '--color': colors[Math.floor(Math.random() * colors.length)] as string,
          animationDelay: `${Math.random() * 0.5}s`,
          animationDuration: `${2 + Math.random() * 3}s`,
        };
        return <ConfettiPiece key={index} style={style} />;
      });
      setPieces(newPieces);

      const timer = setTimeout(() => {
        setPieces([]);
      }, 5000); // Clear confetti after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [active]);

  if (!pieces.length) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
    >
      {pieces}
    </div>
  );
};

export default Confetti;
