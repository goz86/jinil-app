import React from 'react';
import RealSnowEffect from './RealSnowEffect';
import RainEffect from './RainEffect';
import MistEffect from './MistEffect';
import SunGlowEffect from './SunGlowEffect';
import StarsEffect from './StarsEffect';

/**
 * High-performance ambient weather atmosphere layer
 * Runs on GPU (WebGL2 / Hardware-accelerated Canvas & Keyframes)
 * Automatically pauses when hidden to preserve 60-120 FPS
 */
export default function WeatherAtmosphere({ iconType, isNight = false }) {
  if (!iconType) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl z-0 transition-opacity duration-700 select-none"
      style={{ transform: 'translateZ(0)' }}
      aria-hidden="true"
    >
      {/* 1. Snow condition: Soft fluttering snow */}
      {iconType === 'snow' && (
        <RealSnowEffect isNight={isNight} fullScreen={false} />
      )}

      {/* 2. Rain condition: High-speed lightweight canvas raindrops */}
      {(iconType === 'rain' || iconType === 'drizzle' || iconType === 'shower') && (
        <RainEffect isNight={isNight} withLightning={false} />
      )}

      {/* 3. Thunder condition: Rain + soft ambient lightning flash */}
      {iconType === 'thunder' && (
        <RainEffect isNight={isNight} withLightning={true} />
      )}

      {/* 4. Overcast / Cloudy / Fog condition: Soft ambient mist layers */}
      {(iconType === 'cloudy' || iconType === 'fog') && (
        <MistEffect isNight={isNight} />
      )}

      {/* 5. Clear Night: Micro twinkling stars */}
      {(iconType === 'clear-night' || iconType === 'partly-cloudy-night') && (
        <StarsEffect />
      )}

      {/* 6. Clear Day: Warm breathing sun flare */}
      {iconType === 'clear-day' && (
        <SunGlowEffect />
      )}
    </div>
  );
}
