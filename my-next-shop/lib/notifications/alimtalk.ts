// 💬 카카오 알림톡 발송 (대행사: 솔라피 Solapi)
//
// 설계
//  - 발송 수단을 이 파일 한 곳에만 둡니다. 대행사를 바꾸면 sendViaSolapi 만 갈아끼우면 됩니다.
//  - 템플릿 문구는 카카오 검수를 통과한 내용과 글자 하나까지 같아야 합니다. 다르면 발송이 거절됩니다.
//    그래서 본문은 TEMPLATES 에 그대로 적어 두고, 변수만 채워 보냅니다.
//  - 실패해도 예외를 던지지 않습니다. 알림 때문에 주문 처리가 막히면 안 됩니다.
//
// 필요한 환경변수 (.env)
//   SOLAPI_API_KEY        솔라피 API 키          (필수)
//   SOLAPI_API_SECRET     솔라피 API 시크릿      (필수)
//   SOLAPI_PFID           카카오 발신 프로필 ID   (필수 - 채널 연동 후 발급)
//   위 셋 중 하나라도 없으면 발송하지 않고 건너뜁니다. (개발 환경에서 실수로 나가지 않도록)
//
//   SOLAPI_SENDER         문자 대체발송에 쓸 발신번호 (선택)
//   🌟 알림톡 자체는 발신번호가 필요 없습니다. 카카오 채널(pfId)이 발신번호 역할을 합니다.
//      발신번호 사전등록제는 문자(SMS)에 적용되는 의무라, 등록 없이도 알림톡은 나갑니다.
//      이 값이 있으면 알림톡 실패 시 문자로 대체 발송하고, 없으면 알림톡만 보냅니다.

import { createHmac, randomBytes } from 'crypto';
import { normalizeKoreanMobile } from '@/lib/phone';

const SOLAPI_ENDPOINT = 'https://api.solapi.com/messages/v4/send';

export interface AlimtalkResult {
  success: boolean;
  skipped?: boolean;
  error?: string;
}

// ---------------------------------------------------------------- 템플릿

export interface AlimtalkTemplate {
  /** 카카오에서 발급한 템플릿 코드 (검수 통과 후 콘솔에 표시됩니다) */
  templateId: string;
  /**
   * 검수 통과한 본문. **솔라피로 전송되지 않습니다.**
   * 본문은 카카오가 templateId 로 찾아 채우므로, 이 값은 사람이 눈으로 대조하고
   * scripts/test-alimtalk.ts 가 미리보기를 찍는 용도로만 씁니다. 비어 있어도 발송은 됩니다.
   */
  content: string;
  /** 버튼 이름. 템플릿에 등록한 문구와 같아야 합니다. (이건 실제로 전송됩니다) */
  buttonName: string;
}

/**
 * 상태별 알림톡 템플릿. 여기에 한 줄 추가하면 그 상태의 알림톡이 자동으로 켜집니다.
 * (orderStatusAlimtalk.ts 의 ALIMTALK_STATUSES 가 이 객체의 키를 그대로 씁니다)
 *
 * ⚠️ 실제로 전송돼서 카카오가 대조하는 값은 **templateId · 변수 이름 · 버튼** 세 가지입니다.
 *    - 변수 이름(#{고객명} 등)이 등록된 템플릿과 다르면 거절됩니다.
 *      채워 넣는 곳은 orderStatusAlimtalk.ts 의 buildVariables() 입니다.
 *    - 버튼 이름도 등록한 문구와 같아야 합니다.
 *    content 는 위 주석대로 전송되지 않으니 대조용으로만 관리하세요.
 */
