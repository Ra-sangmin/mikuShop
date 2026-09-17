// 📧 메일 발송 공용 모듈
//
// 발송 수단을 여기 한 곳에만 두는 이유:
//   지금은 네이버 SMTP를 쓰지만, 주문 알림이 하루 수백 건 단위로 늘어나면
//   네이버 계정의 일일 발송 한도에 걸립니다. 그때 AWS SES 등으로 갈아탈 때
//   .env 만 바꾸면 되도록 접속 정보를 환경변수로 뺐습니다.
//   (호출하는 쪽은 sendMail만 알면 됩니다)
//
// 환경변수
//   EMAIL_USER / EMAIL_PASS : SMTP 계정 (필수)
//   SMTP_HOST / SMTP_PORT   : 생략하면 네이버(smtp.naver.com:465)
//   MAIL_DRIVER=json        : 실제로 보내지 않고 성공 처리만 합니다.
//                             로컬 개발·스테이징에서 고객에게 메일이 나가는 사고를 막는 용도입니다.

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  // 요청마다 새로 만들면 SMTP 연결을 매번 여닫게 되므로 한 번 만들어 재사용합니다.
  if (cachedTransporter) return cachedTransporter;

  if (process.env.MAIL_DRIVER === 'json') {
    // 실제 발송 없이 메시지를 JSON으로만 만들어 돌려줍니다 (연결 시도 자체가 없습니다)
    cachedTransporter = nodemailer.createTransport({ jsonTransport: true });
    return cachedTransporter;
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;

  const port = Number(process.env.SMTP_PORT || 465);
  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.naver.com',
    port,
    secure: port === 465, // 465는 SSL, 587은 STARTTLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  return cachedTransporter;
}

/** 목록·상세 화면 등에서 쓸 발신자 표기 */
export function mailFrom(): string {
  return `미쿠짱 <${process.env.EMAIL_USER}>`;
}

// 🌟 SNS 로그인 회원이 이메일 동의를 하지 않으면 `kakao_12345@mikuchan.local` 같은
//    내부용 임시 주소가 저장됩니다. 이런 주소로 보내면 전부 반송되므로 걸러냅니다.
const INTERNAL_EMAIL_DOMAIN = '@mikuchan.local';

/** 실제로 메일을 받을 수 있는 주소인지 (임시 주소·빈 값 제외) */
export function isDeliverableEmail(email?: string | null): boolean {
  if (!email) return false;
  const value = email.trim().toLowerCase();
  if (!value || value.endsWith(INTERNAL_EMAIL_DOMAIN)) return false;
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  /** 생략하면 html에서 태그를 걷어내 자동 생성합니다 */
  text?: string;
}

export interface SendMailResult {
  success: boolean;
  error?: string;
  /** MAIL_DRIVER=json 일 때만 채워집니다. 실제로 보낼 메시지를 확인하는 용도입니다. */
  preview?: string;
}

/**
 * 메일 한 통을 보냅니다.
 * 🌟 실패해도 예외를 던지지 않고 결과 객체로 돌려줍니다.
 *    주문 상태 저장 같은 본 작업이 메일 실패 때문에 롤백되면 안 되기 때문입니다.
 */
export async function sendMail({ to, subject, html, text }: SendMailInput): Promise<SendMailResult> {
  const transporter = getTransporter();
  if (!transporter) {
    return { success: false, error: '메일 발송 환경변수(EMAIL_USER/EMAIL_PASS)가 설정되지 않았습니다.' };
  }
  if (!isDeliverableEmail(to)) {
    return { success: false, error: `발송할 수 없는 주소입니다: ${to}` };
  }

  try {
    const info: any = await transporter.sendMail({
      from: mailFrom(),
      to,
      subject,
      html,
      text: text ?? htmlToText(html),
    });
    if (process.env.MAIL_DRIVER === 'json') {
      console.log(`[MAIL:json] to=${to} / ${subject}`);
      return { success: true, preview: info?.message };
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || String(e) };
  }
}

/** HTML 본문에서 대략적인 평문을 만듭니다 (텍스트 메일함 대비) */
function htmlToText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/\s*(p|div|tr|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
