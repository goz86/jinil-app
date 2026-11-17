import React from 'react';

/**
 * High-performance GPU-accelerated Mist / Cloud Effect
 * Uses pure CSS radial-gradients instead of heavy blur filters (blur-3xl)
 * to deliver buttery 60-120 FPS without GPU compositor bottlenecks.
 */
export default function MistEffect({ isNight = false, fullScreen = false }) {
  const gradientCenter = isNight
    ? 'rgba(180, 210, 255, 0.14)'
    : 'rgba(255, 255, 255, 0.26)';
  const gradientMid = isNight
    ? 'rgba(160, 195, 245, 0.06)'
    : 'rgba(255, 255, 255, 0.10)';

  const mistBg = `radial-gradient(ellipse at center, ${gradientCenter} 0%, ${gradientMid} 45%, transparent 70%)`;

  if (fullScreen) {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        {/* Floating Mist Cloud 1 */}
        <div
          className="absolute -top-24 -left-32 w-[650px] h-[380px] rounded-full animate-pulse pointer-events-none"
          style={{
            background: mistBg,
            animationDuration: '10s',
            transform: 'translate3d(0, 0, 0)',
            willChange: 'transform, opacity',
          }}
        />
        {/* Floating Mist Cloud 2 */}
        <div
          className="absolute top-1/3 -right-32 w-[720px] h-[420px] rounded-full animate-pulse pointer-events-none"
          style={{
            background: mistBg,
            animationDuration: '14s',
            animationDelay: '2.5s',
            transform: 'translate3d(0, 0, 0)',
            willChange: 'transform, opacity',
          }}
        />
        {/* Floating Mist Cloud 3 */}
        <div
          className="absolute -bottom-24 left-1/4 w-[780px] h-[380px] rounded-full animate-pulse pointer-events-none"
          style={{
            background: mistBg,
            animationDuration: '12s',
            animationDelay: '1.2s',
            transform: 'translate3d(0, 0, 0)',
            willChange: 'transform, opacity',
          }}
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl z-0" aria-hidden="true">
      {/* Card Mist Layer 1 */}
      <div
        className="absolute -top-10 -left-14 w-64 h-36 rounded-full animate-pulse pointer-events-none"
        style={{
          background: mistBg,
          animationDuration: '8s',
          transform: 'translate3d(0, 0, 0)',
          willChange: 'transform, opacity',
        }}
      />
      {/* Card Mist Layer 2 */}
      <div
        className="absolute -bottom-8 -right-12 w-72 h-36 rounded-full animate-pulse pointer-events-none"
        style={{
          background: mistBg,
          animationDuration: '11s',
          animationDelay: '2s',
          transform: 'translate3d(0, 0, 0)',
          willChange: 'transform, opacity',
        }}
      />
    </div>
  );
}
