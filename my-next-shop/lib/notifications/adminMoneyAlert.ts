// 🔔 미쿠짱머니 충전·환불 **신청**이 들어오면 관리자에게 바로 알립니다.
//
// 주문 알림(adminOrderAlertRunner)과 다른 점
//   주문은 여러 건이 잇따라 바뀌므로 "지난번 알린 뒤 ~ 지금"으로 모아 보냅니다.
//   머니 신청은 회원이 한 번에 한 건씩 넣는 단발 사건이라, 기준 시각을 둘 필요 없이
//   그 자리에서 그 건만 보냅니다. 같은 이유로 크론 안전망도 없습니다.
//
// 보내는 곳은 주문 알림과 같습니다 — 웹 푸시(휴대폰·PC)와 카카오 "나에게 보내기".
// 실패해도 신청 처리는 그대로 끝납니다. (알림 때문에 회원의 신청이 막히면 안 됩니다)
import { after } from 'next/server';
import prisma from '@/lib/prisma';
import { getConnection, sendKakaoMemo } from '@/lib/notifications/kakaoMemo';
// 계좌 가리기는 환불 완료 알림톡과 같은 함수를 씁니다. (뒤 4자리만 남김)
import { formatRefundAccount } from '@/lib/notifications/alimtalk';
import { isWebPushConfigured, sendAdminPush } from '@/lib/notifications/webPush';

/** 관리자 미쿠짱머니 화면. 신청을 승인·반려하는 곳입니다. */
const ADMIN_MONEY_PATH = '/admin/refund';
const ADMIN_MONEY_URL = `https://mikushop.co.kr${ADMIN_MONEY_PATH}`;

export type MoneyAlertInput = {
  type: 'CHARGE' | 'REFUND';
  amount: number;
  userName?: string | null;
  /** 충전: 입금자명 */
  depositor?: string | null;
  /** 환불: 계좌 정보 (뒤 4자리만 남겨 보여 줍니다) */
  bankName?: string | null;
  accountNumber?: string | null;
  accountHolder?: string | null;
};

/**
 * 알림 문구를 만듭니다. 첫 줄이 웹 푸시 제목, 나머지가 본문입니다.
 *
 * 한눈에 "무엇을 / 얼마나 / 누가" 가 보여야 합니다. 충전인지 환불인지 헷갈리면
 * 관리자가 화면을 열어 다시 확인해야 하므로, 말머리와 아이콘을 다르게 둡니다.
 */
export function buildAdminMoneyAlert(input: MoneyAlertInput): string {
  const isCharge = input.type === 'CHARGE';
  const won = `${Number(input.amount || 0).toLocaleString('ko-KR')}원`;
  const who = input.userName?.trim() ? `${input.userName.trim()}님` : '회원';

  // 충전은 입금자명이, 환불은 받을 계좌가 관리자가 바로 확인해야 하는 값입니다.
  // ⚠️ 계좌가 비어 있으면 formatRefundAccount 는 고객용 문구('등록하신 환불 계좌')를 돌려줍니다.
  //    관리자 알림에서는 무엇이 비었는지가 보여야 하므로 따로 적습니다.
  const hasAccount = Boolean(input.bankName?.trim() || String(input.accountNumber ?? '').replace(/[^0-9]/g, ''));
  const detail = isCharge
    ? (input.depositor?.trim() ? `입금자 ${input.depositor.trim()}` : '입금자명 없음')
    : (hasAccount ? formatRefundAccount(input) : '계좌 정보 없음');

  return [
    `${isCharge ? '💰' : '💸'} 미쿠짱머니 ${isCharge ? '충전' : '환불'} 신청 ${won}`,
    '',
    `${who} · ${detail}`,
  ].join('\n');
}

/**
 * 신청이 저장된 뒤 호출합니다. 응답을 먼저 보내고(회원은 기다리지 않음) 알림을 돌립니다.
 * 실패는 로그만 남깁니다 — 신청 자체는 이미 저장되어 있습니다.
 */
export function triggerAdminMoneyAlert(input: MoneyAlertInput): void {
  const job = async () => {
    try {
      const text = buildAdminMoneyAlert(input);
      const [title, ...rest] = text.split('\n');

      const conn = await getConnection();
      const kakaoOn = Boolean(conn?.enabled);
      const pushOn = isWebPushConfigured() && (await prisma.adminPushSubscription.count()) > 0;
      if (!kakaoOn && !pushOn) return;

      const [kakao, push] = await Promise.all([
        kakaoOn
          ? sendKakaoMemo(text, { url: ADMIN_MONEY_URL, buttonTitle: '미쿠짱머니 열기' })
          : Promise.resolve({ sent: false, skipped: '카카오 미연결/꺼짐' as string | undefined }),
        pushOn
          ? sendAdminPush({
              title,
              body: rest.filter(Boolean).join('\n'),
              url: ADMIN_MONEY_PATH,
              // 주문 알림과 태그를 나눠, 둘이 서로를 덮어쓰지 않게 합니다.
              tag: 'admin-money-alert',
            })
          : Promise.resolve({ sent: false, sentCount: 0, skipped: '웹 푸시 기기 없음' as string | undefined }),
      ]);

      console.log('[관리자 알림:머니신청]', {
        종류: input.type === 'CHARGE' ? '충전' : '환불',
        금액: input.amount,
        웹푸시: 'sentCount' in push && push.sent ? `${push.sentCount}대` : push.skipped || '실패',
        카카오: kakao.sent ? '발송' : kakao.skipped || '실패',
      });
    } catch (e) {
      console.error('[관리자 알림:머니신청] 실패:', (e as Error).message);
    }
  };

  try {
    after(job);
  } catch {
    // 요청 밖(스크립트 등)에서 불리면 after 를 쓸 수 없어 바로 돌립니다.
    void job();
  }
}
