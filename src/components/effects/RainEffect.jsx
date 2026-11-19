import React, { useEffect, useRef } from 'react';

/**
 * Ultra-crisp GPU Canvas Rain Effect
 * Designed specifically for high contrast and crystal-clear visibility
 * across both light (white/slate) and dark UI themes.
 * Features realistic refractive raindrops, layered depth, and dynamic bottom splashes.
 */
export default function RainEffect({
  isNight = false,
  withLightning = false,
  fullScreen = false,
  className = ''
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let isVisible = true;
    let width = (canvas.width = fullScreen ? window.innerWidth : (canvas.parentElement?.clientWidth || 300));
    let height = (canvas.height = fullScreen ? window.innerHeight : (canvas.parentElement?.clientHeight || 180));

    const handleResize = () => {
      if (fullScreen) {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
      } else if (canvas.parentElement) {
        width = canvas.width = canvas.parentElement.clientWidth;
        height = canvas.height = canvas.parentElement.clientHeight;
      }
    };

    window.addEventListener('resize', handleResize);

    // Multi-depth rain distribution: Far, Mid, Near
    const DROP_COUNT = fullScreen ? 140 : 36;
    const drops = [];

    for (let i = 0; i < DROP_COUNT; i++) {
      const depth = Math.random(); // 0 = far, 1 = near
      drops.push({
        x: Math.random() * (width + 80) - 40,
        y: Math.random() * height,
        depth,
        // Soothing, natural rain cadence (card rain falls gracefully and gently)
        speed: (fullScreen ? 5.5 : 2.5) + depth * (fullScreen ? 3.5 : 1.8),
        length: (fullScreen ? 14 : 7) + depth * (fullScreen ? 12 : 5),
        width: 1.0 + depth * 1.2,
        // Day mode uses crisp blue tones (37, 99, 235 / 59, 130, 246) for vivid contrast on light UI
        baseColor: isNight
          ? '210, 235, 255'
          : depth > 0.6
          ? '29, 78, 216'     // Deep vibrant cobalt blue
          : depth > 0.3
          ? '37, 99, 235'     // Royal blue
          : '96, 165, 250',   // Sky blue
        opacity: isNight
          ? 0.45 + depth * 0.45
          : 0.50 + depth * 0.42, // Up to 0.92 opacity for clear visibility on white backgrounds
        splash: 0,
        maxSplash: 3.5 + Math.random() * 4,
        splashParticles: [
          { vx: (Math.random() - 0.5) * 2.5, vy: -1.5 - Math.random() * 2 },
          { vx: (Math.random() - 0.5) * 2.5, vy: -1.5 - Math.random() * 2 }
        ]
      });
    }

    let lightningOpacity = 0;
    let nextLightning = withLightning ? Date.now() + 3500 + Math.random() * 5000 : 0;

    const render = () => {
      if (!isVisible || document.hidden) return;

      ctx.clearRect(0, 0, width, height);

      // Thunder flash if enabled
      if (withLightning) {
        const now = Date.now();
        if (now > nextLightning) {
          lightningOpacity = fullScreen ? 0.25 : 0.4;
          nextLightning = now + 4500 + Math.random() * 6000;
        }
        if (lightningOpacity > 0.01) {
          ctx.fillStyle = `rgba(224, 238, 255, ${lightningOpacity})`;
          ctx.fillRect(0, 0, width, height);
          lightningOpacity *= 0.88;
        }
      }

      ctx.lineCap = 'round';

      // Gentle slanted rain angle (-10 deg wind drift)
      const slant = fullScreen ? 2.2 : 1.2;

      for (let i = 0; i < drops.length; i++) {
        const d = drops[i];

        // Draw raindrop streak
        ctx.lineWidth = d.width;
        ctx.strokeStyle = `rgba(${d.baseColor}, ${d.opacity})`;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - slant, d.y + d.length);
        ctx.stroke();

        // Advance fall movement
        d.y += d.speed;
        d.x -= slant * 0.35;

        // Bottom splash & micro ripple
        if (d.y >= height - 4) {
          if (d.splash < d.maxSplash) {
            d.splash += 0.9;
            const splashRatio = 1 - d.splash / d.maxSplash;

            // Concentric water ripple
            ctx.lineWidth = 1;
            ctx.strokeStyle = `rgba(${d.baseColor}, ${Math.max(0, d.opacity * splashRatio * 0.7)})`;
            ctx.beginPath();
            ctx.ellipse(d.x, height - 2, d.splash * 2.2, d.splash * 0.5, 0, 0, Math.PI * 2);
            ctx.stroke();

            // Water droplet pops
            if (d.depth > 0.4) {
              ctx.fillStyle = `rgba(${d.baseColor}, ${Math.max(0, d.opacity * splashRatio)})`;
              ctx.beginPath();
              ctx.arc(
                d.x + d.splashParticles[0].vx * d.splash,
                height - 2 + d.splashParticles[0].vy * d.splash + 0.5 * d.splash,
                0.9,
                0,
                Math.PI * 2
              );
              ctx.arc(
                d.x + d.splashParticles[1].vx * d.splash,
                height - 2 + d.splashParticles[1].vy * d.splash + 0.5 * d.splash,
                0.9,
                0,
                Math.PI * 2
              );
              ctx.fill();
            }
          } else {
            // Reset drop to above screen
            d.y = -15 - Math.random() * 40;
            d.x = Math.random() * (width + 80) - 40;
            d.splash = 0;
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    const handleVisibility = () => {
      isVisible = !document.hidden;
      if (isVisible) {
        cancelAnimationFrame(animId);
        animId = requestAnimationFrame(render);
      } else {
        cancelAnimationFrame(animId);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', () => {
      // Pause heavy rain loop if window is not focused or hidden
      if (document.hidden) {
        isVisible = false;
        cancelAnimationFrame(animId);
      }
    });
    window.addEventListener('focus', () => {
      if (!isVisible && !document.hidden) {
        isVisible = true;
        cancelAnimationFrame(animId);
        animId = requestAnimationFrame(render);
      }
    });

    if (window.electronAPI?.onAppVisibility) {
      window.electronAPI.onAppVisibility((visible) => {
        isVisible = visible && !document.hidden;
        if (isVisible) {
          cancelAnimationFrame(animId);
          animId = requestAnimationFrame(render);
        } else {
          cancelAnimationFrame(animId);
        }
      });
    }

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isNight, withLightning, fullScreen]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none z-0 ${fullScreen ? '' : 'rounded-2xl'} ${className}`}
      aria-hidden="true"
    />
  );
}
