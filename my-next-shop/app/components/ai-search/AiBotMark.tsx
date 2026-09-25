// 🤖 미쿠짱 AI 비서 마크 — 이모지(🤖) 대신 쓰는 전용 아이콘
//
// 로즈 그라데이션 타일 + 유리 광택 + 흰 로봇 얼굴(바이저·눈빛) + 안테나 끝의 AI 반짝임.
// 안테나 반짝임은 상품 상세의 "미쿠짱 AI 간단 요약" 아이콘과 같은 4갈래 별 모양으로 맞췄습니다.
// size: 타일 한 변(px). 글자·아이콘은 타일 크기에 맞춰 비례로 줄어듭니다.

export default function AiBotMark({ size = 72, animated = false }: { size?: number; animated?: boolean }) {
  return (
    <span
      className={`ais-mark${animated ? ' is-animated' : ''}`}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.3) }}
      aria-hidden
    >
      <svg viewBox="0 0 40 40" width={Math.round(size * 0.7)} height={Math.round(size * 0.7)} className="ais-mark-svg">
        <defs>
          <linearGradient id="aisVisor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5b2436" />
            <stop offset="100%" stopColor="#2a1320" />
          </linearGradient>
          <radialGradient id="aisEye" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="55%" stopColor="#ffd3d6" />
            <stop offset="100%" stopColor="#ff9aa2" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 안테나 + AI 반짝임 */}
        <line x1="20" y1="12.5" x2="20" y2="8.6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".95" />
        <path
          className="ais-mark-spark"
          d="M20 2.2 L21.15 5.35 L24.3 6.5 L21.15 7.65 L20 10.8 L18.85 7.65 L15.7 6.5 L18.85 5.35 Z"
          fill="#fff"
        />

        {/* 귀 */}
        <rect x="4.6" y="19" width="3.2" height="7" rx="1.6" fill="#fff" opacity=".85" />
        <rect x="32.2" y="19" width="3.2" height="7" rx="1.6" fill="#fff" opacity=".85" />

        {/* 머리 */}
        <rect x="7.5" y="12.5" width="25" height="20" rx="8" fill="#fff" />
        {/* 바이저 */}
        <rect x="11" y="17" width="18" height="9.5" rx="4.75" fill="url(#aisVisor)" />
        {/* 눈빛 */}
        <circle cx="16.4" cy="21.75" r="3.2" fill="url(#aisEye)" />
        <circle cx="23.6" cy="21.75" r="3.2" fill="url(#aisEye)" />
        <circle className="ais-mark-eye" cx="16.4" cy="21.75" r="1.35" fill="#fff" />
        <circle className="ais-mark-eye" cx="23.6" cy="21.75" r="1.35" fill="#fff" />
        {/* 미소 */}
        <path d="M17.2 29 Q20 30.6 22.8 29" stroke="#d27377" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      </svg>
    </span>
  );
}

/**
 * ✦ AI 반짝임 아이콘 — 검색창 앞에 두던 ✨ 이모지를 대신합니다.
 * 큰 네 갈래 별(로즈 → 바이올렛 그라데이션) + 작은 별 두 개. 이모지와 달리 기기마다 모양이 바뀌지 않습니다.
 */
export function AiSparkle({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={`ais-sparkle ${className}`} aria-hidden>
      <defs>
        <linearGradient id="aisSparkleGrad" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f0959a" />
          <stop offset="55%" stopColor="#d27377" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <path d="M10 3.5 L11.9 8.6 L17 10.5 L11.9 12.4 L10 17.5 L8.1 12.4 L3 10.5 L8.1 8.6 Z" fill="url(#aisSparkleGrad)" />
      <path d="M18.2 2.5 L18.9 4.3 L20.7 5 L18.9 5.7 L18.2 7.5 L17.5 5.7 L15.7 5 L17.5 4.3 Z" fill="#f0959a" />
      <path d="M17.5 15.5 L18.1 17 L19.6 17.6 L18.1 18.2 L17.5 19.7 L16.9 18.2 L15.4 17.6 L16.9 17 Z" fill="#a78bfa" />
    </svg>
  );
}
