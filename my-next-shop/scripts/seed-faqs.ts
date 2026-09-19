// ❓ 자주하는 질문 초기 데이터 넣기
//
// faqs 테이블은 비어 있는 상태로 만들어지므로 /inquiry/faq 화면이 텅 비어 보입니다.
// 그 화면이 동작하는지 확인하고, 관리자가 고칠 출발점을 주기 위한 초기 문구입니다.
//
// ⚠️ 아래 답변은 임시 문구입니다. 실제 정책(수수료·소요일·관세 기준)은 다를 수 있으니
//    관리자 > 고객 센터에서 확인하고 고쳐 주세요.
//
// 실행
//   npx tsx scripts/seed-faqs.ts --dry   넣지 않고 무엇이 들어갈지만 보여줍니다
//   npx tsx scripts/seed-faqs.ts         실제로 넣습니다
//
// 같은 질문이 이미 있으면 건너뜁니다. 여러 번 실행해도 중복으로 쌓이지 않습니다.
// 이미 들어간 답변을 이 파일로 덮어쓰지도 않습니다 (관리자가 고친 내용을 되돌리면 안 되므로).

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const isDryRun = process.argv.includes('--dry');

const FAQS: { question: string; answer: string }[] = [
  {
    question: '구매대행과 배송대행은 어떻게 다른가요?',
    answer:
      '구매대행은 미쿠짱이 고객님 대신 일본 사이트에서 상품을 구매해 보내드리는 서비스입니다. ' +
      '배송대행은 고객님이 직접 구매하신 상품을 일본 물류센터로 받아 한국으로 보내드리는 서비스입니다. ' +
      '일본 사이트 가입이나 결제가 어려우시면 구매대행을, 이미 주문을 마치셨다면 배송대행을 이용해 주세요.',
  },
  {
    question: '배송기간은 얼마나 걸리나요?',
    answer:
      '평균적으로 현지 배송 2~3일, 국제 배송 3~5일 정도 소요됩니다. ' +
      '경매 상품은 낙찰 이후부터 계산되며, 연휴나 통관 상황에 따라 며칠 더 걸릴 수 있습니다.',
  },
  {
    question: '배송비는 어떻게 계산되나요?',
    answer:
      '상품의 무게와 부피 중 큰 것을 기준으로 배송비가 책정됩니다. ' +
      '일본 물류센터에 상품이 입고된 뒤 실측해서 안내드리므로, 주문 시점에는 정확한 금액이 나오지 않습니다.',
  },
  {
    question: '여러 상품을 한 번에 받을 수 있나요?',
    answer:
      '네, 묶음 배송을 이용하시면 국제 배송비를 아끼실 수 있습니다. ' +
      '상품이 모두 일본 물류센터에 입고된 뒤, 배송 요청 전에 마이페이지에서 묶음 배송을 설정해 주세요. ' +
      '이미 발송된 상품은 묶을 수 없습니다.',
  },
  {
    question: '개인통관고유부호는 왜 필요한가요?',
    answer:
      '해외에서 들어오는 물품을 통관할 때 관세청이 요구하는 번호입니다. ' +
      '등록되어 있지 않으면 통관이 지연되거나 반송될 수 있으니, 마이페이지 > 내 정보에서 미리 등록해 주세요. ' +
      '관세청 홈페이지에서 무료로 발급받으실 수 있습니다.',
  },
  {
    question: '주문 진행 상황은 어디에서 확인하나요?',
    answer:
      '마이페이지 > 주문 현황에서 단계별로 확인하실 수 있습니다. ' +
      '낙찰, 물류센터 입고, 국제 배송 시작 같은 주요 단계는 카카오톡 알림톡과 이메일로도 안내해 드립니다. ' +
      '알림을 받지 못하셨다면 가입하신 휴대폰 번호와 이메일이 정확한지 확인해 주세요.',
  },
  {
    question: '미쿠짱머니는 무엇인가요?',
    answer:
      '미쿠짱에서 상품 대금과 배송비를 결제할 때 쓰는 충전식 예치금입니다. ' +
      '마이페이지 > 미쿠짱머니에서 충전하고 사용 내역을 확인하실 수 있습니다.',
  },
  {
    question: '경매에서 낙찰되지 않으면 어떻게 되나요?',
    answer:
      '입찰에 실패하면 결제하신 금액은 미쿠짱머니로 환급해 드립니다. ' +
      '별도로 신청하지 않으셔도 되며, 환급 내역은 마이페이지 > 미쿠짱머니에서 확인하실 수 있습니다.',
  },
];

async function main() {
  const existing = await prisma.faq.findMany({ select: { question: true, sortOrder: true } });
  const existingQuestions = new Set(existing.map(f => f.question.trim()));
  // 이미 쓰고 있는 순서값 뒤에 이어 붙입니다.
  let nextOrder = existing.reduce((max, f) => Math.max(max, f.sortOrder), 0);

  const toInsert = FAQS.filter(f => !existingQuestions.has(f.question));
  const skipped = FAQS.length - toInsert.length;

  console.log(`\n기존 ${existing.length}건 / 넣을 것 ${toInsert.length}건 / 이미 있어 건너뜀 ${skipped}건`);

  if (toInsert.length === 0) {
    console.log('새로 넣을 질문이 없습니다.\n');
    return;
  }

  for (const faq of toInsert) {
    nextOrder += 1;
    console.log(`  ${isDryRun ? '[dry]' : '[넣음]'} ${nextOrder}. ${faq.question}`);
    if (!isDryRun) {
      await prisma.faq.create({ data: { ...faq, sortOrder: nextOrder } });
    }
  }

  console.log(isDryRun ? '\n--dry 라서 실제로 넣지 않았습니다.\n' : '\n완료했습니다.\n');
}

main()
  .catch(e => { console.error('실패:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
