// 🤖 미쿠짱 AI 비서 마크 — 헤드셋을 쓴 '홀로그램 속 미쿠짱'(ai-shopping-assistant)으로 만든 AI 비서 아이콘
//
// 두 가지 모양
//  - holo  : 깊은 자줏빛 타일 + 머리 뒤로 빛나는 링(로즈→보라→하늘색) + 궤도 점 + 반짝임 → 첫 화면·배너 같은 큰 자리
//  - aurora: 흰 바탕 + 오로라 빛 번짐 + 그라데이션 테두리 + 반짝임                       → 대화 말풍선 옆처럼 작은 자리
//  🐛 예전엔 캐릭터를 동그란 창 안에 넣어 "망원경으로 들여다보는" 느낌이었습니다 → 창 없이 타일에 바로 세웁니다.
//  variant 를 안 주면 aurora (사이트 전체 통일).
//
// 모든 치수는 em 단위이고 font-size = size(px) 라서, 어떤 크기로 써도 비율이 그대로 유지됩니다.
// 그림은 1장(ai-miku-icon.webp, 300px · 약 20KB — ai-shopping-assistant-transparent.png 에서 얼굴·어깨만 잘라 냄)만 씁니다.

const AVATAR_SRC = '/images/miku_icon/ai-miku-icon.webp';

function Spark({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M12 1.5C12.7 8 16 11.3 22.5 12 16 12.7 12.7 16 12 22.5 11.3 16 8 12.7 1.5 12 8 11.3 11.3 8 12 1.5Z" fill="currentColor" />
    </svg>
  );
}

export default function AiBotMark({
  size = 72,
  animated = false,
  variant,
}: {
  size?: number;
  animated?: boolean;
  variant?: 'holo' | 'aurora';
}) {
  // 2026-10: 밝은 오로라 모양으로 통일 (어두운 holo 는 필요할 때 variant="holo" 로만 씁니다)
  const v = variant ?? 'aurora';
  // eslint-disable-next-line @next/next/no-img-element
  const girl = <img className="aim-girl" src={AVATAR_SRC} alt="" draggable={false} />;

  return (
    <span className={`ais-mark aim aim-${v}${animated ? ' is-animated' : ''}`} style={{ fontSize: size }} aria-hidden>
      {v === 'holo' ? (
        <>
          <span className="aim-glow" />
          <span className="aim-ring" />
          {girl}
          <span className="aim-orb" />
          <Spark className="aim-spark" />
        </>
      ) : (
        <>
          <span className="aim-blob b1" />
          <span className="aim-blob b2" />
          <span className="aim-blob b3" />
          <span className="aim-frame" />
          {girl}
          <Spark className="aim-spark s1" />
          <Spark className="aim-spark s2" />
        </>
      )}
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
