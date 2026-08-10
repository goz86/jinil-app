import React from 'react';

export default function WeatherIcon({ type, className = "w-10 h-10" }) {
  switch (type) {
    case 'clear-day':
      return (
        <svg viewBox="0 0 64 64" className={`${className} transition-transform duration-300 hover:scale-110 shrink-0`}>
          <defs>
            <radialGradient id="sun-grad-cd" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#FFF176" />
              <stop offset="55%" stopColor="#FBC02D" />
              <stop offset="100%" stopColor="#F57F17" />
            </radialGradient>
            <radialGradient id="sun-aura-cd" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFE082" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#FFB300" stopOpacity="0" />
            </radialGradient>
            <filter id="sun-shadow-cd" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#F57F17" floodOpacity="0.35" />
            </filter>
          </defs>
          <circle cx="32" cy="32" r="26" fill="url(#sun-aura-cd)" />
          <circle cx="32" cy="32" r="19" fill="url(#sun-grad-cd)" filter="url(#sun-shadow-cd)" />
          <circle cx="26" cy="26" r="13" fill="#FFF9C4" opacity="0.35" />
        </svg>
      );

    case 'clear-night':
      return (
        <svg viewBox="0 0 64 64" className={`${className} transition-transform duration-300 hover:scale-110 shrink-0`}>
          <defs>
            <linearGradient id="moon-grad-cn" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF59D" />
              <stop offset="60%" stopColor="#FBC02D" />
              <stop offset="100%" stopColor="#F57F17" />
            </linearGradient>
            <filter id="moon-shadow-cn" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#F57F17" floodOpacity="0.3" />
            </filter>
          </defs>
          <path
            d="M 40,14 C 27,14 17,25 17,39 C 17,48 22,54 29,56 C 23,51 21,43 22,35 C 24,24 32,16 43,15 C 42.1,14.3 41.1,14 40,14 Z"
            fill="url(#moon-grad-cn)"
            filter="url(#moon-shadow-cn)"
          />
          <circle cx="45" cy="20" r="2" fill="#FFFFFF" opacity="0.9" />
          <circle cx="49" cy="32" r="1.5" fill="#FFF9C4" opacity="0.85" />
          <circle cx="19" cy="18" r="1.5" fill="#FFFFFF" opacity="0.75" />
        </svg>
      );

    case 'partly-cloudy-day':
      return (
        <svg viewBox="0 0 64 64" className={`${className} transition-transform duration-300 hover:scale-110 shrink-0`}>
          <defs>
            <linearGradient id="sun-pcd" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF176" />
              <stop offset="60%" stopColor="#FBC02D" />
              <stop offset="100%" stopColor="#F57F17" />
            </linearGradient>
            <linearGradient id="cloud-pcd" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="75%" stopColor="#F1F5F9" />
              <stop offset="100%" stopColor="#E2E8F0" />
            </linearGradient>
            <filter id="cloud-shadow-pcd" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#0F172A" floodOpacity="0.18" />
            </filter>
          </defs>
          <circle cx="44" cy="22" r="14" fill="url(#sun-pcd)" />
          <circle cx="41" cy="19" r="10" fill="#FFF9C4" opacity="0.3" />
          <g filter="url(#cloud-shadow-pcd)">
            <path
              d="M 18,46 L 46,46 C 51.5,46 55,42 55,36.5 C 55,31.5 51.5,27.5 46.5,27.5 C 45.5,21.5 40.5,17 34,17 C 28.5,17 24,20.5 22.5,25.5 C 16.5,26 12,31 12,36.5 C 12,42 16,46 18,46 Z"
              fill="url(#cloud-pcd)"
            />
          </g>
        </svg>
      );

    case 'partly-cloudy-night':
      return (
        <svg viewBox="0 0 64 64" className={`${className} transition-transform duration-300 hover:scale-110 shrink-0`}>
          <defs>
            <linearGradient id="moon-pcn" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF59D" />
              <stop offset="60%" stopColor="#FBC02D" />
              <stop offset="100%" stopColor="#F57F17" />
            </linearGradient>
            <linearGradient id="cloud-pcn" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="75%" stopColor="#F1F5F9" />
              <stop offset="100%" stopColor="#CBD5E1" />
            </linearGradient>
            <filter id="cloud-shadow-pcn" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#0F172A" floodOpacity="0.25" />
            </filter>
          </defs>
          <path
            d="M 44,12 C 34,12 26,20 26,31 C 26,35 27.5,39 30,42 C 40,42 47,38 48,30 C 49,23 48,16 44,12 Z"
            fill="url(#moon-pcn)"
          />
          <g filter="url(#cloud-shadow-pcn)">
            <path
              d="M 18,46 L 46,46 C 51.5,46 55,42 55,36.5 C 55,31.5 51.5,27.5 46.5,27.5 C 45.5,21.5 40.5,17 34,17 C 28.5,17 24,20.5 22.5,25.5 C 16.5,26 12,31 12,36.5 C 12,42 16,46 18,46 Z"
              fill="url(#cloud-pcn)"
            />
          </g>
        </svg>
      );

    case 'cloudy':
      return (
        <svg viewBox="0 0 64 64" className={`${className} transition-transform duration-300 hover:scale-110 shrink-0`}>
          <defs>
            <linearGradient id="cloud-back-c" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#CBD5E1" />
              <stop offset="100%" stopColor="#94A3B8" />
            </linearGradient>
            <linearGradient id="cloud-front-c" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="80%" stopColor="#F1F5F9" />
              <stop offset="100%" stopColor="#E2E8F0" />
            </linearGradient>
            <filter id="cloud-shadow-c" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#0F172A" floodOpacity="0.18" />
            </filter>
          </defs>
          <path
            d="M 26,38 L 50,38 C 54.5,38 58,34.5 58,30 C 58,26 55,22.5 50.5,22.5 C 49.5,17.5 45,14 40,14 C 35.5,14 31.5,16.5 30.5,20.5 C 25.5,21 21.5,25 21.5,30 C 21.5,34.5 24.5,38 26,38 Z"
            fill="url(#cloud-back-c)"
            opacity="0.85"
          />
          <g filter="url(#cloud-shadow-c)">
            <path
              d="M 16,48 L 44,48 C 49.5,48 53,44 53,38.5 C 53,33.5 49.5,29.5 44.5,29.5 C 43.5,23.5 38.5,19 32,19 C 26.5,19 22,22.5 20.5,27.5 C 14.5,28 10,33 10,38.5 C 10,44 14,48 16,48 Z"
              fill="url(#cloud-front-c)"
            />
          </g>
        </svg>
      );

    case 'rain':
    case 'drizzle':
    case 'shower':
      return (
        <svg viewBox="0 0 64 64" className={`${className} transition-transform duration-300 hover:scale-110 shrink-0`}>
          <defs>
            <linearGradient id="cloud-rain" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="75%" stopColor="#E2E8F0" />
              <stop offset="100%" stopColor="#CBD5E1" />
            </linearGradient>
            <linearGradient id="drop-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>
            <filter id="cloud-shadow-r" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#0F172A" floodOpacity="0.2" />
            </filter>
          </defs>
          <g filter="url(#cloud-shadow-r)">
            <path
              d="M 16,40 L 44,40 C 49.5,40 53,36 53,30.5 C 53,25.5 49.5,21.5 44.5,21.5 C 43.5,15.5 38.5,11 32,11 C 26.5,11 22,14.5 20.5,19.5 C 14.5,20 10,25 10,30.5 C 10,36 14,40 16,40 Z"
              fill="url(#cloud-rain)"
            />
          </g>
          {/* Raindrops */}
          <path d="M 22,46 L 19,54 C 18.5,55.5 20,57 21.5,56 C 22.5,55.3 24,53 24,46 Z" fill="url(#drop-grad)" />
          <path d="M 32,46 L 29,54 C 28.5,55.5 30,57 31.5,56 C 32.5,55.3 34,53 34,46 Z" fill="url(#drop-grad)" />
          <path d="M 42,46 L 39,54 C 38.5,55.5 40,57 41.5,56 C 42.5,55.3 44,53 44,46 Z" fill="url(#drop-grad)" />
        </svg>
      );

    case 'snow':
      return (
        <svg viewBox="0 0 64 64" className={`${className} transition-transform duration-300 hover:scale-110 shrink-0`}>
          <defs>
            <linearGradient id="cloud-snow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="80%" stopColor="#F1F5F9" />
              <stop offset="100%" stopColor="#E2E8F0" />
            </linearGradient>
            <filter id="cloud-shadow-s" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#0F172A" floodOpacity="0.18" />
            </filter>
          </defs>
          <g filter="url(#cloud-shadow-s)">
            <path
              d="M 16,40 L 44,40 C 49.5,40 53,36 53,30.5 C 53,25.5 49.5,21.5 44.5,21.5 C 43.5,15.5 38.5,11 32,11 C 26.5,11 22,14.5 20.5,19.5 C 14.5,20 10,25 10,30.5 C 10,36 14,40 16,40 Z"
              fill="url(#cloud-snow)"
            />
          </g>
          {/* Snowflakes */}
          <circle cx="22" cy="50" r="3" fill="#38BDF8" opacity="0.9" />
          <circle cx="32" cy="53" r="3.5" fill="#0EA5E9" opacity="0.9" />
          <circle cx="42" cy="50" r="3" fill="#38BDF8" opacity="0.9" />
        </svg>
      );

    case 'thunder':
      return (
        <svg viewBox="0 0 64 64" className={`${className} transition-transform duration-300 hover:scale-110 shrink-0`}>
          <defs>
            <linearGradient id="cloud-thunder" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#94A3B8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
            <linearGradient id="bolt-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="50%" stopColor="#FACC15" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
            <filter id="bolt-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#FACC15" floodOpacity="0.6" />
            </filter>
          </defs>
          <path
            d="M 16,38 L 44,38 C 49.5,38 53,34 53,28.5 C 53,23.5 49.5,19.5 44.5,19.5 C 43.5,13.5 38.5,9 32,9 C 26.5,9 22,12.5 20.5,17.5 C 14.5,18 10,23 10,28.5 C 10,34 14,38 16,38 Z"
            fill="url(#cloud-thunder)"
          />
          {/* Lightning Bolt */}
          <polygon points="34,34 25,48 31,48 27,59 39,44 33,44" fill="url(#bolt-grad)" filter="url(#bolt-glow)" />
        </svg>
      );

    case 'fog':
      return (
        <svg viewBox="0 0 64 64" className={`${className} transition-transform duration-300 hover:scale-110 shrink-0`}>
          <defs>
            <linearGradient id="fog-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#E2E8F0" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#F8FAFC" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#CBD5E1" stopOpacity="0.4" />
            </linearGradient>
          </defs>
          <rect x="12" y="20" width="40" height="6" rx="3" fill="url(#fog-grad)" />
          <rect x="8" y="30" width="48" height="7" rx="3.5" fill="url(#fog-grad)" />
          <rect x="14" y="41" width="36" height="6" rx="3" fill="url(#fog-grad)" />
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 64 64" className={`${className} transition-transform duration-300 hover:scale-110 shrink-0`}>
          <defs>
            <radialGradient id="sun-grad-def" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#FFF176" />
              <stop offset="55%" stopColor="#FBC02D" />
              <stop offset="100%" stopColor="#F57F17" />
            </radialGradient>
          </defs>
          <circle cx="32" cy="32" r="20" fill="url(#sun-grad-def)" />
        </svg>
      );
  }
}