export const ALIMTALK_TEMPLATES: Record<string, AlimtalkTemplate> = {
  BID_SUCCESS: {
    // 카카오 비즈메시지에 등록된 템플릿 코드. 검수 후 코드가 바뀌면 .env 로 덮어씁니다.
    templateId: process.env.SOLAPI_TEMPLATE_BID_SUCCESS || 'KA01TP2609180544155550SkWxW52pa9',
    content: [
      '[미쿠짱] 상품 낙찰 안내',
      '',
      '#{고객명}님, 참여하신 경매에 성공적으로 낙찰되었음을 안내해 드립니다.',
      '',
      '▪ 주문번호 : #{주문번호}',
      '▪ 상품명 : #{상품명}',
      '▪ 낙찰금액 : #{낙찰금액}',
      '',
      '신속하고 안전한 현지 상품 인수를 위해 다음 단계를 진행해 주시기 바랍니다.',
      '하단의 버튼을 클릭하시면 해당 주문의 상세 페이지로 이동하여 이어서 처리하실 수 있습니다.',
    ].join('\n'),
    buttonName: '주문 상세 확인',
  },

  // 🏬 일본 물류센터 입고 안내
  ARRIVED: {
    templateId: process.env.SOLAPI_TEMPLATE_ARRIVED || 'KA01TP260920161318452jbXB7KXuwqS',
    content: [
      '[미쿠짱] 일본 물류센터 입고 안내',
      '',
      '#{고객명}님, 주문하신 상품이 일본 현지 물류센터에 안전하게 입고되었습니다.',
      '',
      '▪ 주문번호 : #{주문번호}',
      '▪ 상품명 : #{상품명}',
      '',
      '여러 상품을 함께 배송받으시면 국제 배송비를 절감하실 수 있습니다.',
      '묶음 배송을 원하시는 경우, 배송 요청 전 마이페이지에서 설정해 주시기 바랍니다.',
    ].join('\n'),
    buttonName: '입고 상품 확인하기',
  },

  // 🧾 국제 배송 진행 안내 — 배송비가 산정되어 "승인(결제)"을 요청하는 단계입니다.
  //    ⚠️ 배송비 결제 완료(PAYMENT_DONE)가 아니라 요청(PAYMENT_REQ) 시점입니다.
  //       본문의 "승인을 완료해 주시기 바랍니다" 가 아직 결제 전임을 가리킵니다.
  PAYMENT_REQ: {
    templateId: process.env.SOLAPI_TEMPLATE_PAYMENT_REQ || 'KA01TP260920161606939QfkdB9VmVCe',
    content: [
      '[미쿠짱] 국제 배송 진행 안내',
      '',
      '#{고객명}님, 입고 완료된 상품의 국제 배송비 측정이 완료되어 다음 단계 진행을 안내해 드립니다.',
      '',
      '▪ 주문번호 : #{주문번호}',
      '▪ 상품명 : #{상품명}',
      // ⚠️ 본문에 '원' 이 이미 붙어 있습니다. 변수 값에는 숫자만 넣어야 "12,345원원" 이 되지 않습니다.
      '▪ 발생비용 : #{결제금액}원',
      '',
      '배송 단계가 승인되는 대로 한국으로의 국제 배송이 즉시 시작됩니다.',
      '진행 전까지는 현지 물류센터에 안전하게 보관되오니, 하단 버튼을 통해 배송 상세 내역을 확인하시고 승인을 완료해 주시기 바랍니다.',
    ].join('\n'),
    buttonName: '배송 승인하기',
  },

  // 🚚 국제 배송 시작 안내
  SHIPPING: {
    templateId: process.env.SOLAPI_TEMPLATE_SHIPPING || 'KA01TP260920161702253korkvcMnfls',
    content: [
      '[미쿠짱] 국제 배송 시작 안내',
      '',
      '#{고객명}님, 주문하신 상품이 한국을 향해 성공적으로 발송되었습니다.',
      '',
      '▪ 주문번호 : #{주문번호}',
      '▪ 상품명 : #{상품명}',
      '▪ 배송업체 : #{배송업체}',
      '▪ 송장번호 : #{송장번호}',
      '',
      '세관 통관 절차를 거친 후 등록하신 주소로 안전하게 배송될 예정입니다.',
      '통관 상황에 따라 수령일까지 며칠이 더 소요될 수 있는 점 양해 부탁드립니다.',
    ].join('\n'),
    buttonName: '배송 조회하기',
  },
};

