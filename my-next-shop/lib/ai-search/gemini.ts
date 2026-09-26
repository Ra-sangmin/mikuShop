// 🤖 Gemini API 호출 — AI 검색에서 Gemini 를 부르는 유일한 곳
//
// SDK 없이 REST(fetch) 로 부릅니다. 의존성이 늘지 않고, 429 를 상태 코드로 바로 판별할 수 있습니다.
//
// ⚠️ 모델 이름은 .env 로 뺐습니다. Google 은 모델을 자주 은퇴시킵니다.
//    - gemini-1.5-flash 는 이미 종료됐고, text-embedding-004 도 2026-01-14 에 종료됐습니다.
//    - 🐛 gemini-2.5-flash-lite 도 2026-09 기준 "새 사용자에게는 제공하지 않음"(404) 이 됐습니다.
//    - 기본값: 대화/분석 = gemini-3.5-flash-lite, 임베딩 = gemini-embedding-001
//    모델이 또 바뀌면 GEMINI_CHAT_MODEL / GEMINI_EMBED_MODEL 만 고치면 됩니다.
//    그 전에라도 Google 이 404 에 "use models/XXX" 로 대체 모델을 알려 주면, 서버가 그 모델로
//    바꿔 한 번 다시 시도합니다 (로그에 경고가 남으니 보고 .env 를 고쳐 주세요).
//
// 🛡️ 무료 티어 보호 장치 3겹
//   1) 로컬 한도계: 분당 호출 수를 서버가 먼저 세서, 한도에 닿으면 Google 에 보내지도 않고 바로
//      GeminiRateLimitError 를 던집니다. (429 를 맞고 나서 우회하는 것보다 빠르고 할당량도 안 씁니다)
//   2) 429 차단기: 실제로 429 를 받으면 Google 이 알려준 retryDelay(없으면 60초) 동안은
//      호출을 아예 막습니다. 한도가 찬 상태에서 요청마다 429 를 또 맞으며 시간 낭비하지 않도록.
//   3) 타임아웃: 응답이 늦으면(기본 8초) 끊고 폴백으로 넘어갑니다.

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/** 지금 쓰는 모델. 404 로 은퇴 통보를 받으면 Google 이 권한 모델로 바뀝니다 (프로세스 메모리 안에서만). */
const activeModel: Record<'chat' | 'embed', string> = {
  chat: process.env.GEMINI_CHAT_MODEL?.trim() || 'gemini-3.5-flash-lite',
  embed: process.env.GEMINI_EMBED_MODEL?.trim() || 'gemini-embedding-001',
};
export function currentModels() {
  return { ...activeModel };
}

/** Qdrant 컬렉션 차원과 반드시 같아야 합니다. 768 이면 3072 대비 저장 공간이 1/4 입니다. */
export const EMBED_DIM = Number(process.env.GEMINI_EMBED_DIM) || 768;

const TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 8_000;

// ─────────────────────────────────────────────────────────────
// 에러 종류
// ─────────────────────────────────────────────────────────────

/** 한도 초과. 이걸 받으면 부르는 쪽은 즉시 '일반 검색 모드'로 우회합니다. */
export class GeminiRateLimitError extends Error {
  constructor(message: string, public retryAfterSec: number) {
    super(message);
    this.name = 'GeminiRateLimitError';
  }
}

/** 모델이 은퇴(404). suggested 는 Google 이 에러 문구로 알려 준 대체 모델입니다. */
export class GeminiModelRetiredError extends Error {
  constructor(message: string, public suggested: string | null) {
    super(message);
    this.name = 'GeminiModelRetiredError';
  }
}

/** 키가 없음 (로컬 개발 등). 역시 폴백 대상입니다. */
export class GeminiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiUnavailableError';
  }
}

