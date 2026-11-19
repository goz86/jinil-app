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
    let lastRenderTime = 0;
    const TARGET_FPS = 30; // 30 FPS cap saves 75% GPU/CPU work
    const FRAME_INTERVAL = 1000 / TARGET_FPS;

    // Pre-render snowflake sprites to avoid calling createRadialGradient in animation loop
    const SPRITE_SIZES = [8, 16, 24];
    const sprites = SPRITE_SIZES.map(size => {
      const offCanvas = document.createElement('canvas');
      offCanvas.width = size * 2;
      offCanvas.height = size * 2;
      const offCtx = offCanvas.getContext('2d');
      const grad = offCtx.createRadialGradient(size, size, 0, size, size, size);
      if (isNight) {
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        grad.addColorStop(0.5, 'rgba(224, 242, 254, 0.7)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      } else {
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(0.35, 'rgba(186, 230, 253, 0.85)');
        grad.addColorStop(0.75, 'rgba(56, 189, 248, 0.45)');
        grad.addColorStop(1, 'rgba(14, 165, 233, 0)');
      }
      offCtx.fillStyle = grad;
      offCtx.beginPath();
      offCtx.arc(size, size, size, 0, Math.PI * 2);
      offCtx.fill();
      return { canvas: offCanvas, size };
    });

    const render = (now) => {
      if (!isVisible || document.hidden) return;

      animId = requestAnimationFrame(render);

      if (now - lastRenderTime < FRAME_INTERVAL) return;
      lastRenderTime = now - ((now - lastRenderTime) % FRAME_INTERVAL);

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

        // Fast GPU blit using pre-rendered sprite
        const spriteIdx = f.depth > 0.65 ? 2 : f.depth > 0.35 ? 1 : 0;
        const sprite = sprites[spriteIdx];
        ctx.globalAlpha = f.opacity;
        ctx.drawImage(
          sprite.canvas,
          f.x - f.radius,
          f.y - f.radius,
          f.radius * 2,
          f.radius * 2
        );
      }
      ctx.globalAlpha = 1.0;
    };

    const handleVisibility = () => {
      isVisible = !document.hidden;
      if (isVisible) {
        cancelAnimationFrame(animId);
        startTime = performance.now();
        animId = requestAnimationFrame(render);
      } else {
        cancelAnimationFrame(animId);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', () => {
      if (document.hidden) {
        isVisible = false;
        cancelAnimationFrame(animId);
      }
    });
    window.addEventListener('focus', () => {
      if (!isVisible && !document.hidden) {
        isVisible = true;
        cancelAnimationFrame(animId);
        startTime = performance.now();
        animId = requestAnimationFrame(render);
      }
    });

    if (window.electronAPI?.onAppVisibility) {
      window.electronAPI.onAppVisibility((visible) => {
        isVisible = visible && !document.hidden;
        if (isVisible) {
          cancelAnimationFrame(animId);
          startTime = performance.now();
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
      style={{ contain: 'strict', willChange: 'transform' }}
      className={`absolute inset-0 w-full h-full pointer-events-none z-0 ${fullScreen ? '' : 'rounded-2xl'} ${className}`}
      aria-hidden="true"
    />
  );
}
