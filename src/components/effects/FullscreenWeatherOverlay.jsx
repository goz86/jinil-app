import React, { useState, useEffect, useRef } from 'react';
import RealSnowEffect from './RealSnowEffect';
import RainEffect from './RainEffect';
import MistEffect from './MistEffect';
import SunGlowEffect from './SunGlowEffect';
import StarsEffect from './StarsEffect';

/**
 * Fullscreen Real-time Weather Atmosphere Overlay
 * Runs automatically for 15 seconds, then smoothly fades out.
 * 100% pointer-events-none so it never interrupts user interaction.
 * Hardware-accelerated GPU opacity fade with automatic resource cleanup.
 */
export default function FullscreenWeatherOverlay() {
  const [shouldRender, setShouldRender] = useState(false);
  const [isFadedIn, setIsFadedIn] = useState(false);
  const [weatherConfig, setWeatherConfig] = useState({
    iconType: 'cloudy',
    isNight: false,
  });

  const timerRef = useRef(null);
  const fadeOutTimerRef = useRef(null);

  useEffect(() => {
    const handleTrigger = (event) => {
      const detail = event.detail || {};
      const iconType = detail.iconType || 'cloudy';
      const isNight = detail.isNight ?? false;

      // Clear any pending timers
      if (timerRef.current) clearTimeout(timerRef.current);
      if (fadeOutTimerRef.current) clearTimeout(fadeOutTimerRef.current);

      setWeatherConfig({ iconType, isNight });
      setShouldRender(true);

      // Trigger GPU fade in on next frame
      requestAnimationFrame(() => {
        setIsFadedIn(true);
      });

      // Schedule graceful fade out after 15 seconds
      timerRef.current = setTimeout(() => {
        setIsFadedIn(false);
        fadeOutTimerRef.current = setTimeout(() => {
          setShouldRender(false);
        }, 1000); // Wait for CSS transition-opacity (1000ms) to finish before unmounting
      }, 15000);
    };

    window.addEventListener('jinil:trigger-fullscreen-weather', handleTrigger);

    return () => {
      window.removeEventListener('jinil:trigger-fullscreen-weather', handleTrigger);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (fadeOutTimerRef.current) clearTimeout(fadeOutTimerRef.current);
    };
  }, []);

  if (!shouldRender) return null;

  const { iconType, isNight } = weatherConfig;

  return (
    <div
      className={`fixed inset-0 pointer-events-none z-40 transition-opacity duration-1000 overflow-hidden ${
        isFadedIn ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ transform: 'translate3d(0, 0, 0)', willChange: 'opacity' }}
      aria-hidden="true"
    >
      {/* 100% Transparent background to preserve the pristine bright web UI */}
      {isNight && (
        <div className="absolute inset-0 pointer-events-none bg-blue-950/10 transition-colors duration-1000" />
      )}

      {/* 1. Snow condition: Ultra-realistic soft fluttering snowfall */}
      {iconType === 'snow' && (
        <RealSnowEffect isNight={isNight} fullScreen={true} />
      )}

      {/* 2. Rain condition: Lightweight full-screen canvas rain */}
      {(iconType === 'rain' || iconType === 'drizzle' || iconType === 'shower') && (
        <RainEffect isNight={isNight} withLightning={false} fullScreen={true} />
      )}

      {/* 3. Thunder condition: Rain + soft lightning flash */}
      {iconType === 'thunder' && (
        <RainEffect isNight={isNight} withLightning={true} fullScreen={true} />
      )}

      {/* 4. Overcast / Cloudy / Fog condition: Soft ambient mist layers */}
      {(iconType === 'cloudy' || iconType === 'fog') && (
        <MistEffect isNight={isNight} fullScreen={true} />
      )}

      {/* 5. Clear Night: Twinkling stars */}
      {(iconType === 'clear-night' || iconType === 'partly-cloudy-night') && (
        <StarsEffect fullScreen={true} />
      )}

      {/* 6. Clear Day: Warm breathing sun flare */}
      {iconType === 'clear-day' && (
        <SunGlowEffect fullScreen={true} />
      )}
    </div>
  );
}