/** 본문의 #{변수} 를 실제 값으로 채웁니다. 채우지 못한 변수가 있으면 알려 줍니다. */
export function fillTemplate(content: string, variables: Record<string, string>): string {
  return content.replace(/#\{([^}]+)\}/g, (whole, key: string) => {
    const value = variables[key.trim()];
    if (value === undefined) {
      console.warn(`[알림톡] 템플릿 변수 #{${key}} 값이 없어 그대로 둡니다.`);
      return whole;
    }
    return value;
  });
}

// ---------------------------------------------------------------- 전화번호

/**
 * 알림톡에 쓸 수 있는 번호인지 확인하고 숫자만 남깁니다.
 * 국내 휴대폰(010/011/016/017/018/019)만 받습니다. 잘못된 번호로 보내면 건당 비용만 나갑니다.
 * (가입할 때 번호를 정리하는 규칙과 어긋나면 안 되므로 lib/phone.ts의 함수를 그대로 씁니다)
 */
export const normalizePhone = normalizeKoreanMobile;

// ---------------------------------------------------------------- 발송

function solapiConfig() {
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const pfId = process.env.SOLAPI_PFID;
  if (!apiKey || !apiSecret || !pfId) return null;
  // 발신번호는 문자 대체발송용이라 없어도 알림톡은 보냅니다. (위 헤더 주석 참고)
  const sender = process.env.SOLAPI_SENDER || null;
  return { apiKey, apiSecret, pfId, sender };
}

/** 설정이 없을 때 "무엇이 없는지" 바로 알 수 있게 빠진 환경변수 이름만 돌려줍니다. (값은 절대 찍지 않습니다) */
export function missingSolapiEnv(): string[] {
  return ['SOLAPI_API_KEY', 'SOLAPI_API_SECRET', 'SOLAPI_PFID']
    .filter(name => !process.env[name]);
}

/** 로그에 남길 번호. 개인정보라 가운데를 가립니다. (01012345678 → 010****5678) */
export function maskPhone(raw: string | null | undefined): string {
  const digits = String(raw ?? '').replace(/[^0-9]/g, '');
  if (digits.length < 8) return '(번호없음)';
  return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
}

