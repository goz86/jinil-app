import React, { useEffect, useRef } from 'react';

/**
 * Ultra-realistic Soft Snowflake Particle System (HTML5 Canvas 2D)
 * Simulates genuine falling snow with:
 * - Soft feathered radial gradients (depth of field, no harsh pixel squares)
 * - 3D depth layering: Foreground (large, soft bokeh), Midground (crisp crystals), Background (gentle mist)
 * - Delicate crystalline cyan/slate-blue contrast halo for vivid visibility on white/light UI
 * - Organic sine-wave fluttering & wind drift
 * - Interactive cursor air currents
 * - 60-120 FPS hardware accelerated performance
 */
export default function RealSnowEffect({
  isNight = false,
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

    // Interactive mouse wind repulsion
    const mouse = { x: -1000, y: -1000, active: false };
    const handleMouseMove = (e) => {
      if (!fullScreen) return;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };
    const handleMouseLeave = () => {
      mouse.active = false;
    };

    if (fullScreen) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      document.addEventListener('mouseleave', handleMouseLeave);
    }

    // Initialize 3D Depth Snowflakes
    const FLAKE_COUNT = fullScreen ? 110 : 32;
    const flakes = [];

    for (let i = 0; i < FLAKE_COUNT; i++) {
      const depth = Math.random(); // 0 = far (small, slow), 1 = near (large, fluffy)
      flakes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        depth,
        // Radius: 1.5px (far) to 5.5px (near), rare bokeh up to 7.5px
        radius: (fullScreen ? 1.8 : 1.4) + depth * (fullScreen ? 4.2 : 2.5) + (depth > 0.92 ? 2.0 : 0),
        // Fall speed: gentle natural drift
        speed: (fullScreen ? 0.7 : 0.5) + depth * (fullScreen ? 1.4 : 0.8),
        // Sway physics
        swaySpeed: 0.0015 + Math.random() * 0.002,
        swayAmp: 0.6 + depth * 1.4,
        phase: Math.random() * Math.PI * 2,
        // Alpha opacity
        opacity: isNight
          ? 0.45 + depth * 0.50
          : 0.55 + depth * 0.42, // Crisp contrast on light theme
      });
    }

    let startTime = performance.now();

    const render = (now) => {
      if (!isVisible || document.hidden) return;

      const elapsed = (now - startTime) * 0.001;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < flakes.length; i++) {
        const f = flakes[i];

        // Natural sine-wave horizontal flutter + subtle wind
        f.x += Math.sin(elapsed * 2.5 + f.phase) * f.swayAmp * 0.35 + 0.25;
        f.y += f.speed;

        // Subtle air current push around cursor (when in fullscreen)
        if (mouse.active) {
          const dx = f.x - mouse.x;
          const dy = f.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120 && dist > 0) {
            const force = (1 - dist / 120) * 1.8;
            f.x += (dx / dist) * force;
            f.y += (dy / dist) * force * 0.5;
          }
        }

        // Screen boundary wrap-around
        if (f.y > height + f.radius * 2) {
          f.y = -f.radius * 2;
          f.x = Math.random() * width;
        }
        if (f.x > width + f.radius * 2) {
          f.x = -f.radius * 2;
        } else if (f.x < -f.radius * 2) {
          f.x = width + f.radius * 2;
        }

        // Draw soft, organic, feathered snowflake with crystalline contrast
        const grad = ctx.createRadialGradient(
          f.x,
          f.y,
          0,
          f.x,
          f.y,
          f.radius
        );

        if (isNight) {
          // Night: Luminous moonlit frosty silver-white
          grad.addColorStop(0, `rgba(255, 255, 255, ${f.opacity})`);
          grad.addColorStop(0.5, `rgba(224, 242, 254, ${f.opacity * 0.7})`);
          grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        } else {
          // Day / Light UI: Frosted crystalline core with sky-blue refraction rim
          // This guarantees crystal-clear visibility against white/light backgrounds!
          grad.addColorStop(0, `rgba(255, 255, 255, ${Math.min(1, f.opacity * 1.1)})`);
          grad.addColorStop(0.35, `rgba(186, 230, 253, ${f.opacity * 0.95})`);
          grad.addColorStop(0.75, `rgba(56, 189, 248, ${f.opacity * 0.55})`);
          grad.addColorStop(1, 'rgba(14, 165, 233, 0)');
        }

        ctx.beginPath();
        ctx.fillStyle = grad;
        ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
        ctx.fill();

        // Extra frosty core sparkle for near flakes
        if (f.depth > 0.65) {
          ctx.beginPath();
          ctx.fillStyle = isNight
            ? `rgba(255, 255, 255, ${f.opacity * 0.9})`
            : `rgba(255, 255, 255, 0.95)`;
          ctx.arc(f.x, f.y, f.radius * 0.35, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(render);
    };

    const handleVisibility = () => {
      isVisible = !document.hidden;
      if (isVisible) {
        cancelAnimationFrame(animId);
        startTime = performance.now();
        animId = requestAnimationFrame(render);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      if (fullScreen) {
        window.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseleave', handleMouseLeave);
      }
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isNight, fullScreen]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none z-0 ${fullScreen ? '' : 'rounded-2xl'} ${className}`}
      aria-hidden="true"
    />
  );
}