// ─────────────────────────────────────────────────────────────
// 1) 로컬 한도계 + 2) 429 차단기
// ─────────────────────────────────────────────────────────────
//  - 프로세스 메모리 기준이라 서버가 여러 대면 대수만큼 나눠서 잡아야 합니다 (예: 2대면 7).
//  - 생성(분석)과 임베딩은 Google 쪽 한도가 따로라 통도 따로 둡니다.

type Lane = 'chat' | 'embed';

const LIMITS: Record<Lane, { rpm: number; rpd: number }> = {
  // 요청에 적힌 무료 한도 15 RPM 에서 1 을 남겨 둡니다 (다른 서버·수동 테스트 여유분).
  chat: { rpm: Number(process.env.GEMINI_CHAT_RPM) || 14, rpd: Number(process.env.GEMINI_CHAT_RPD) || 1000 },
  embed: { rpm: Number(process.env.GEMINI_EMBED_RPM) || 90, rpd: Number(process.env.GEMINI_EMBED_RPD) || 900 },
};

const recent: Record<Lane, number[]> = { chat: [], embed: [] };
const daily: Record<Lane, { day: string; count: number }> = {
  chat: { day: '', count: 0 },
  embed: { day: '', count: 0 },
};
const blockedUntil: Record<Lane, number> = { chat: 0, embed: 0 };

/** Google 무료 한도의 '하루'는 태평양 시간 자정에 초기화됩니다. */
function pacificDay(now: number): string {
  return new Date(now - 8 * 3600_000).toISOString().slice(0, 10);
}

/** 보낼 수 있으면 자리를 잡고, 못 보내면 GeminiRateLimitError 를 던집니다. */
function takeSlot(lane: Lane) {
  const now = Date.now();

  if (blockedUntil[lane] > now) {
    throw new GeminiRateLimitError(`[Gemini:${lane}] 429 차단 중`, Math.ceil((blockedUntil[lane] - now) / 1000));
  }

  const window = recent[lane].filter(t => now - t < 60_000);
  recent[lane] = window;
  if (window.length >= LIMITS[lane].rpm) {
    const retry = Math.ceil((60_000 - (now - window[0])) / 1000);
    throw new GeminiRateLimitError(`[Gemini:${lane}] 로컬 분당 한도 ${LIMITS[lane].rpm}회 도달`, retry);
  }

  const day = pacificDay(now);
  if (daily[lane].day !== day) daily[lane] = { day, count: 0 };
  if (daily[lane].count >= LIMITS[lane].rpd) {
    throw new GeminiRateLimitError(`[Gemini:${lane}] 로컬 일일 한도 ${LIMITS[lane].rpd}회 도달`, 3600);
  }

  window.push(now);
  daily[lane].count += 1;
}

/** 429 응답 본문의 RetryInfo.retryDelay("37s") 를 읽습니다. */
function parseRetryDelay(body: unknown): number {
  const details = ((body as { error?: { details?: Record<string, unknown>[] } } | null)?.error?.details) ?? [];
  const info = details.find(d => String(d?.['@type'] ?? '').includes('RetryInfo'));
  const sec = parseInt(String(info?.retryDelay ?? ''), 10);
  return Number.isFinite(sec) && sec > 0 ? sec : 60;
}

/** 현재 상태 (관리자 진단용) */
export function geminiQuotaStatus() {
  const now = Date.now();
  return (['chat', 'embed'] as Lane[]).map(lane => ({
    lane,
    usedLastMinute: recent[lane].filter(t => now - t < 60_000).length,
    rpm: LIMITS[lane].rpm,
    usedToday: daily[lane].count,
    rpd: LIMITS[lane].rpd,
    blockedForSec: Math.max(0, Math.ceil((blockedUntil[lane] - now) / 1000)),
  }));
}

// ─────────────────────────────────────────────────────────────
// 공통 호출기
// ─────────────────────────────────────────────────────────────

/** Gemini 응답 중 쓰는 필드만 */
interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  embedding?: { values?: number[] };
  embeddings?: { values: number[] }[];
}

