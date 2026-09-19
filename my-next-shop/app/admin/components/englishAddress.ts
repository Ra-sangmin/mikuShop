/**
 * 🌏 한국 주소 → 영문 주소 (FedEx · DHL 등 해외 배송 양식용)
 *
 * 회원에게 영문 주소를 따로 받지 않고, 관리자가 복사하는 순간 규칙으로 바꿉니다.
 *  - 기본 주소(도로명): 시·도는 공식 영문명, 나머지는 로마자 + -si / -gu / -ro / -gil …
 *      서울 강남구 역삼로11길 13-6  →  13-6 Yeoksam-ro 11-gil, Gangnam-gu, Seoul, Republic of Korea
 *  - 상세 주소: 동 · 호 · 층은 영어 표기, 한글 이름은 로마자, 자주 쓰는 단어는 영어로
 *      좋은 아파트 132동 1023호      →  Unit 1023, Bldg 132, Joeun APT
 *
 * 자동 변환이라 드물게 공식 표기와 다를 수 있습니다. (예: 고유 명칭의 관용 표기)
 * 주소 자체(번지 · 동 · 호 숫자)는 그대로 옮기므로 배송에는 문제가 없습니다.
 */

/* ---------------- 로마자 표기 (국어의 로마자 표기법, 주요 음운 변화 포함) ---------------- */
const CHO = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
const JUNG = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
// 받침 → 대표음 (0 = 없음)
const JONG_SOUND = ['', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k', 'm', 'l', 'l', 'l', 'p', 'l', 'm', 'p', 'p', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 't'];
// 받침이 다음 모음으로 넘어갈 때의 소리 (연음)
const JONG_LINK = ['', 'g', 'kk', 'ks', 'n', 'nj', 'nh', 'd', 'r', 'lg', 'lm', 'lb', 'ls', 'lt', 'lp', 'lh', 'm', 'b', 'bs', 's', 'ss', 'ng', 'j', 'ch', 'k', 't', 'p', ''];

type Syl = { cho: number; jung: number; jong: number } | { raw: string };

const decompose = (text: string): Syl[] =>
  Array.from(text).map(ch => {
    const c = ch.charCodeAt(0) - 0xac00;
    if (c < 0 || c > 11171) return { raw: ch };
    return { cho: Math.floor(c / 588), jung: Math.floor((c % 588) / 28), jong: c % 28 };
  });

/** 한글 → 로마자 (소문자). 한글이 아닌 글자는 그대로 둡니다. */
export function romanize(text: string): string {
  const syls = decompose(text);
  let out = '';
  for (let i = 0; i < syls.length; i++) {
    const s = syls[i];
    if ('raw' in s) { out += s.raw; continue; }
    const next = syls[i + 1];
    const nextHangul = next && !('raw' in next) ? next : null;

    // 초성 (앞 받침의 영향은 앞 글자에서 처리해 둡니다)
    let cho = CHO[s.cho];
    const prev = syls[i - 1];
    if (prev && !('raw' in prev) && prev.jong) {
      const pj = prev.jong;
      if (s.cho === 11) cho = ''; // 연음은 앞 글자가 붙여 둠
      else if (s.cho === 5) {      // ㄹ 초성
        if (pj === 4 || pj === 8) cho = 'l';              // ㄴ·ㄹ + ㄹ → ll
        else if ([16, 21, 1, 2, 24, 17, 26].includes(pj)) cho = 'n'; // ㅁ·ㅇ·ㄱ·ㅂ + ㄹ → n
      } else if (s.cho === 2 && pj === 8) cho = 'l';     // ㄹ + ㄴ → ll
    }
    out += cho + JUNG[s.jung];

    // 종성
    if (!s.jong) continue;
    if (nextHangul && nextHangul.cho === 11) { out += JONG_LINK[s.jong]; continue; } // 연음
    let fin = JONG_SOUND[s.jong];
    if (nextHangul) {
      const nc = nextHangul.cho;
      const nasalNext = nc === 2 || nc === 6 || nc === 5; // ㄴ ㅁ ㄹ
      if (s.jong === 4 && nc === 5) fin = 'l';             // ㄴ + ㄹ → ll
      else if (nasalNext && fin === 'k') fin = 'ng';
      else if (nasalNext && fin === 't') fin = 'n';
      else if (nasalNext && fin === 'p') fin = 'm';
    }
    out += fin;
  }
  return out;
}

const cap = (w: string) => w.replace(/(^|[\s-])([a-z])/g, (_m, p, c) => p + c.toUpperCase()).replace(/^./, c => c.toUpperCase());

/* ---------------- 기본 주소 (도로명) ---------------- */
const SIDO: [RegExp, string][] = [
  [/^서울(특별시)?$/, 'Seoul'], [/^부산(광역시)?$/, 'Busan'], [/^대구(광역시)?$/, 'Daegu'],
  [/^인천(광역시)?$/, 'Incheon'], [/^광주(광역시)?$/, 'Gwangju'], [/^대전(광역시)?$/, 'Daejeon'],
  [/^울산(광역시)?$/, 'Ulsan'], [/^세종(특별자치시)?$/, 'Sejong-si'], [/^경기(도)?$/, 'Gyeonggi-do'],
  [/^강원(도|특별자치도)?$/, 'Gangwon-do'], [/^충(북|청북도)$/, 'Chungcheongbuk-do'], [/^충(남|청남도)$/, 'Chungcheongnam-do'],
  [/^전(북|라북도|북특별자치도)$/, 'Jeollabuk-do'], [/^전(남|라남도)$/, 'Jeollanam-do'],
  [/^경(북|상북도)$/, 'Gyeongsangbuk-do'], [/^경(남|상남도)$/, 'Gyeongsangnam-do'], [/^제주(도|특별자치도)?$/, 'Jeju-do'],
];
const UNIT_SUFFIX: [string, string][] = [['시', 'si'], ['군', 'gun'], ['구', 'gu'], ['읍', 'eup'], ['면', 'myeon'], ['동', 'dong'], ['리', 'ri'], ['가', 'ga']];

/** 도로명 한 토큰: 역삼로11길 → Yeoksam-ro 11-gil, 판교역로192번길 → Pangyoyeok-ro 192beon-gil */
function roadToken(tok: string): string | null {
  const m = tok.match(/^(.+?(?:로|길))(\d+)?(번길|길)?$/);
  if (!m) return null;
  const [, base, num, tail] = m;
  const stem = base.slice(0, -1);
  const suffix = base.endsWith('로') ? 'ro' : 'gil';
  let s = `${cap(romanize(stem))}-${suffix}`;
  if (num) s += ` ${num}${tail === '번길' ? 'beon-gil' : '-gil'}`;
  return s;
}

/** 기본 주소(도로명) → 영문. 번지 → 도로 → 읍면 → 시군구 → 시도 순으로 뒤집습니다. */
export function toEnglishBaseAddress(address: string): string {
  const cleaned = address.replace(/\(.*?\)/g, ' ').replace(/\s+/g, ' ').trim(); // "(역삼동, ○○아파트)" 같은 참고항목은 뺍니다
  const tokens = cleaned.split(' ');
  const parts: string[] = [];
  for (const tok of tokens) {
    const sido = SIDO.find(([re]) => re.test(tok));
    if (sido) { parts.push(sido[1]); continue; }
    if (/^(지하\s*)?\d+(-\d+)?$/.test(tok)) { parts.push(tok); continue; }           // 건물번호
    if (tok === '지하') { parts.push('B'); continue; }
    const road = roadToken(tok);
    if (road) { parts.push(road); continue; }
    const unit = UNIT_SUFFIX.find(([k]) => tok.length > 1 && tok.endsWith(k));
    if (unit) { parts.push(`${cap(romanize(tok.slice(0, -unit[0].length)))}-${unit[1]}`); continue; }
    parts.push(cap(romanize(tok)));
  }
  // "B 12" → "B12"
  const merged: string[] = [];
  parts.forEach(p => {
    if (merged[merged.length - 1] === 'B' && /^\d/.test(p)) merged[merged.length - 1] = `B${p}`;
    else merged.push(p);
  });
  // 공식 영문(행정안전부 · 카카오 우편번호) 형식에 맞춥니다.
  //   "13-6 Yeoksam-ro 11-gil, Gangnam-gu, Seoul, Republic of Korea"
  //   건물번호와 도로명은 띄어쓰기로 붙이고, 끝에 국가명을 붙입니다.
  const ordered = merged.reverse();
  if (ordered.length >= 2 && /^B?\d+(-\d+)?$/.test(ordered[0]) && /-(ro|gil)(\b|$)/.test(ordered[1])) {
    ordered.splice(0, 2, `${ordered[0]} ${ordered[1]}`);
  }
  return [...ordered, 'Republic of Korea'].join(', ');
}

/* ---------------- 상세 주소 ---------------- */
const WORDS: [RegExp, string][] = [
  [/아파트$/, ' APT'], [/오피스텔$/, ' Officetel'], [/빌라$/, ' Villa'], [/맨션$/, ' Mansion'],
  [/빌딩$/, ' Bldg'], [/타워$/, ' Tower'], [/하이츠$/, ' Heights'], [/주택$/, ' House'],
  [/상가$/, ' Shopping Center'], [/센터$/, ' Center'], [/프라자|플라자$/, ' Plaza'], [/마을$/, ' Village'],
  [/단지$/, ' Complex'], [/연립$/, ' Townhouse'], [/기숙사$/, ' Dormitory'],
];

/**
 * 상세 주소 → 영문.
 *  - 132동 → Bldg 132, 1023호 → Unit 1023, 3층 → 3F, 지하1층 → B1F, 101-1203 → Unit 101-1203
 *  - 좋은 아파트 → Joeun APT (단어는 영어, 이름은 로마자)
 *  영어 주소 관례대로 작은 단위(호)부터 적습니다.
 */
export function toEnglishDetailAddress(detail: string): string {
  let d = (detail || '').replace(/[(),]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!d) return '';
  const units: string[] = [];   // 호 · 층 · 동 (작은 단위부터 정렬)
  const names: string[] = [];

  const unitOf = (tok: string): [number, string] | null => {
    let m;
    if ((m = tok.match(/^(\d+[A-Za-z]?)호$/))) return [0, `Unit ${m[1]}`];
    if ((m = tok.match(/^지하\s*(\d+)층$/))) return [1, `B${m[1]}F`];
    if ((m = tok.match(/^(\d+)층$/))) return [1, `${m[1]}F`];
    if ((m = tok.match(/^([A-Za-z]|[A-Za-z]?\d+[A-Za-z]?)동$/))) return [2, `Bldg ${m[1].toUpperCase()}`];
    if ((m = tok.match(/^(\d+)-(\d+)$/))) return [0, `Unit ${m[1]}-${m[2]}`];
    if (/^\d+$/.test(tok)) return [0, `#${tok}`];
    return null;
  };

  // "132동1023호"처럼 붙여 쓴 것도 나눕니다.
  d = d.replace(/(\d+[A-Za-z]?|\b[A-Za-z])(동|호|층)(?=\S)/g, '$1$2 ');
  for (const tok of d.split(' ')) {
    const u = unitOf(tok);
    if (u) { units.push(`${u[0]}|${u[1]}`); continue; }
    if (/^[A-Za-z0-9#-]+$/.test(tok)) { names.push(tok); continue; }  // 이미 영문/숫자
    const w = WORDS.find(([re]) => re.test(tok));
    if (w) {
      const stem = tok.replace(w[0], '');
      names.push(`${stem ? cap(romanize(stem)) : ''}${w[1]}`.trim());
      continue;
    }
    names.push(cap(romanize(tok)));
  }
  const unitText = units.sort().map(u => u.split('|')[1]);
  // 건물 이름은 띄어쓰기로 한 덩어리 (좋은 아파트 → Joeun APT), 단위와는 쉼표로 나눕니다.
  return [...unitText, names.join(' ')].filter(Boolean).join(', ');
}

/* ---------------- 이름 · 전화 ---------------- */
const SURNAME: Record<string, string> = {
  김: 'KIM', 이: 'LEE', 박: 'PARK', 최: 'CHOI', 정: 'JUNG', 강: 'KANG', 조: 'CHO', 윤: 'YOON', 장: 'JANG', 임: 'LIM',
  한: 'HAN', 오: 'OH', 서: 'SEO', 신: 'SHIN', 권: 'KWON', 황: 'HWANG', 안: 'AHN', 송: 'SONG', 류: 'RYU', 유: 'YOO',
  홍: 'HONG', 전: 'JEON', 고: 'KO', 문: 'MOON', 양: 'YANG', 손: 'SON', 배: 'BAE', 백: 'BAEK', 허: 'HEO', 노: 'NOH',
  남: 'NAM', 심: 'SIM', 하: 'HA', 곽: 'KWAK', 성: 'SUNG', 차: 'CHA', 주: 'JOO', 우: 'WOO', 구: 'KOO', 나: 'NA', 라: 'RA',
};

/** 영문 이름: 등록된 영문 이름이 있으면 그대로, 없으면 로마자 (성 + 이름) */
export function toEnglishName(name: string, english?: string | null): string {
  if (english && english.trim()) return english.trim().toUpperCase();
  const n = (name || '').trim();
  if (!n) return '';
  if (!/[가-힣]/.test(n)) return n.toUpperCase();
  const family = SURNAME[n[0]] || romanize(n[0]).toUpperCase();
  return `${family} ${romanize(n.slice(1)).toUpperCase()}`.trim();
}

/** 010-1234-5678 → +82 10-1234-5678 */
export function toIntlPhone(phone?: string | null): string {
  const p = (phone || '').replace(/\s/g, '');
  if (!p) return '';
  if (p.startsWith('+')) return p;
  return `+82 ${p.replace(/^0/, '')}`;
}

/** 한 줄 영문 주소 (상세 → 기본) */
export function toEnglishAddress(address: string, detail?: string | null): string {
  return [toEnglishDetailAddress(detail || ''), toEnglishBaseAddress(address || '')].filter(Boolean).join(', ');
}
