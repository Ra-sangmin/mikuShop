// 🔒 손님이 붙여넣은 주소를 서버가 대신 읽을 때 쓰는 안전한 fetch
//
// 구매대행은 "아무 일본 쇼핑몰 주소나" 받아야 합니다. 홈 화면만 봐도 아미아미·조조타운·
// 빔스·스루가야·반다이·애니메이트·토라노아나로 링크가 나가 있고, 손님은 그 어디서든
// 주소를 가져옵니다. 그래서 다른 크롤러들처럼 도메인 허용 목록을 둘 수 없습니다.
//
// 대신 막아야 할 것은 **바깥이 아니라 안쪽**입니다. 주소를 그대로 열어 주면
// 서버가 자기 내부망을 대신 두드려 주는 통로가 됩니다(SSRF).
//   http://169.254.169.254/…  EC2 인스턴스 메타데이터 (IAM 자격증명)
//   http://127.0.0.1:3000/…   서버 자신의 비공개 화면
//   http://10.0.x.x/…         같은 VPC 안의 다른 서비스
// 그래서 호스트를 **실제 IP 로 풀어 보고** 사설·루프백 대역이면 거절합니다.
//
// 리디렉션도 한 번에 하나씩 직접 따라갑니다. fetch 기본값은 자동으로 따라가는데,
// 겉은 멀쩡한 주소가 302 로 169.254.169.254 를 가리키면 검사를 통과해 버립니다.

import { lookup } from 'dns/promises';
import { isIP } from 'net';

/** 바깥에서 오는 주소가 가리켜서는 안 되는 IP 대역. */
function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v6 = ip.toLowerCase();
    // ::1(루프백), fc00::/7(유니크 로컬), fe80::/10(링크 로컬)
    if (v6 === '::1' || v6 === '::') return true;
    if (/^f[cd]/.test(v6)) return true;
    if (/^fe[89ab]/.test(v6)) return true;
    // ::ffff:10.0.0.1 처럼 IPv4 를 품은 형태는 뒤쪽을 다시 봅니다.
    const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
    return mapped ? isPrivateAddress(mapped) : false;
  }

  const [a, b] = ip.split('.').map(Number);
  return (
    a === 0 ||                          // 0.0.0.0/8
    a === 10 ||                         // 사설
    a === 127 ||                        // 루프백
    (a === 169 && b === 254) ||         // 링크 로컬 — 클라우드 메타데이터가 여기 있습니다
    (a === 172 && b >= 16 && b <= 31) || // 사설
    (a === 192 && b === 168) ||         // 사설
    (a === 100 && b >= 64 && b <= 127) || // 캐리어 등급 NAT
    a >= 224                            // 멀티캐스트·예약
  );
}

/** 주소가 공개 인터넷을 가리키는지 확인합니다. 아니면 이유를 담아 예외를 던집니다. */
async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('주소 형식이 올바르지 않습니다.');
  }

  // file:, data:, ftp: 등은 쇼핑몰 주소일 수 없습니다.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('http 또는 https 주소만 열 수 있습니다.');
  }

  // 호스트가 이미 IP 로 적혀 있으면 그대로, 아니면 DNS 로 풀어서 봅니다.
  // 공격자가 자기 도메인을 사설 IP 로 가리켜 두는 수법(DNS rebinding)을 막습니다.
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(host)
    ? [host]
    : (await lookup(host, { all: true })).map(a => a.address);

  if (addresses.length === 0) throw new Error('주소를 찾을 수 없습니다.');
  // 하나라도 내부 대역을 가리키면 거절합니다.
  if (addresses.some(isPrivateAddress)) throw new Error('내부 주소는 열 수 없습니다.');

  return url;
}

const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'ja-JP,ja;q=0.9,ko-KR;q=0.8,en;q=0.7',
};

/** 한 요청이 쫓아갈 리디렉션 횟수. 쇼핑몰은 보통 1~2번이면 충분합니다. */
const MAX_REDIRECTS = 4;

/**
 * 공개 주소만 읽는 fetch. 리디렉션은 한 칸씩 직접 따라가며 매번 다시 검사합니다.
 * 실패하면 예외를 던집니다. (호출부가 손님에게 보여줄 문구를 정합니다)
 */
export async function safeFetch(rawUrl: string, timeoutMs = 12_000): Promise<Response> {
  let target = rawUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await assertPublicUrl(target);

    const res = await fetch(url, {
      headers: DEFAULT_HEADERS,
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });

    // 300번대이면서 Location 이 있으면 다음 칸으로. 없으면 그대로 돌려줍니다.
    const location = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null;
    if (!location) return res;

    // 상대 경로로 오는 경우가 많아 현재 주소 기준으로 풉니다.
    target = new URL(location, url).toString();
  }

  throw new Error('리디렉션이 너무 많습니다.');
}