async function callGemini(lane: Lane, path: string, body: unknown): Promise<GeminiResponse> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new GeminiUnavailableError('GEMINI_API_KEY 가 설정되지 않았습니다.');

  takeSlot(lane); // 여기서 한도에 걸리면 네트워크를 타지 않고 바로 던집니다.

  const res = await fetch(`${API_BASE}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: 'no-store',
  });

  if (res.status === 429) {
    const errBody = await res.json().catch(() => null);
    const retry = parseRetryDelay(errBody);
    blockedUntil[lane] = Date.now() + retry * 1000;
    // ⚠️ 키가 로그에 남지 않도록 상태만 찍습니다.
    console.warn(`🚦 [Gemini:${lane}] 429 한도 초과 → ${retry}초 동안 일반 검색 모드로 우회`);
    throw new GeminiRateLimitError(`[Gemini:${lane}] 429`, retry);
  }

  if (res.status === 404) {
    const text = await res.text().catch(() => '');
    // 예: "This model models/gemini-2.5-flash-lite is no longer available to new users.
    //      Please update your code to use models/gemini-3.5-flash-lite ..."
    const suggested = text.match(/use\s+models\/([A-Za-z0-9.\-_]+)/)?.[1] ?? null;
    throw new GeminiModelRetiredError(`[Gemini:${lane}] 404 ${text.slice(0, 200)}`, suggested);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`[Gemini:${lane}] HTTP ${res.status} ${text.slice(0, 200)}`);
  }

  return res.json();
}

/**
 * 모델 이름이 들어가는 호출을 감쌉니다. 404(은퇴)이고 Google 이 대체 모델을 알려 줬으면
 * 그 모델로 바꿔 딱 한 번 다시 시도합니다. 대체 모델이 없거나 또 실패하면 그대로 던집니다(→ 폴백).
 */
async function callWithModel(lane: Lane, build: (model: string) => { path: string; body: unknown }): Promise<GeminiResponse> {
  const first = build(activeModel[lane]);
  try {
    return await callGemini(lane, first.path, first.body);
  } catch (e) {
    if (!(e instanceof GeminiModelRetiredError) || !e.suggested || e.suggested === activeModel[lane]) throw e;
    console.warn(`🔁 [Gemini:${lane}] 모델 ${activeModel[lane]} 은퇴 → ${e.suggested} 로 전환합니다. .env 의 GEMINI_${lane === 'chat' ? 'CHAT' : 'EMBED'}_MODEL 을 ${e.suggested} 로 바꿔 주세요.`);
    activeModel[lane] = e.suggested;
    const retry = build(activeModel[lane]);
    return callGemini(lane, retry.path, retry.body);
  }
}

// ─────────────────────────────────────────────────────────────
// 검색어 분석 (단순 키워드 vs 자연어 + 키워드·카테고리·가격 추출)
// ─────────────────────────────────────────────────────────────

/** Gemini 가 돌려줄 원본 모양. 가격은 말한 통화 그대로 받아 서버에서 환산합니다. */
export interface RawAnalysis {
  kind: 'keyword' | 'natural';
  keyword_ja: string;
  keyword_ko: string;
  category_ja: string | null;
  category_ko: string | null;
  price_min: number | null;
  price_max: number | null;
  currency: 'KRW' | 'JPY' | null;
  exclude_ja: string[];
  exclude_ko: string[];
}

const SYSTEM_PROMPT = `너는 한국인 고객을 위한 일본 쇼핑몰(라쿠텐, 메루카리, 야후 쇼핑, 야후 옥션) 검색어 분석기다.
고객 입력을 보고 JSON 만 출력한다.

규칙:
- kind: 상품명·브랜드·모델명만 나열한 입력이면 "keyword", 상황·조건·부탁이 담긴 문장이면 "natural".
- keyword_ja: 일본 쇼핑몰 검색창에 넣을 일본어 검색어. 공백으로 구분한 핵심 명사 1~3개.
  상황 설명(바닷가, 출근용 등)은 상품 특성으로 바꾸거나 버린다. 예) "여름 바닷가 원피스" → "ワンピース 夏 リゾート"
  브랜드·모델명은 일본에서 통용되는 표기로 쓴다. 예) 나이키 → ナイキ, 포켓몬 → ポケモン
