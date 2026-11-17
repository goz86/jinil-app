import React from 'react';

/**
 * 3D Glassmorphic Solar Jewel (Mặt Trời Pha Lê Thủy Tinh 3D)
 * Concept 2 Implementation:
 * 1. Khối cầu Pha Lê Thủy Tinh 3D trung tâm (Glassmorphic Crystal Sphere)
 *    với độ khúc xạ quang học, viền sáng gương (specular highlight) và lõi vàng ấm lung linh
 * 2. 16 Sợi tơ quang học (Fine Glassmorphic Light Filaments) thanh mảnh, bán trong suốt (translucent)
 *    như ánh sáng chiếu qua lăng kính pha lê, không hề che khuất chữ hay các nút chức năng bên dưới
 * 3. 2 Vòng sóng hào quang thủy tinh nhịp thở (Breathing Ripple Rings) lan tỏa êm đềm
 * 4. Vệt sáng khuếch tán mềm mịn (Atmospheric Soft Bloom), loại bỏ 100% hình khối tam giác cắt góc
 * 5. Bụi nắng vàng (Sun motes) lơ lửng trong không khí
 * 6. Khắc phục triệt để lỗi 2 mặt trời ở thẻ widget
 */

// 16 Radiating Filament Angles (Alternating Major & Minor)
const FILAMENT_ANGLES = [
  { deg: 0, isMajor: true },
  { deg: 22.5, isMajor: false },
  { deg: 45, isMajor: true },
  { deg: 67.5, isMajor: false },
  { deg: 90, isMajor: true },
  { deg: 112.5, isMajor: false },
  { deg: 135, isMajor: true },
  { deg: 157.5, isMajor: false },
  { deg: 180, isMajor: true },
  { deg: 202.5, isMajor: false },
  { deg: 225, isMajor: true },
  { deg: 247.5, isMajor: false },
  { deg: 270, isMajor: true },
  { deg: 292.5, isMajor: false },
  { deg: 315, isMajor: true },
  { deg: 337.5, isMajor: false },
];

// Floating Sun Mote Particles for Fullscreen
const FULLSCREEN_SUN_MOTES = [
  { top: '15%', left: '74%', size: 3.5, delay: '0s', dur: '5s' },
  { top: '22%', left: '85%', size: 2.2, delay: '1.2s', dur: '6s' },
  { top: '30%', left: '62%', size: 4.0, delay: '0.6s', dur: '7s' },
  { top: '38%', left: '80%', size: 2.8, delay: '2.1s', dur: '5.5s' },
  { top: '44%', left: '52%', size: 3.2, delay: '1.5s', dur: '6.5s' },
  { top: '54%', left: '70%', size: 2.0, delay: '3.0s', dur: '8s' },
  { top: '64%', left: '44%', size: 3.8, delay: '0.8s', dur: '7.5s' },
  { top: '72%', left: '60%', size: 2.5, delay: '2.4s', dur: '6s' },
  { top: '80%', left: '36%', size: 3.0, delay: '1.9s', dur: '8.5s' },
  { top: '28%', left: '92%', size: 2.4, delay: '3.5s', dur: '5.8s' },
  { top: '48%', left: '88%', size: 3.6, delay: '0.3s', dur: '7.2s' },
  { top: '18%', left: '50%', size: 2.6, delay: '2.8s', dur: '6.8s' },
];

const CARD_SUN_MOTES = [
  { top: '25%', left: '75%', size: 2.5, delay: '0s', dur: '4s' },
  { top: '45%', left: '85%', size: 2.0, delay: '1s', dur: '5s' },
  { top: '65%', left: '65%', size: 3.0, delay: '1.8s', dur: '4.5s' },
];

