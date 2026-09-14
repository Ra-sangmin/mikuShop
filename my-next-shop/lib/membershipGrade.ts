import prisma from '@/lib/prisma';

// 🌟 서버 전용 모듈입니다 (Prisma 사용) — API 라우트/서버 컴포넌트에서만 import하세요.
// "use client" 컴포넌트에서 직접 가져다 쓰면 안 됩니다 (src/utils/feeCalculator.ts 참고).
// 등급 이름/할인율은 admin/membership-grades 페이지에서 관리하는 membership_grades
// 테이블을 그대로 참조합니다.

/** 등급명으로 국제 배송비 할인율(0~1 사이 소수, 예: 0.1 = 10%)을 조회합니다. 등급이 없으면 0을 반환합니다. */
export async function getInternationalShippingDiscountRate(gradeName: string): Promise<number> {
  const grade = await prisma.membershipGrade.findUnique({ where: { name: gradeName } });
  return grade?.discountRate ?? 0;
}

/** 국제 배송비 원가에 등급 할인을 적용한 최종 금액 (원 단위 반올림) */
export async function calculateDiscountedInternationalShipping(baseShippingFee: number, gradeName: string): Promise<number> {
  if (baseShippingFee <= 0) return 0;
  const rate = await getInternationalShippingDiscountRate(gradeName);
  return Math.round(baseShippingFee * (1 - rate));
}