- keyword_ko: 같은 뜻의 한국어 핵심어.
- category_ja: 대표 카테고리 한 단어(일본어). 모르면 null.
- category_ko: category_ja 의 한국어. 없으면 null.
- price_min / price_max: 숫자만. "5만원대" → 50000 ~ 59999, "3만원 이하" → null ~ 30000, "1000엔 이상" → 1000 ~ null. 언급 없으면 둘 다 null.
- currency: 원/만원이면 "KRW", 엔/円이면 "JPY", 가격 언급이 없으면 null.
- exclude_ja: "~빼고", "~말고" 처럼 제외를 원한 단어의 일본어. 없으면 [].
- exclude_ko: exclude_ja 와 같은 순서의 한국어. 없으면 [].
- keyword_ja 에는 exclude_ja 단어를 넣지 않는다.
- 일본 쇼핑몰에서 실제로 쓰는 흔한 상품 용어만 쓴다. 뜻이 불확실한 단어나 한자를 지어내지 않는다.

예시:
입력: 여름 양산 자외선 차단 3천엔 이하
출력: {"kind":"natural","keyword_ja":"日傘 UVカット","keyword_ko":"양산 자외선 차단","category_ja":"日傘","category_ko":"양산","price_min":null,"price_max":3000,"currency":"JPY","exclude_ja":[],"exclude_ko":[]}
입력: 여름 바닷가에서 입기 좋은 시원한 5만원대 원피스 찾아줘
출력: {"kind":"natural","keyword_ja":"ワンピース 夏 リゾート","keyword_ko":"여름 리조트 원피스","category_ja":"ワンピース","category_ko":"원피스","price_min":50000,"price_max":59999,"currency":"KRW","exclude_ja":[],"exclude_ko":[]}
입력: 캠핑 갈 때 쓸 가벼운 랜턴 빨간색 말고
출력: {"kind":"natural","keyword_ja":"ランタン キャンプ 軽量","keyword_ko":"캠핑 경량 랜턴","category_ja":"ランタン","category_ko":"랜턴","price_min":null,"price_max":null,"currency":null,"exclude_ja":["赤"],"exclude_ko":["빨간색"]}
입력: 포켓몬 카드 박스
출력: {"kind":"keyword","keyword_ja":"ポケモンカード BOX","keyword_ko":"포켓몬 카드 박스","category_ja":null,"category_ko":null,"price_min":null,"price_max":null,"currency":null,"exclude_ja":[],"exclude_ko":[]}`;

/** 프롬프트·모델 설정이 바뀌면 올립니다 → 서버 메모리의 분석 캐시가 새로 만들어집니다. */
export const ANALYSIS_VERSION = 'v4';

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    kind: { type: 'STRING', enum: ['keyword', 'natural'] },
    keyword_ja: { type: 'STRING' },
    keyword_ko: { type: 'STRING' },
    category_ja: { type: 'STRING', nullable: true },
    category_ko: { type: 'STRING', nullable: true },
    price_min: { type: 'INTEGER', nullable: true },
    price_max: { type: 'INTEGER', nullable: true },
    currency: { type: 'STRING', enum: ['KRW', 'JPY'], nullable: true },
    exclude_ja: { type: 'ARRAY', items: { type: 'STRING' } },
    exclude_ko: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['kind', 'keyword_ja', 'keyword_ko', 'category_ja', 'category_ko', 'price_min', 'price_max', 'currency', 'exclude_ja', 'exclude_ko'],
};

/**
 * 모델 세대마다 '생각(thinking)' 설정 방식이 다릅니다. 분석엔 생각이 거의 필요 없으니 최소로 둡니다.
 *  - 2.5 계열: thinkingBudget 0 (끔)
 *  - 3.x 계열: 끌 수 없고 thinkingLevel 로 조절. flash-lite·3.5·3.6 은 'minimal', 그 외는 'low' 가 최소
 * ⚠️ maxOutputTokens 는 생각 토큰까지 합친 상한이라, 너무 작으면 JSON 이 중간에 잘립니다.
 */
function buildGenerationConfig(model: string): Record<string, unknown> {
  const config: Record<string, unknown> = {
    temperature: 0,
    maxOutputTokens: 2048,
    responseMimeType: 'application/json',
    responseSchema: RESPONSE_SCHEMA,
  };
  if (/gemini-2\.5/.test(model)) config.thinkingConfig = { thinkingBudget: 0 };
  else if (/gemini-3/.test(model)) {
    // 🐛 'minimal' 로 두니 가끔 없는 한자를 지어냈습니다(예: 양산 → 「日尙し 日出し 昨夜」).
    //    'low' 는 조금 느리지만(수백 ms) 검색어 품질이 안정적입니다.
    config.thinkingConfig = { thinkingLevel: 'low' };
  }
  return config;
}

/**
 * 검색어를 분석합니다.
 * @throws GeminiRateLimitError  한도 초과 → 부르는 쪽에서 폴백
 * @throws GeminiUnavailableError 키 없음 → 폴백
 * @throws Error                  그 밖의 장애(타임아웃·형식 오류) → 폴백
 */
export async function analyzeQueryWithGemini(query: string): Promise<RawAnalysis> {
  const data = await callWithModel('chat', model => ({
    path: `models/${model}:generateContent`,
    body: {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: query.slice(0, 300) }] }],
      generationConfig: buildGenerationConfig(model),
    },
  }));

  const text: string = data?.candidates?.[0]?.content?.parts?.map(p => p?.text ?? '').join('') ?? '';
  let parsed: RawAnalysis;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`[Gemini:chat] JSON 파싱 실패: ${text.slice(0, 120)}`);
  }
  if (!parsed?.keyword_ja?.trim()) throw new Error('[Gemini:chat] keyword_ja 가 비었습니다');
  return parsed;
}

// ─────────────────────────────────────────────────────────────
// 임베딩
// ─────────────────────────────────────────────────────────────

/** 검색어 1건 임베딩 (질의용) */
export async function embedQuery(text: string): Promise<number[]> {
  const data = await callWithModel('embed', model => ({
    path: `models/${model}:embedContent`,
    body: {
      model: `models/${model}`,
      content: { parts: [{ text: text.slice(0, 500) }] },
      taskType: 'RETRIEVAL_QUERY',
      outputDimensionality: EMBED_DIM,
    },
  }));
  const values: number[] | undefined = data?.embedding?.values;
  if (!values?.length) throw new Error('[Gemini:embed] 빈 임베딩');
  return values;
}

/**
 * 상품 여러 건을 한 번에 임베딩 (색인용).
 * batchEmbedContents 는 여러 문장을 요청 1회로 보냅니다 → 분당 한도를 1칸만 씁니다.
 */
export async function embedDocuments(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const out: number[][] = [];
  const CHUNK = 100; // 한 요청당 최대 100건
  for (let i = 0; i < texts.length; i += CHUNK) {
    const chunk = texts.slice(i, i + CHUNK);
    const data = await callWithModel('embed', model => ({
      path: `models/${model}:batchEmbedContents`,
      body: {
        requests: chunk.map(t => ({
          model: `models/${model}`,
          content: { parts: [{ text: t.slice(0, 500) }] },
          taskType: 'RETRIEVAL_DOCUMENT',
          outputDimensionality: EMBED_DIM,
        })),
      },
    }));
    const embeddings: { values: number[] }[] = data?.embeddings ?? [];
    if (embeddings.length !== chunk.length) throw new Error('[Gemini:embed] 배치 임베딩 개수가 맞지 않습니다');
    out.push(...embeddings.map(e => e.values));
  }
  return out;
}
