import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { SANDBOX_ARGS } from './sandbox';

if (!(puppeteer as any).plugins || (puppeteer as any).plugins.length === 0) {
  puppeteer.use(StealthPlugin());
}

// 🚀 mercari/yahoo_auction의 검색·상세 스크래핑이 전부 이 브라우저 인스턴스 하나를 공유합니다.
// 크롤러마다 별도의 Chrome 프로세스를 띄우면 t3.small/medium 같은 제한된 메모리 예산을
// 금방 소진하므로, 탭(Page)만 여러 개 열고 브라우저 프로세스 자체는 하나만 유지합니다.
let sharedBrowser: any = null;

const LAUNCH_ARGS = [
  // 🔒 샌드박스는 기본으로 켭니다. 끄려면 PUPPETEER_DISABLE_SANDBOX=1 (lib/crawler/sandbox.ts 참고)
  ...SANDBOX_ARGS,
  '--disable-dev-shm-usage',
  '--disable-blink-features=AutomationControlled',
  // 🌟 크롬 경량화 옵션 (렌더링에 불필요한 기능 끄기)
  '--disable-accelerated-2d-canvas',
  '--disable-gpu',
  '--disable-extensions',
  '--blink-settings=imagesEnabled=false',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
];

// 🐛 UA 의 크롬 버전(122)이 실제 번들 크롬(152)보다 한참 낮아 메루카리가 "お使いのブラウザが対応していない"
//    (미지원 브라우저) 배너를 띄우는 축소 모드로 응답했습니다. 실제 버전에 맞춥니다.
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36';

// 🌟 이미지/폰트/미디어 + 광고·트래킹 스크립트를 공통으로 차단합니다.
//
// 🐛 예전에는 stylesheet(CSS)도 차단했는데, 그러면 메루카리에서 상품이 "한 개도" 안 잡혔습니다.
//    메루카리 검색 화면은 CSS 로 잡힌 레이아웃을 기준으로 상품 그리드를 지연 렌더링(lazy-load)해서,
//    CSS 가 없으면 그리드 높이가 0 이 되고 "화면에 안 보인다"고 판단해 영영 그리지 않습니다.
//    (문서 높이 실측: 정상 15000px+ vs CSS 차단 시 6140px)
//
//    운영 서버에서 확인한 결과 (jp.mercari.com/search?category_id=2634, 20초 대기):
//      image+font+media+stylesheet 차단 → 0개
//      image+font+media 차단 (CSS 허용) → 10초에 120개 ✅
//      URL 패턴만 해제하고 CSS 는 계속 차단 → 0개 (URL 패턴은 무관)
//    → CSS 만 허용하면 대역폭 절감(이미지 차단)은 그대로 두고 문제가 해결됩니다.
//    야후옥션은 CSS 를 차단해도 잘 동작하지만, 허용해도 영향이 없어 공통 규칙으로 둡니다.
const BLOCKED_RESOURCE_TYPES = ['image', 'font', 'media'];
const BLOCKED_URL_PATTERNS = ['google-analytics', 'facebook', 'ad-delivery', 'sentry.io', 'karte'];

export function shouldBlockRequest(resourceType: string, url: string): boolean {
  return (
    BLOCKED_RESOURCE_TYPES.includes(resourceType) ||
    BLOCKED_URL_PATTERNS.some(pattern => url.includes(pattern))
  );
}

export async function getSharedBrowser(): Promise<any> {
  if (!sharedBrowser || !sharedBrowser.connected) {
    sharedBrowser = await puppeteer.launch({ headless: true, args: LAUNCH_ARGS });
  }
  return sharedBrowser;
}

interface CreatePageOptions {
  viewport?: { width: number; height: number };
  userAgent?: string;
  blockResources?: boolean;
}

// 🚀 공유 브라우저에서 새 탭을 열고, 뷰포트/유저에이전트/리소스 차단까지 공통으로 세팅합니다.
// 🌟 viewport를 명시적으로 넘기지 않으면 건드리지 않습니다 (Puppeteer 기본값 800x600 유지).
// 상품 상세 스크래핑은 원래 뷰포트를 지정한 적이 없는데, 여기서 임의로 1280x1080을 강제하면
// 반응형 레이아웃이 바뀌어 기존에 맞춰둔 선택자가 깨질 위험이 있습니다.
export async function createPage(options: CreatePageOptions = {}): Promise<any> {
  const browser = await getSharedBrowser();
  const page = await browser.newPage();

  if (options.viewport) {
    await page.setViewport(options.viewport);
  }
  await page.setUserAgent(options.userAgent ?? DEFAULT_USER_AGENT);

  if (options.blockResources !== false) {
    await page.setRequestInterception(true);
    page.on('request', (req: any) => {
      if (shouldBlockRequest(req.resourceType(), req.url())) {
        if (!req.isInterceptResolutionHandled()) req.abort();
      } else {
        if (!req.isInterceptResolutionHandled()) req.continue();
      }
    });
  }

  return page;
}