/** 솔라피는 HMAC-SHA256 서명을 Authorization 헤더에 담습니다. */
export function authHeader(apiKey: string, apiSecret: string): string {
  const date = new Date().toISOString();
  const salt = randomBytes(32).toString('hex');
  const signature = createHmac('sha256', apiSecret).update(date + salt).digest('hex');
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

export interface SendAlimtalkParams {
  to: string;
  template: AlimtalkTemplate;
  variables: Record<string, string>;
  /** 버튼이 열 주소 (템플릿에 등록한 도메인이어야 합니다) */
  buttonUrl: string;
  /** true 면 실제로 보내지 않고 보낼 내용만 만들어 봅니다 (검증·테스트용) */
  dryRun?: boolean;
}

/**
 * 솔라피에 보낼 본문을 만듭니다. 발송과 분리해 둔 이유는, 건당 비용이 드는 기능이라
 * 실제로 쏘지 않고도 무엇이 나가는지 확인할 수 있어야 하기 때문입니다.
 */
export function buildAlimtalkPayload(params: {
  to: string;
  /** 문자 대체발송용 발신번호. 없으면 넣지 않습니다 (알림톡만 나갑니다). */
  from?: string | null;
  pfId: string;
  template: AlimtalkTemplate;
  variables: Record<string, string>;
  buttonUrl: string;
}) {
  return {
    message: {
      to: params.to,
      // 등록된 발신번호가 없으면 from 자체를 빼야 합니다. 빈 문자열을 보내면 솔라피가 거절합니다.
      ...(params.from ? { from: params.from } : {}),
      type: 'ATA', // 알림톡
      kakaoOptions: {
        pfId: params.pfId,
        templateId: params.template.templateId,
        // 검수 통과한 본문에 변수를 채운 결과. 대행사가 템플릿과 대조합니다.
        variables: params.variables,
        buttons: [
          {
            buttonName: params.template.buttonName,
            buttonType: 'WL', // 웹링크
            linkMo: params.buttonUrl,
            linkPc: params.buttonUrl,
          },
        ],
      },
    },
  };
}

/**
 * 알림톡 한 건을 보냅니다.
 * 설정이 없으면 보내지 않고 skipped 로 돌려줍니다 (개발 환경에서 실수로 나가지 않도록).
 */
export async function sendAlimtalk(params: SendAlimtalkParams): Promise<AlimtalkResult> {
  const config = solapiConfig();
  if (!config) {
    console.warn('[알림톡] SOLAPI_* 환경변수가 없어 발송을 건너뜁니다. 빠진 값:', missingSolapiEnv().join(', '));
    return { success: false, skipped: true, error: 'SOLAPI 설정 없음' };
  }

  const to = normalizePhone(params.to);
  if (!to) {
    console.warn(`[알림톡] 보낼 수 있는 번호가 아니라 건너뜁니다. (입력값: ${maskPhone(params.to)})`);
    return { success: false, skipped: true, error: '보낼 수 있는 휴대폰 번호가 아닙니다.' };
  }

  const body = buildAlimtalkPayload({
    to,
    from: config.sender,
    pfId: config.pfId,
    template: params.template,
    variables: params.variables,
    buttonUrl: params.buttonUrl,
  });

  // 검증용: 실제로 쏘지 않고 무엇이 나가는지만 확인합니다.
  if (params.dryRun) {
    console.log('[알림톡] dryRun — 보낼 내용:', JSON.stringify(body));
    return { success: true, skipped: true, error: 'dryRun' };
  }

  // 📋 실제로 무엇을 어디로 보내는지 남깁니다. 안 왔을 때 "요청이 나가긴 했는지"부터 갈라야 합니다.
  //    (API 키·시크릿은 찍지 않고, 번호는 가운데를 가립니다)
  console.log('[알림톡] 발송 요청', {
    to: maskPhone(to),
    // 발신번호가 없으면 문자 대체발송만 못 할 뿐, 알림톡은 그대로 나갑니다.
    from: config.sender ? maskPhone(config.sender) : '(없음 - 문자 대체발송 안 함)',
    pfId: config.pfId,
    templateId: params.template.templateId,
    변수: params.variables,
    버튼주소: params.buttonUrl,
  });

  try {
    const startedAt = Date.now();
    const res = await fetch(SOLAPI_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: authHeader(config.apiKey, config.apiSecret),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const json: any = await res.json().catch(() => null);

    // 솔라피는 실패해도 200 을 주는 경우가 있어 본문의 statusCode 까지 봅니다.
    const statusCode = json?.statusCode ?? json?.groupInfo?.status;
    const ok = res.ok && (statusCode === undefined || String(statusCode) === '2000');

    // 📋 솔라피 응답을 통째로 남깁니다. 템플릿 불일치·발신번호 미등록 같은 실제 사유가 여기에만 나옵니다.
    console.log(`[알림톡] 솔라피 응답 (HTTP ${res.status}, ${Date.now() - startedAt}ms, ${ok ? '성공' : '실패'}):`,
      JSON.stringify(json));

    if (!ok) {
      const reason = json?.errorMessage || json?.statusMessage || `HTTP ${res.status}`;
      return { success: false, error: String(reason).slice(0, 500) };
    }
    return { success: true };
  } catch (e) {
    console.error('[알림톡] 솔라피 호출 자체가 실패했습니다:', e);
    return { success: false, error: (e as Error).message.slice(0, 500) };
  }
}

/** 알림톡을 쓸 수 있는 설정인지 (호출하는 쪽에서 미리 판단할 때) */
export function isAlimtalkConfigured(): boolean {
  return solapiConfig() !== null;
}
