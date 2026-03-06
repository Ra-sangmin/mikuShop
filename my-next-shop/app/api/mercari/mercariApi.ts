// app/main_shop/mercari/mercariApi.ts

// 마지막 성공 시간을 기억하는 글로벌 변수
let lastCallTimestamp = 0;

/**
 * 🚀 1. API 호출 전 쿨타임을 체크하는 함수 (미쿠짱이 요청한 방식)
 * 10초가 지났는지 확인하고 결과를 반환합니다.
 */
export const checkMercariCooldown = () => {
  const now = Date.now();
  const requiredInterval = 10000; // 10초
  const elapsedTime = now - lastCallTimestamp;

  if (elapsedTime < requiredInterval) {
    // 10초가 안 지난 경우: false와 남은 시간을 반환
    return {
      canCall: false,
      remainingTime: Math.ceil((requiredInterval - elapsedTime) / 1000)
    };
  }

  // 10초가 지난 경우: 시간을 갱신하고 true 반환
  lastCallTimestamp = now;
  return { canCall: true, remainingTime: 0 };
};

/**
 * 🚀 2. (기존 방식) 10초를 자동으로 기다렸다가 실행하는 함수
 * 기존 코드와의 호환성을 위해 유지합니다.
 */
export const throttledMercariFetch = async (url: string, options?: RequestInit) => {
  const now = Date.now();
  const elapsedTime = now - lastCallTimestamp;
  const requiredInterval = 10000;

  if (elapsedTime < requiredInterval) {
    const remainingTime = requiredInterval - elapsedTime;
    await new Promise((resolve) => setTimeout(resolve, remainingTime));
  }

  const response = await fetch(url, options);
  lastCallTimestamp = Date.now();
  return response;
};