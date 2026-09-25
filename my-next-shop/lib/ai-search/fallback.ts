// 🧯 Gemini 없이 검색어를 다루는 정규식 폴백
//
// Gemini 가 429(한도 초과)·장애·키 없음일 때 쓰입니다. 여기엔 네트워크 호출이 없습니다.
// (번역은 부르는 쪽에서 기존 getTranslatedText — DeepL + Translation 표 캐시 — 로 합니다)
//
// 하는 일
//   1) 가격 표현("5만원대", "3만원 이하", "2000엔 이상")을 뽑아 숫자 범위로 바꾸고 문장에서 지웁니다.
//   2) "찾아줘", "추천해 줘" 같은 서술어·부탁 표현을 지웁니다.
//   3) 조사("에서", "를")를 떼고, 꾸밈말("시원한", "입기 좋은")·상황어("바닷가")를 버려
//      핵심 명사만 남깁니다. 마지막 명사(보통 상품 종류)는 꼭 남깁니다.
//
// ⚠️ 형태소 분석기가 아니라 규칙 기반이라 완벽하지 않습니다. 목표는 "한도가 풀릴 때까지
//    검색이 멈추지 않는 것"이지 AI 수준의 이해가 아닙니다.

export interface FallbackParse {
  /** 핵심 명사만 남은 한국어(또는 원문 언어) 검색어 */
  keywords: string;
  /** 문장처럼 보였는지 (서술어·가격·꾸밈말이 있었는지) */
  looksNatural: boolean;
  priceMin: number | null;
  priceMax: number | null;
  currency: 'KRW' | 'JPY' | null;
  exclude: string[];
}

// ── 1) 가격 ─────────────────────────────────────────────────

const NUM = String.raw`(\d+(?:[.,]\d+)*)`;

function toNumber(raw: string, unit: string | undefined): number {
  const n = parseFloat(raw.replace(/,/g, ''));
  if (!unit) return n;
  if (unit.includes('만')) return n * 10_000;
  if (unit.includes('천')) return n * 1_000;
  return n;
}

interface PriceHit { min: number | null; max: number | null; currency: 'KRW' | 'JPY' }

function extractPrice(text: string): { rest: string; price: PriceHit | null } {
  // 통화 단위: (만|천)?(원|엔|円) — "5만원", "3천엔", "2000円", "¥2000"
  const unitRe = String.raw`\s*(만|천)?\s*(원|엔|円)`;
  const cur = (u: string): 'KRW' | 'JPY' => (u === '원' ? 'KRW' : 'JPY');

  // a) "5만원대" / "3천엔대"
  let m = text.match(new RegExp(`${NUM}${unitRe}\\s*대(?:의|로|인|에)?`));
  if (m) {
    const base = toNumber(m[1], m[2]);
    const step = m[2]?.includes('만') ? 10_000 : m[2]?.includes('천') ? 1_000 : Math.pow(10, Math.floor(Math.log10(base || 1)));
    return { rest: text.replace(m[0], ' '), price: { min: base, max: base + step - 1, currency: cur(m[3]) } };
  }

  // b) "3만원 ~ 5만원", "3만~5만원"
  m = text.match(new RegExp(`${NUM}\\s*(만|천)?\\s*(원|엔|円)?\\s*[~\\-]\\s*${NUM}${unitRe}`));
  if (m) {
    const unitA = m[2] ?? m[5];
    return {
      rest: text.replace(m[0], ' '),
      price: { min: toNumber(m[1], unitA), max: toNumber(m[4], m[5]), currency: cur(m[6]) },
    };
  }

  // c) "3만원 이하/미만/까지/아래/안쪽", "1000엔 이상/넘는/부터/초과"
  m = text.match(new RegExp(`${NUM}${unitRe}\\s*(이하|미만|까지|아래|안쪽|내외|정도|쯤|이상|넘는|부터|초과|over)?(?:로|으로|인|의|짜리|에)?`));
  if (m) {
    const v = toNumber(m[1], m[2]);
    const dir = m[4] ?? '';
    const c = cur(m[3]);
    let price: PriceHit;
    if (/이상|넘는|부터|초과|over/.test(dir)) price = { min: v, max: null, currency: c };
    else if (/내외|정도|쯤/.test(dir) || dir === '') price = { min: Math.round(v * 0.8), max: Math.round(v * 1.2), currency: c };
    else price = { min: null, max: v, currency: c };
    return { rest: text.replace(m[0], ' '), price };
  }

  // d) "¥2000"
  m = text.match(/[¥￥]\s*(\d[\d,]*)/);
  if (m) {
    const v = toNumber(m[1], undefined);
    return { rest: text.replace(m[0], ' '), price: { min: Math.round(v * 0.8), max: Math.round(v * 1.2), currency: 'JPY' } };
  }

  return { rest: text, price: null };
}

// ── 2) 서술어·부탁 표현 ─────────────────────────────────────

const PREDICATE_PATTERNS: RegExp[] = [
  /(좀\s*)?(찾아|추천해|알려|보여|골라|검색해)\s*(줘|줘요|주세요|주실래요|줄래|주라|봐|봐요|보세요|줄\s*수\s*있어\??)/g,
  /(찾고|사고|구하고|구매하고|갖고|가지고)\s*(싶어|싶어요|싶다|싶은데|싶습니다)/g,
  /(있나요|있을까요?|있어\??|있니|없나요|어때요?|뭐가\s*좋아\??|뭐\s*있어\??)/g,
  /(해\s*주세요|해\s*줘|부탁해요?|부탁드려요|부탁합니다)/g,
  /(추천|검색|찾기)\s*(좀)?/g,
  /[?!.~…]+/g,
];