export default function SunGlowEffect({ fullScreen = false }) {
  if (fullScreen) {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none" aria-hidden="true">
        {/* 1. Vệt sáng khuếch tán tự nhiên: Vầng nắng êm dịu, không hề có đường cắt tam giác */}
        <div
          className="absolute -top-28 -right-28 w-[850px] h-[850px] pointer-events-none"
          style={{
            background: 'radial-gradient(circle at center, rgba(254, 240, 138, 0.22) 0%, rgba(251, 191, 36, 0.12) 35%, rgba(245, 158, 11, 0.04) 60%, transparent 80%)',
            animation: 'pulse 5.5s ease-in-out infinite',
            willChange: 'opacity',
          }}
        />
        <div
          className="absolute top-0 right-0 w-[550px] h-[550px] pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at top right, rgba(255, 255, 255, 0.35) 0%, rgba(254, 240, 138, 0.16) 25%, rgba(251, 191, 36, 0.06) 50%, transparent 75%)',
            animation: 'pulse 7s ease-in-out infinite 1.5s',
            willChange: 'opacity',
          }}
        />

        {/* 2. MẶT TRỜI PHA LÊ THỦY TINH 3D (3D Glassmorphic Solar Jewel) */}
        {/* Đặt ở góc cao trên đường chân trời (top: 14px, right: 26px) để giải phóng hoàn toàn khu vực thẻ admin và tab */}
        <div
          className="absolute top-3.5 right-6 w-72 h-72 pointer-events-none flex items-center justify-center"
          style={{ transform: 'translate3d(0, 0, 0)' }}
        >
          {/* HÀO QUANG 1: Sóng ánh sáng lan tỏa ngoài cùng (Outer Ripple Wave) */}
          <div
            className="absolute w-64 h-64 rounded-full border border-amber-300/35 pointer-events-none"
            style={{
              animation: 'ping 5.5s cubic-bezier(0, 0, 0.2, 1) infinite',
              willChange: 'transform, opacity',
            }}
          />

          {/* HÀO QUANG 2: Vòng hào quang thủy tinh nhịp thở (Inner Crystal Halo Ring) */}
          <div
            className="absolute w-44 h-44 rounded-full border border-amber-300/50 pointer-events-none shadow-[0_0_20px_rgba(251,191,36,0.35)]"
            style={{
              animation: 'pulse 3.6s ease-in-out infinite',
              willChange: 'opacity',
            }}
          />

          {/* Vầng sáng khuếch tán mềm đằng sau viên ngọc pha lê */}
          <div
            className="absolute w-48 h-48 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.9) 0%, rgba(254, 240, 138, 0.6) 35%, rgba(251, 191, 36, 0.25) 60%, transparent 80%)',
            }}
          />

          {/* 16 SỢI TƠ QUANG HỌC PHA LÊ (Fine Glassmorphic Light Filaments) */}
          {/* Thanh mảnh, có độ trong suốt cao (translucent), xoay chậm 110s, không che chữ hay nút bấm */}
          <div
            className="absolute w-72 h-72 pointer-events-none animate-spin"
            style={{
              animationDuration: '110s',
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
              willChange: 'transform',
            }}
          >
            <svg
              className="w-full h-full"
              viewBox="0 0 280 280"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ filter: 'drop-shadow(0 0 3px rgba(251, 191, 36, 0.6))' }}
            >
              <defs>
                {/* Dải màu sợi tơ pha lê dài */}
                <linearGradient id="crystalMajor" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                  <stop offset="40%" stopColor="#fbbf24" stopOpacity="0.75" />
                  <stop offset="70%" stopColor="#fef08a" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
                {/* Dải màu sợi tơ pha lê ngắn */}
                <linearGradient id="crystalMinor" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#d97706" stopOpacity="0.35" />
                  <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.65" />
                  <stop offset="100%" stopColor="#fffbeb" stopOpacity="0" />
                </linearGradient>
              </defs>

              {FILAMENT_ANGLES.map((ray, idx) => (
                <g key={idx} transform={`rotate(${ray.deg} 140 140)`}>
                  {ray.isMajor ? (
                    /* Sợi tơ pha lê chính: dài 68px, thanh mảnh hình thoi vuốt kim */
                    <polygon
                      points="138.8,108 140,40 141.2,108"
                      fill="url(#crystalMajor)"
                    />
                  ) : (
                    /* Sợi tơ pha lê phụ: dài 42px */
                    <polygon
                      points="139.1,108 140,66 140.9,108"
                      fill="url(#crystalMinor)"
                    />
                  )}
                </g>
              ))}
            </svg>
          </div>

          {/* KHỐI CẦU PHA LÊ THỦY TINH 3D (3D Glassmorphic Crystal Sphere) */}
          <div
            className="relative w-16 h-16 rounded-full pointer-events-none z-10 flex items-center justify-center"
            style={{
              background: 'radial-gradient(circle at 35% 32%, #ffffff 0%, #fef08a 22%, #fbbf24 50%, #f59e0b 78%, #d97706 100%)',
              boxShadow: '0 0 35px rgba(251, 191, 36, 0.8), 0 0 15px rgba(255, 255, 255, 0.9), inset -2px -2px 6px rgba(180, 83, 9, 0.4), inset 2px 2px 6px rgba(255, 255, 255, 0.9)',
              border: '1.5px solid rgba(255, 255, 255, 0.85)',
              transform: 'translate3d(0, 0, 0)',
            }}
          >
            {/* Vệt phản chiếu ánh gương thủy tinh (Specular Glass Reflection Arc) */}
            <div
              className="absolute top-1.5 left-2 w-7 h-4 rounded-full pointer-events-none transform -rotate-35"
              style={{
                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0) 100%)',
              }}
            />

            {/* Lõi ngọc phát sáng trung tâm (Inner Luminous Pearl) */}
            <div
              className="w-5 h-5 rounded-full pointer-events-none"
              style={{
                background: 'radial-gradient(circle at center, #ffffff 0%, #fef08a 60%, rgba(251, 191, 36, 0.4) 100%)',
                boxShadow: '0 0 12px rgba(255, 255, 255, 1)',
              }}
            />
          </div>
        </div>

        {/* 3. Prismatic Lens Flare (Đĩa khúc xạ quang học bán trong suốt) */}
        <div
          className="absolute top-[38%] right-[42%] w-20 h-20 rounded-full border border-amber-300/20 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(254, 240, 138, 0.10) 0%, rgba(56, 189, 248, 0.04) 60%, transparent 75%)',
            animation: 'pulse 5s ease-in-out infinite 0.8s',
            transform: 'translate3d(0, 0, 0)',
          }}
        />
        <div
          className="absolute top-[62%] right-[68%] w-14 h-14 rounded-full border border-cyan-300/15 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(56, 189, 248, 0.08) 0%, rgba(251, 191, 36, 0.03) 50%, transparent 70%)',
            animation: 'pulse 6s ease-in-out infinite 2s',
            transform: 'translate3d(0, 0, 0)',
          }}
        />

        {/* 4. Floating Sunlight Motes / Bokeh Dust (Bụi nắng vàng lấp lánh trong không khí) */}
        {FULLSCREEN_SUN_MOTES.map((mote, idx) => (
          <span
            key={idx}
            className="absolute rounded-full bg-amber-200/90 pointer-events-none"
            style={{
              top: mote.top,
              left: mote.left,
              width: `${mote.size}px`,
              height: `${mote.size}px`,
              boxShadow: `0 0 ${mote.size * 2}px rgba(251, 191, 36, 0.85)`,
              animation: `pulse ${mote.dur} ease-in-out infinite ${mote.delay}`,
              transform: 'translate3d(0, 0, 0)',
              willChange: 'opacity',
            }}
          />
        ))}
      </div>
    );
  }

  // Card Atmosphere View: Warm ambient illumination ONLY (Không vẽ đĩa mặt trời để tránh lỗi 2 mặt trời)
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl z-0 select-none" aria-hidden="true">
      {/* Vầng hào quang ấm áp bao phủ nền thẻ */}
      <div
        className="absolute -top-12 -right-12 w-48 h-48 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, rgba(254, 240, 138, 0.35) 0%, rgba(251, 191, 36, 0.18) 40%, rgba(245, 158, 11, 0.06) 65%, transparent 80%)',
          animation: 'pulse 4s ease-in-out infinite',
        }}
      />

      {/* Card Micro Sun Motes */}
      {CARD_SUN_MOTES.map((mote, idx) => (
        <span
          key={idx}
          className="absolute rounded-full bg-amber-200 pointer-events-none"
          style={{
            top: mote.top,
            left: mote.left,
            width: `${mote.size}px`,
            height: `${mote.size}px`,
            boxShadow: '0 0 5px rgba(251, 191, 36, 0.9)',
            animation: `pulse ${mote.dur} ease-in-out infinite ${mote.delay}`,
          }}
        />
      ))}
    </div>
  );
}
