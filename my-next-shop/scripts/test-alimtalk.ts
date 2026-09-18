// 💬 알림톡 발송 점검 스크립트
//
// 관리자 화면에서 주문 상태를 바꾸지 않고도, 알림톡이 나갈 준비가 됐는지 단계별로 확인합니다.
// 주문 상태를 실제로 바꾸면 되돌리기 번거롭고 NotificationLog 에 이력이 남아 재시험이 막힙니다.
//
// 실행
//   npx tsx scripts/test-alimtalk.ts 01012345678            보낼 내용만 만들어 보여줍니다 (발송 안 함)
//   npx tsx scripts/test-alimtalk.ts 01012345678 --send     실제로 한 통 보냅니다 (건당 비용 발생)
//   npx tsx scripts/test-alimtalk.ts 01012345678 --status=BID_SUCCESS   다른 템플릿으로
//
// ⚠️ --send 는 실제 카카오톡이 나가고 잔액이 차감됩니다. 받는 번호를 꼭 확인하세요.
// ⚠️ API Key 는 등록한 IP 에서만 동작합니다. 로컬에서 401/403 이 나면 IP 제한부터 보세요.

import 'dotenv/config';
import {
  ALIMTALK_TEMPLATES,
  buildAlimtalkPayload,
  fillTemplate,
  isAlimtalkConfigured,
  maskPhone,
  missingSolapiEnv,
  sendAlimtalk,
} from '../lib/notifications/alimtalk';
import { formatKoreanMobile, normalizeKoreanMobile } from '../lib/phone';

const args = process.argv.slice(2);
const shouldSend = args.includes('--send');
const status = (args.find(a => a.startsWith('--status='))?.split('=')[1] || 'BID_SUCCESS').toUpperCase();
const rawPhone = args.find(a => !a.startsWith('--'));

// 버튼 주소는 템플릿에 등록한 도메인이어야 합니다. localhost 는 카카오가 거절하므로 쓰지 않습니다.
const siteUrl = (process.env.NEXTAUTH_URL || '').replace(/\/+$/, '');
const buttonBase = siteUrl && !siteUrl.includes('localhost') ? siteUrl : 'https://mikushop.co.kr';

function line(label: string, value: string) {
  console.log(`  ${label.padEnd(16)} ${value}`);
}

async function main() {
  console.log('\n===== 1. 환경변수 =====');
  const missing = missingSolapiEnv();
  line('필수 3개', missing.length === 0 ? '✅ 모두 있음' : `❌ 빠짐: ${missing.join(', ')}`);
  line('SOLAPI_SENDER', process.env.SOLAPI_SENDER ? '있음 (문자 대체발송 켜짐)' : '없음 (알림톡만 발송 — 정상)');
  line('발송 가능 여부', isAlimtalkConfigured() ? '✅ 가능' : '❌ 불가 — 위 빠진 값을 채우세요');
  if (!isAlimtalkConfigured()) process.exit(1);

  console.log('\n===== 2. 템플릿 =====');
  const template = ALIMTALK_TEMPLATES[status];
  if (!template) {
    console.log(`  ❌ ${status} 상태에 등록된 템플릿이 없습니다.`);
    console.log(`     쓸 수 있는 상태: ${Object.keys(ALIMTALK_TEMPLATES).join(', ')}`);
    process.exit(1);
  }
  line('상태', status);
  line('템플릿 코드', template.templateId);
  line('버튼 이름', template.buttonName);
  console.log('\n  --- 본문 (카카오 검수 통과본과 글자 단위로 같아야 합니다) ---');

  // 실제 주문 대신 눈에 띄는 예시값을 넣습니다. 변수가 안 채워지면 #{...} 가 그대로 남습니다.
  const variables: Record<string, string> = {
    고객명: '홍길동',
    주문번호: 'M260918-a3f9',
    상품명: '테스트 상품',
    낙찰금액: '12,345원',
  };
  console.log(fillTemplate(template.content, variables).split('\n').map(l => `  | ${l}`).join('\n'));

  console.log('\n===== 3. 받는 번호 =====');
  if (!rawPhone) {
    console.log('  ❌ 번호를 인자로 넣어 주세요. 예) npx tsx scripts/test-alimtalk.ts 01012345678');
    process.exit(1);
  }
  const phone = formatKoreanMobile(rawPhone);
  line('입력값', rawPhone);
  line('정리된 값', phone ?? '❌ 국내 휴대폰 형식이 아닙니다');
  if (!phone) process.exit(1);

  console.log('\n===== 4. 솔라피에 보낼 내용 =====');
  const payload = buildAlimtalkPayload({
    // sendAlimtalk 이 하이픈을 떼고 보내므로, 미리보기도 실제 나가는 값과 같게 맞춥니다.
    to: normalizeKoreanMobile(phone) as string,
    from: process.env.SOLAPI_SENDER || null,
    pfId: process.env.SOLAPI_PFID as string,
    template,
    variables: Object.fromEntries(Object.entries(variables).map(([k, v]) => [`#{${k}}`, v])),
    buttonUrl: `${buttonBase}/mypage/status?orderId=M260918-a3f9`,
  });
  console.log(JSON.stringify(payload, null, 2).split('\n').map(l => `  ${l}`).join('\n'));

  if (!shouldSend) {
    console.log('\n===== 5. 발송 =====');
    console.log('  건너뜀 (실제로 보내려면 --send 를 붙이세요)\n');
    return;
  }

  console.log(`\n===== 5. 발송 (${maskPhone(phone)}) =====`);
  const result = await sendAlimtalk({
    to: phone,
    template,
    variables: Object.fromEntries(Object.entries(variables).map(([k, v]) => [`#{${k}}`, v])),
    buttonUrl: `${buttonBase}/mypage/status?orderId=M260918-a3f9`,
  });
  console.log('\n  결과:', result.success ? '✅ 성공' : result.skipped ? `⏭️ 건너뜀 — ${result.error}` : `❌ 실패 — ${result.error}`);
  console.log('');
}

main().catch(e => {
  console.error('\n예상치 못한 오류:', e);
  process.exit(1);
});
