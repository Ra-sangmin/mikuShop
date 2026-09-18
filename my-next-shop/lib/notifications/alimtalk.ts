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
  /** 검수 통과한 본문. #{변수} 자리를 채워 보냅니다. */
  content: string;
  /** 버튼 이름. 템플릿에 등록한 문구와 같아야 합니다. */
  buttonName: string;
}

/**
 * 상태별 알림톡 템플릿.
 * ⚠️ content 는 카카오 검수를 통과한 본문과 완전히 같아야 합니다. 띄어쓰기 하나만 달라도 거절됩니다.
 *    검수가 끝나면 콘솔의 본문을 그대로 복사해 붙여 넣고 templateId 도 실제 코드로 맞춰 주세요.
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
function authHeader(apiKey: string, apiSecret: string): string {
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