// ── 3) 명사만 남기기 ────────────────────────────────────────

/** 버릴 단어: 꾸밈말·상황어·군더더기. (필요하면 운영하면서 늘려 가세요) */
const STOPWORDS = new Set([
  '좀', '그냥', '진짜', '정말', '너무', '아주', '약간', '제일', '가장', '요즘', '최근', '혹시', '저', '제가', '나', '내가', '우리',
  '것', '거', '걸', '게', '용', '느낌', '스타일', '종류', '같은', '처럼', '관련', '위한', '위해',
  '입기', '쓰기', '신기', '들기', '먹기', '하기', '쓰기에', '입기에',
  '좋은', '예쁜', '이쁜', '귀여운', '멋진', '괜찮은', '저렴한', '싼', '비싼', '가벼운', '편한', '편안한', '튼튼한', '인기', '인기있는',
  '바닷가', '해변', '바다', '여행', '여행용', '출근', '출근용', '데일리', '평소', '일상', '회사', '학교', '집', '선물', '선물용',
  '가격', '가격대', '정도', '쯤', '이하', '이상', '미만',
  '갈', '때', '쓸', '할', '살', '볼', '입을', '신을', '들고', '가서', '가면', '할때', '갈때',
  '부모님', '엄마', '아빠', '친구', '여자친구', '남자친구', '여친', '남친',
]);

/** 떼어낼 조사 (긴 것부터). '가'·'이'·'도'·'의'처럼 한 글자로 명사 끝과 겹치기 쉬운 것은 넣지 않습니다. */
const JOSA = ['에서는', '에서', '에게', '한테', '으로', '까지', '부터', '이랑', '처럼', '보다', '에는', '에도', '을', '를', '은', '는', '와', '과', '랑', '로', '에'];

/** 동사·형용사가 명사를 꾸미는 꼴("어울리는", "시원한", "따뜻한") */
const ADNOMINAL = /(하는|되는|있는|없는|리는|기는|입는|쓰는|신는|좋은|한|운|쁜|싼|던)$/;

function isForeignOrCode(token: string): boolean {
  // 영문·숫자·일본어·모델명(예: "AJ1", "iPhone15", "ポケモン")은 손대지 않습니다.
  return /^[\p{Script=Latin}\d\-_.+#/]+$/u.test(token) || /[぀-ヿ一-龯]/.test(token);
}

function stripJosa(token: string): string {
  if (isForeignOrCode(token)) return token;
  for (const j of JOSA) {
    if (token.length > j.length + 1 && token.endsWith(j)) return token.slice(0, -j.length);
  }
  return token;
}

/**
 * 정규식 폴백 파서.
 * 예) "여름 바닷가에서 입기 좋은 시원한 5만원대 원피스 찾아줘"
 *   → { keywords: "여름 원피스", priceMin: 50000, priceMax: 59999, currency: 'KRW' }
 */
export function parseQueryWithRegex(input: string): FallbackParse {
  let text = input.normalize('NFKC').trim();
  let looksNatural = false;

  // 제외어: "XX 빼고", "XX 말고", "XX 제외"
  const exclude: string[] = [];
  text = text.replace(/(\S+?)(?:은|는|을|를)?\s*(빼고|말고|제외(?:하고)?)/g, (_, w: string) => {
    exclude.push(stripJosa(w));
    looksNatural = true;
    return ' ';
  });

  const { rest, price } = extractPrice(text);
  if (price) looksNatural = true;
  text = rest;

  for (const re of PREDICATE_PATTERNS) {
    const next = text.replace(re, ' ');
    if (next !== text) looksNatural = true;
    text = next;
  }

  const rawTokens = text.split(/[\s,·/]+/).filter(Boolean);
  const nouns: string[] = [];
  for (const raw of rawTokens) {
    if (isForeignOrCode(raw)) { nouns.push(raw); continue; }
    if (STOPWORDS.has(raw)) { looksNatural = true; continue; }
    if (ADNOMINAL.test(raw) && raw.length >= 2) { looksNatural = true; continue; }
    const t = stripJosa(raw);
    if (t !== raw) looksNatural = true;
    if (!t || STOPWORDS.has(t) || JOSA.includes(t)) continue; // 홀로 남은 조사("로")도 버립니다
    nouns.push(t);
  }

  // 너무 많은 단어를 AND 로 던지면 결과가 0건이 되기 쉽습니다.
  // 한국어는 상품 종류(핵심 명사)가 문장 끝 쪽에 오므로 뒤에서 3개만 씁니다.
  const picked = nouns.slice(-3);

  // 다 지워졌으면 원문을 그대로 씁니다 (빈 검색보다는 낫습니다).
  const keywords = picked.join(' ').trim() || input.trim();

  return {
    keywords,
    looksNatural,
    priceMin: price?.min ?? null,
    priceMax: price?.max ?? null,
    currency: price?.currency ?? null,
    exclude,
  };
}

/**
 * Gemini 를 부르기 전에 "누가 봐도 단어 검색"인지 가볍게 판별합니다.
 * true 면 분석(LLM) 호출을 건너뛰어 분당 15회 한도를 아낍니다.
 * 예) "나이키 에어맥스" → true, "캠핑 갈 때 쓸 랜턴 추천" → false
 */
export function isObviouslyKeyword(input: string): boolean {
  const q = input.trim();
  if (q.length === 0 || q.length > 25) return false;
  const tokens = q.split(/\s+/);
  if (tokens.length > 3) return false;
  return !parseQueryWithRegex(q).looksNatural;
}
