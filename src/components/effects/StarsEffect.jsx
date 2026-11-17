import React from 'react';

const CARD_STARS = [
  { top: '15%', left: '20%', size: 2, delay: '0s', dur: '3s' },
  { top: '25%', left: '75%', size: 2.5, delay: '1s', dur: '4s' },
  { top: '45%', left: '40%', size: 1.5, delay: '0.5s', dur: '2.5s' },
  { top: '65%', left: '85%', size: 2, delay: '1.8s', dur: '3.5s' },
  { top: '80%', left: '30%', size: 1.5, delay: '2.2s', dur: '3s' },
  { top: '35%', left: '60%', size: 2.2, delay: '1.2s', dur: '4.5s' },
];

const FULLSCREEN_STARS = [
  { top: '8%', left: '12%', size: 2.5, delay: '0s', dur: '3.5s' },
  { top: '14%', left: '35%', size: 2, delay: '1.2s', dur: '4s' },
  { top: '10%', left: '62%', size: 3, delay: '0.5s', dur: '3s' },
  { top: '18%', left: '88%', size: 2, delay: '2s', dur: '4.5s' },
  { top: '28%', left: '22%', size: 1.8, delay: '0.8s', dur: '3.2s' },
  { top: '35%', left: '78%', size: 2.2, delay: '1.5s', dur: '3.8s' },
  { top: '48%', left: '15%', size: 2.5, delay: '2.3s', dur: '4.2s' },
  { top: '55%', left: '92%', size: 1.8, delay: '0.3s', dur: '3.6s' },
  { top: '65%', left: '45%', size: 2.8, delay: '1.7s', dur: '4.8s' },
  { top: '75%', left: '28%', size: 2, delay: '2.5s', dur: '3.4s' },
  { top: '82%', left: '70%', size: 2.2, delay: '1s', dur: '4s' },
  { top: '90%', left: '85%', size: 2.5, delay: '0.6s', dur: '3.5s' },
];

export default function StarsEffect({ fullScreen = false }) {
  const stars = fullScreen ? FULLSCREEN_STARS : CARD_STARS;

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden z-0 ${fullScreen ? '' : 'rounded-2xl'}`} aria-hidden="true">
      {stars.map((star, idx) => (
        <span
          key={idx}
          className="absolute rounded-full bg-white animate-pulse"
          style={{
            top: star.top,
            left: star.left,
            width: `${star.size}px`,
            height: `${star.size}px`,
            boxShadow: '0 0 5px rgba(255, 255, 255, 0.9)',
            animationDelay: star.delay,
            animationDuration: star.dur,
            transform: 'translate3d(0, 0, 0)'
          }}
        />
      ))}
    </div>
  );
}
