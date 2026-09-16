// 🌟 "미쿠짱 AI 간단 요약"에서 쓰는 이름 정리/특징 추출 로직을 rakuten/mercari/yahoo_shopping/
// yahoo_auction이 전부 공용으로 참조하도록 모아둔 파일입니다. (GlobalProductDetailShop.tsx와
// GlobalProductDetailAuction.tsx가 각자 복사본을 들고 있던 것을 하나로 합쳤습니다.)

// 🌟 상품 종류를 추측해서 요약하는 방식은 오히려 엉뚱한 단어(카테고리)를 골라낼 위험이 있어
// 그만두고, 훨씬 안전한 규칙만 남겼습니다: (), [], 【】 안에 있는 부가 설명만 통째로 지우고
// 나머지 텍스트는 그대로 둡니다. (예: "간장 500ml(전용 상자)【10주년】" → "간장 500ml")
export function simplifyProductName(name: string): string {
  return (name || '')
    .replace(/【[^】]*】/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// 🌟 정리된 이름이 여전히 길면 지정한 길이로 잘라 "..."을 붙입니다.
export function truncateName(text: string, maxLength = 10): string {
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// ---------------------------------------------------------------------------
// 🌟 상품명 "특징 요약"
//
// 예) "ニチベイ 縦型ブラインド アルペジオ レガリエ シングルスタイル 羽幅75mm A8827〜A8829
//      幅321〜360cm×高さ251〜300cm オーダー バーチカルブラインド 縦型ブラインド 防炎"
//   → "縦型ブラインド"  (화면에서는 Google 웹번역이 "세로형 블라인드"로 바꿔 보여줌)
//
// 쇼핑몰 상품명은 [브랜드] [상품 종류] [시리즈/모델] [치수·규격…] [상품 종류 재언급] [속성]
// 순으로 붙는 경우가 많습니다. 그래서 (1) 모델명·치수처럼 숫자가 섞인 토큰과
// 배송/프로모션/색상/속성 같은 상투어를 걸러낸 뒤, (2) 제목 안에서 반복되는 단어(=핵심 상품 종류)를
// 우선 고르고, (3) 반복이 없으면 브랜드로 보이는 첫 토큰을 제외한 나머지에서 가장 상품명다운
// 토큰을 고릅니다. 한국어 상품명(띄어쓰기로 분리)에도 같은 규칙이 적용됩니다.
// ---------------------------------------------------------------------------

// 상품 종류가 아닌 상투어 (배송·프로모션·상태·색상·사이즈·속성). 여기 있는 토큰은 후보에서 제외합니다.
const NAME_STOPWORDS = new Set<string>([
  // 배송/프로모션 (일본어)
  '送料無料', '送料込', '送料込み', '送料別', '即納', '即日発送', '翌日発送', 'あす楽', '楽天',
  'セール', 'ポイント', '限定', '数量限定', '期間限定', '訳あり', '激安', '最安', '最安値', '人気',
  'おすすめ', 'ランキング', '受賞', '公式', '正規品', '正規', '純正', '新品', '未使用', '中古', '美品',
  '国内', '海外', '国内正規品', '並行輸入', '並行輸入品', '福袋', 'まとめ買い', 'セット', 'お得',
  '世界初', '日本初', '新登場', '新発売', '最新', '話題', '選択可', 'カラー選択可', 'ふるさと納税',
  // 성별/대상/사이즈 (일본어)
  'メンズ', 'レディース', 'キッズ', 'ベビー', 'ジュニア', '男性用', '女性用', '男女兼用', '子供用', '大人用',
  'フリーサイズ', 'Sサイズ', 'Mサイズ', 'Lサイズ', 'LLサイズ', 'XLサイズ', 'サイズ',
  // 색상 (일본어)
  'ブラック', 'ホワイト', 'レッド', 'ブルー', 'グリーン', 'イエロー', 'ピンク', 'グレー', 'ベージュ',
  'ブラウン', 'ネイビー', 'パープル', 'オレンジ', 'シルバー', 'ゴールド', '黒', '白', '赤', '青',
  // 속성/규격 (일본어)
  '防炎', '防水', '撥水', '抗菌', '防臭', '軽量', '大容量', '小型', '大型', '高級', '業務用', '家庭用',
  '国産', '日本製', '海外製', 'オーダー', 'オーダーメイド', 'シングル', 'ダブル', 'スタイル', 'タイプ',
  'ブランド', '本体', '単品', '専用',
  // 인테리어/생활용품 제목에서 자주 보이는 기능·재질·설치 관련 속성어
  '遮熱', '遮光', '断熱', '調光', '耐水', '賃貸', '無地', '標準', '標準タイプ', '浴室', '浴室用', '木目',
  '木製', '天然木', '無垢', '北欧', '横型', '縦型', 'コードレス', 'ワンポール', 'メタリック', '目隠し',
  'カラー', '単位', '保証', '簡単取付', '取付可', '取付可能', '取り付け', 'つや消し', 'つっぱり', 'くすみ',
  'おしゃれ', 'かわいい', 'ループコード式', 'チェーン式', 'プルコード式',
  // 재질 (상품 종류가 아니라 소재)
  '本革', '牛革', '革', 'レザー', '栃木レザー', 'カーボンレザー', 'コードバン', 'ステンレス', 'アルミ',
  '綿', 'ポリエステル', 'ナイロン', 'シリコン', 'ガラス', '陶器', '木', 'プラスチック',
  // 한국어 (Google 번역 결과나 한국어 상품명이 들어오는 경우)
  '무료배송', '배송비무료', '당일발송', '신품', '중고', '정품', '공식', '세일', '한정', '인기', '추천',
  '국내', '해외', '대용량', '소형', '대형', '고급', '업소용', '가정용', '방염', '방수', '남녀공용',
  '남성용', '여성용', '오더', '주문제작', '싱글', '더블', '스타일', '타입', '블랙', '화이트', '레드',
  '블루', '그린', '옐로우', '핑크', '그레이', '베이지', '브라운', '네이비', '퍼플', '오렌지', '실버', '골드',
]);

const KANJI_RE = /[一-鿿々]/;
const HIRAGANA_RE = /[぀-ゟ]/;
const KATAKANA_RUN_RE = /[゠-ヿー]{3,}/g;
const KANJI_RUN_RE = /[一-鿿々]{2,}/g;

// 상품 종류 후보가 될 수 없는 토큰인지 판단합니다.
function isNoiseToken(token: string): boolean {
  if (token.length < 2) return true;
  if (/[0-9０-９]/.test(token)) return true;             // 모델명·치수·수량 (75mm, A8827〜A8829, 500ml, 24本)
  // 글자(\p{L})가 하나도 없는 토큰 = 기호만 있는 토큰. (주의: \W는 u 플래그 없이는 일본어·한국어를
  // 전부 "비단어 문자"로 취급하므로 쓰면 안 됩니다.)
  if (/^[^\p{L}]+$/u.test(token)) return true;
  // "1cm単位でオーダーでき", "レビュー報告でブラインド用お掃除手袋"처럼 히라가나가 섞인 긴 토큰은
  // 상품 종류가 아니라 문장/설명입니다. (お茶, おもちゃ 같은 짧은 상품명은 남깁니다)
  if (token.length >= 5 && HIRAGANA_RE.test(token)) return true;
  if (NAME_STOPWORDS.has(token)) return true;
  return false;
}

// 괄호는 통째로 지우지 않고 구분자로 취급합니다. 라쿠텐은 【ブラインド】처럼 괄호 안에
// 상품 종류를 넣기도 하기 때문입니다. (【送料無料】【15日限定★P6倍】 같은 프로모션 문구는
// 어차피 숫자·상투어 필터에 걸려 후보에서 빠집니다.)
function tokenizeName(name: string): string[] {
  return (name || '')
    // 🌟 "取付可・つっぱり式・賃貸OK"처럼 "・"로 기능을 줄줄이 잇는 SEO식 제목이 많아
    //    "・"도 구분자로 취급합니다. (코카・콜라 같은 고유명사가 갈라지는 부작용보다
    //    기능 나열이 한 덩어리로 뽑히는 문제가 훨씬 흔합니다.)
    .replace(/[【】「」『』〈〉《》〔〕\[\]()（）★☆♪※■◆▶►◎○●▲△▼▽/／＼\\|｜、,，×✕・!！?？]/g, ' ')
    .split(/[\s　]+/)
    .map(t => t.replace(/^[-‐–—~〜]+|[-‐–—~〜]+$/g, '')) // 토큰 양끝의 연결 기호 제거
    .filter(Boolean);
}

function pickMostFrequent<T extends string>(counts: Map<T, number>, tieBreak: (a: T, b: T) => number): T | null {
  let best: T | null = null;
  let bestCount = 1; // 2회 이상 반복된 것만 의미가 있습니다
  for (const [key, count] of counts) {
    if (count > bestCount || (best !== null && count === bestCount && tieBreak(key, best) < 0)) {
      best = key;
      bestCount = count;
    }
  }
  return best;
}

// 두 문자열의 가장 긴 공통 부분 문자열 (예: ロールスクリーン / ロールカーテン → ロール)
function longestCommonSubstring(a: string, b: string): string {
  let best = '';
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        if (dp[i][j] > best.length) best = a.slice(i - dp[i][j], i);
      }
    }
  }
  return best;
}

export function summarizeProductName(name: string): string {
  const tokens = tokenizeName(name);
  const candidates = tokens.filter(t => !isNoiseToken(t));
  if (candidates.length === 0) return simplifyProductName(name);

  // 1) 인접한 두 토큰(바이그램)이 반복되면 그것이 핵심 상품 종류입니다.
  //    예) "세로형 블라인드 … 세로형 블라인드" → "세로형 블라인드"
  const bigramCounts = new Map<string, number>();
  for (let i = 0; i < candidates.length - 1; i++) {
    const bigram = `${candidates[i]} ${candidates[i + 1]}`;
    bigramCounts.set(bigram, (bigramCounts.get(bigram) ?? 0) + 1);
  }
  const repeatedBigram = pickMostFrequent(bigramCounts, (a, b) => a.length - b.length);
  if (repeatedBigram) return repeatedBigram;

  // 2) 단일 토큰이 그대로 반복되면 그것을 씁니다. 동률이면 한자가 포함된 쪽, 그다음 긴 쪽을 우선합니다.
  //    예) "縦型ブラインド … 縦型ブラインド" → "縦型ブラインド"
  const tokenCounts = new Map<string, number>();
  for (const token of candidates) tokenCounts.set(token, (tokenCounts.get(token) ?? 0) + 1);
  const repeatedToken = pickMostFrequent(tokenCounts, (a, b) => {
    const kanjiDiff = Number(KANJI_RE.test(b)) - Number(KANJI_RE.test(a));
    return kanjiDiff !== 0 ? kanjiDiff : b.length - a.length;
  });
  if (repeatedToken) return repeatedToken;

  // 3) 핵심 명사 찾기: 라쿠텐식 제목은 상품 종류를 "ブラインド / アルミブラインド / ブラインドカーテン /
  //    タチカワブラインド"처럼 여러 합성어 안에 반복해서 넣습니다. 그래서 가타카나/한자 덩어리와
  //    덩어리끼리의 공통 부분(ロールスクリーン·ロールカーテン → ロール)을 후보로 만들고,
  //    "몇 개의 토큰 안에 부분 문자열로 들어있는지"를 셉니다. 설명 문장 토큰도 세는 데는 포함합니다
  //    (【レビュー報告でブラインド用お掃除手袋】 안의 ブラインド도 반복 근거가 됨).
  const runsPerToken = candidates.map(token => [
    ...(token.match(KATAKANA_RUN_RE) ?? []),
    ...(token.match(KANJI_RUN_RE) ?? []),
  ]);
  const allRuns = runsPerToken.flat();
  const substringCandidates = new Set<string>(allRuns);
  for (let i = 0; i < allRuns.length; i++) {
    for (let j = i + 1; j < allRuns.length; j++) {
      const common = longestCommonSubstring(allRuns[i], allRuns[j]);
      const isKanji = KANJI_RE.test(common);
      if ((isKanji && common.length >= 2) || (!isKanji && common.length >= 3)) substringCandidates.add(common);
    }
  }
  // 점수를 셀 때 "カード18枚収納"처럼 숫자가 섞인 규격·수량 토큰은 제외합니다. 이런 토큰 안의
  // 단어(カード)까지 세면 실제 상품 종류(財布)보다 점수가 높아지는 오판이 생깁니다.
  const countableTokens = tokens.filter(t => !/[0-9０-９]/.test(t));
  const cleanedName = countableTokens.join(' ');
  let bestSubstring: string | null = null;
  let bestScore = 1; // 2개 이상의 토큰에 들어있어야 "반복"입니다
  for (const sub of substringCandidates) {
    if (isNoiseToken(sub)) continue;
    // 실제로 2개 이상의 토큰에 들어있는 후보만 "반복"으로 인정합니다.
    const occurrences = countableTokens.filter(t => t.includes(sub)).length;
    if (occurrences < 2) continue;
    // 반복된 후보들 사이의 우열을 가릴 때만, 제목 맨 앞(첫 두 후보)에 단독 토큰으로 등장한 단어에
    // 가산점을 줍니다. ("財布 メンズ … カード … カードケース"에서 財布가 カード에 밀리지 않도록)
    // 주의: 이 가산점으로 1회 등장 토큰이 반복으로 승격되면 안 되므로 위 조건 뒤에서만 더합니다.
    const leadBonus = candidates[0] === sub || candidates[1] === sub ? 1 : 0;
    const score = occurrences + leadBonus;
    if (
      score > bestScore ||
      (bestSubstring !== null && score === bestScore && cleanedName.indexOf(sub) < cleanedName.indexOf(bestSubstring))
    ) {
      bestSubstring = sub;
      bestScore = score;
    }
  }
  if (bestSubstring) {
    // 가장 먼저 등장하는 후보 토큰을 돌려줍니다. (ウッド가 승자면 "ウッドブラインド",
    //  ブラインド가 승자면 대개 단독 토큰 "ブラインド"가 가장 앞에 있습니다)
    const host = candidates.find(t => t.includes(bestSubstring!));
    return host ?? bestSubstring;
  }

  // 4) 반복이 전혀 없을 때의 대체 규칙 (제목 앞쪽의 위치가 가장 강한 단서입니다).
  //    a. 첫 후보가 한자로만 된 명사(財布, 時計, 醤油)면 그것 — 라쿠텐식 제목은 상품 종류가 맨 앞에 옵니다.
  //    b. 첫 후보가 가타카나/영문뿐(브랜드일 가능성: ソニー, ルイヴィトン, キッコーマン)이고 두 번째가
  //       한자 명사면 두 번째.
  //    c. 그 외에는 앞 4개 후보 중 가장 긴 것 (ソニー ワイヤレスイヤホン → ワイヤレスイヤホン).
  const isKanjiOnly = (t: string) => /^[一-鿿々]+$/.test(t);
  const [first, second] = candidates;
  if (isKanjiOnly(first)) return first;
  if (second && !KANJI_RE.test(first) && isKanjiOnly(second)) return second;
  return candidates.slice(0, 4).reduce((longest, t) => (t.length > longest.length ? t : longest), first);
}

// 🌟 "미쿠짱 AI 간단 요약" 문장에 들어갈 상품 이름. 전체 이름을 앞에서 자르는 대신
// 핵심 상품 종류만 뽑아 씁니다. 그래도 길면 지정한 길이로 잘라 "..."을 붙입니다.
export function getDisplayedName(name: string, maxLength = 16): string {
  return truncateName(summarizeProductName(name), maxLength);
}

// ─────────────────────────────────────────────────────────────────────────────
// 🌟 "이 상품의 특징" — 상품 상세 설명(주로 라쿠텐 itemCaption, 일본어 원문)에서 이 상품만의
//    특징을 골라 정리합니다. 화면에 뿌려진 뒤 구글 웹 번역이 한국어로 바꿔 줍니다.
//
//    예전 구현은 라벨/표제를 한국어 패턴으로만 찾았고(【상품의 특징】, 상품명 …) ■●※ 항목을 무조건
//    채택해서, 일본어 원문에서는 "使用上の注意 / 紙袋のご用意はできません / 送料…" 같은 주의사항·
//    안내문만 잔뜩 나왔습니다.
//
//    새 규칙:
//    1) 설명을 문장(。！/ 줄바꿈 / ■●※◆ 등 불릿 / 【표제】 / 스펙·섹션 라벨 앞) 단위로 자릅니다.
//    2) 주의사항·배송·보증·선물용도·쿠폰 같은 "상품 자체와 무관한" 문장은 버립니다.
//    3) "商品説明/特徴" 같은 섹션의 본문과, 무엇인지·어떤 점이 좋은지 말하는 설명 문장을 점수로
//       골라 앞에 두고, 내용량·사이즈·소재·원산지 같은 스펙 항목을 "라벨: 값" 형태로 뒤에 붙입니다.
//    4) 최대 6개, 항목당 70자(절 경계에서 자름).
// ─────────────────────────────────────────────────────────────────────────────

const FEATURE_MAX_ITEMS = 6;
const FEATURE_MAX_LENGTH = 70;
const FEATURE_MAX_SENTENCES = 3;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const altOf = (list: string[]) => [...list].sort((a, b) => b.length - a.length).map(escapeRe).join('|');

// 값을 그대로 "라벨: 값" 으로 보여줄 스펙 라벨 (일본어 + 한국어)
const SPEC_LABELS_JA = [
  '個装サイズ', '個装重量', '商品サイズ', '本体サイズ', '本体重量', '箱サイズ', 'パッケージサイズ', '外形寸法',
  '内容量', '容量', 'サイズ', '寸法', '重量', '質量', '素材・材質', '素材', '材質', '組成', '成分', '内容成分',
  '原材料名', '原材料', '原産国', '製造国', '生産国', '生産地', '産地', '原産地', '度数', 'アルコール分', 'アルコール度数',
  'セット内容', '付属品', 'カラー', '型番', '品番', '規格', '入数', '枚数', '組枚数', '収録時間', '収録曲', '対応機種',
  '適合車種', '賞味期限', '保存方法', '製造者', '販売者', '製造元', '販売元', '販売会社', '発売会社', '出版社', '著者',
  '監督', '出演', 'ブランド', 'メーカー', '商品種別', '発売日', '発売年月日', '車種名', '車両型式', '年式', 'エンジン型式',
  '排気量', '駆動方式', 'ホイールサイズ', 'タイヤサイズ', 'ホイールカラー', 'インセット', 'リム幅',
  'モデル', 'スタイル', '液性', '品質表示', '入力電圧', '入力電流', '入力電力', '消費電力', '定格',
  '電源', '全光束', '演色性', '本体', '対象年齢', 'ページ数', '言語', 'ジャンル', '形式', '対応', '仕様',
];
const SPEC_LABELS_KO = [
  '원재료명', '명칭', '내용량', '유통 기한', '유통기한', '보존 방법', '보존방법', '제조 판매원', '제조판매원',
  '사이즈', '소재', '재질', '중량', '원산지', '제조국', '용량', '구성', '색상',
];
// 본문이 "설명 문장" 인 섹션 라벨 (값을 라벨 없이 설명 후보로 올립니다)
const SECTION_LABELS = ['商品説明', '商品概要', '商品詳細', '商品紹介', '商品内容', '商品特徴', '商品特長', '特徴', '特長', 'ポイント', 'おすすめポイント', '상품의 특징', '상품 설명', '상품설명', '특징', '포인트'];
// 값이 상품명·관리코드·판매 상태라 특징이 아닌 라벨 (통째로 버립니다)
const DROP_LABELS = ['商品名', 'JANコード', 'JAN', 'ISBN-10', 'ISBN-13', 'ISBN', 'カテゴリ', '検索用', '状態', '予約締切日', '登録日', '締切日', '상품명', '관리번호'];

const SPEC_ALT = altOf([...SPEC_LABELS_JA, ...SPEC_LABELS_KO]);
const SECTION_ALT = altOf(SECTION_LABELS);
const DROP_ALT = altOf(DROP_LABELS);
const ANY_LABEL_ALT = altOf([...SPEC_LABELS_JA, ...SPEC_LABELS_KO, ...SECTION_LABELS, ...DROP_LABELS]);

// "라벨：값" / "라벨:값" / "【라벨】값" / "라벨（보충）：값" / "라벨 + 숫자" 로 시작하는 줄
// (라벨 뒤 구분자: 】, ：/:, 숫자 시작, 또는 "商品名 FELTA …" 처럼 공백)
const LABEL_LINE_RE = new RegExp(`^(?:【\\s*)?(${ANY_LABEL_ALT})(?:[（(][^）)]{0,12}[）)]|\\[[^\\]]{0,12}\\])?\\s*(?:】|[：:]|(?=\\d)|(?<=[\\s　])(?=[^\\s　]))\\s*(.*)$`);
const SECTION_RE = new RegExp(`^(?:${SECTION_ALT})$`);
const DROP_RE = new RegExp(`^(?:${DROP_ALT})$`);
// 값 뒤에 라벨이 바로 이어 붙는 경우(예: "…94mm、鏡面:130×130mm個装サイズ：24×18×11cm重量…") 를 끊기 위한 단위
const UNIT_TAIL_RE = new RegExp(`((?:mm|cm|m|g|kg|ml|mL|l|L|cc|%|％|度|個|枚|本|束|組|分|時間|円|国|色|W|V|A|Ah|GB|TB|kcal|号|人|台|袋|缶|瓶|箱|セット|巻|枚組|lm|以上|以下|相当|日)|[。）)】」』])(?=(?:${ANY_LABEL_ALT})(?:[：:【]|\\d|(?:${SECTION_ALT})))`, 'g');
// 콜론이 붙은 라벨, 【라벨】, 그리고 콜론 없이 문장 중간에 붙는 섹션/식별 라벨 앞에서 줄을 바꿉니다
const LABEL_COLON_RE = new RegExp(`(?=(?:${ANY_LABEL_ALT})(?:[（(][^）)]{0,12}[）)]|\\[[^\\]]{0,12}\\])?[：:])`, 'g');
const LABEL_BRACKET_RE = new RegExp(`(?=【\\s*(?:${ANY_LABEL_ALT})\\s*】)`, 'g');
const SECTION_INLINE_RE = new RegExp(`(?=(?:${altOf(['商品説明', '商品概要', '商品詳細', '商品紹介', '商品内容', '商品種別', '商品名', '収録内容', 'セット内容', 'ブランド', 'モデル', 'カテゴリ', 'JANコード', '品番', '型番', 'メーカー', '状態', '販売会社', '発売会社', '発売年月日'])}))`, 'g');
// 【…】 는 "표제" 로 쓰일 때만 줄을 바꿉니다: 문장 첫머리·문장 끝 뒤에 오거나, 안의 글이 5자 이상일 때.
// 이름 한가운데의 "nishikawa 【 西川 】 今治…" 같은 짧은 브랜드 표기까지 자르지 않기 위해서입니다.
const HEADING_BRACKET_RE = /(^|[。！!」』）)】\n])(\s*)(?=【)|(?=【\s*[^】]{5,}】)/g;

// 상품 자체와 무관한 문장 (주의·면책·배송·보증·포장·선물 용도·프로모션·문의·판매 조건)
const EXCLUDE_RE = /ご了承|ご注意|注意|ご確認|確認の上|確認事項|下さい|ください|ませんので|ません|ない場合|場合がございます|場合があります|場合は|場合も|限らず|お問合せ|お問い合わせ|お知らせ|ご連絡|ご相談|お願い|業者|送料|発送|出荷|配送|お届け|到着|納期|納品書|紙袋|のし|熨斗|ラッピング|包装|ギフト商品|同梱|転送|在庫|欠品|廃盤|完売|取り寄せ|返品|交換|キャンセル|予約|沖縄|離島|代引|振込|請求|手数料|領収書|クーポン|ポイント|ランキング|レビュー|メール|登録日|締切日|日時指定|指定|用途|内祝|お祝い|御祝|御礼|贈答|お返し|香典|法事|プレゼント|お中元|お歳暮|父の日|母の日|敬老の日|誕生日|お年賀|セール|割引|OFF|お買い得|まとめ買い|点以上|円から|価格|弊社|当店|お客様|ご注文|ご購入|画像|写真|モニター|実物|イメージ|予告なく|メーカー都合|変更になる|異なる場合|異なり|個人差|安全の為|絶対に|保管|使用しないで|しないで|お避け|破損|故障|火災|危険|お子様|説明書|付属しておりません|おりません|別途|必要です|必要な場合|保証|サポート|不良|中古品|動作|タイムラグ|手続き|同一|関しまして|関しては|あらかじめ|予め|詳細はこちら|こちら|状態の表記|表記|書込|書き込み|使用されて|きれいな|保安部品|掲載|基づいて|ホイールにより|により|決済|クレジット|読める|問題なく|番号は|専用器具です|ご登録|頂き|させて頂|関連キーワード|キーワード|併売|해주세요|주세요|주의|배송|송료|무료|반품|교환|취소|문의|선물|재고|안내|보증/;
// 선물 용도·검색어 나열처럼 짧은 낱말이 빽빽이 이어진 줄
const isKeywordList = (s: string) => {
  const words = s.split(/[\s　/／・、,]+/).filter(Boolean);
  return words.length >= 8 && words.filter(w => w.length <= 6).length / words.length > 0.8;
};
// 설명 문장 가산점 요소
const POSITIVE_RE = /特徴|特長|魅力|こだわり|便利|タイプ|対応|搭載|採用|設計|素材|使用|使え|使い|楽しめ|お楽しみ|できます|できる|両面|高倍率|軽量|コンパクト|大容量|防水|耐|新設計|限定|本格|厳選|国産|天然|無添加|手作り|職人|老舗|伝統|収録|セット|付き|機能|効果|快適|丈夫|滑らか|なめらか|柔らか|優しい|香り|味わい|食感|のど越し|甘み|旨み|うま味|コク|強力|しっかり|たっぷり|풍미|식감|편리|기능|소재|특징|장점/;
const NUMERIC_RE = /\d+(?:\.\d+)?\s*(?:mm|cm|m|g|kg|ml|mL|L|cc|%|％|度|個|枚|本|束|組|分|時間|倍|W|V|GB|TB|kcal|号|人|台|袋|缶|瓶|箱|巻|曲|inch|インチ|年|回)/i;
const MARKETING_RE = /人気|おすすめ|話題|ご褒美|お取り寄せ|大人気|売れ筋|定番|激安|お得|格安|訳あり|最安|인기|추천|화제/;

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
}

// 70자를 넘으면 절(、,) 경계에서 자릅니다. 절 경계가 너무 앞이면 그냥 자릅니다.
function truncateFeature(text: string, maxLength = FEATURE_MAX_LENGTH): string {
  if (text.length <= maxLength) return text;
  const head = text.substring(0, maxLength);
  const cut = Math.max(head.lastIndexOf('、'), head.lastIndexOf(','), head.lastIndexOf('，'));
  return (cut >= maxLength * 0.5 ? head.substring(0, cut) : head) + '…';
}

function cleanSegment(s: string): string {
  return s
    .replace(/^[\s　]*[（(]([^（）()]*)[）)][\s　]*$/, '$1') // "(ディズニー)" 처럼 통째로 괄호에 싸인 조각
    .replace(/^[\s　]*[「」『』"'“”）)\]］]+/, '')
    .replace(/^[■※●◆▶►★☆・･◎○□◇▲△▼▽\-–—>＞]+\s*/, '')
    .replace(/^[0-9０-９]+[.．)）]\s*/, '')
    .replace(/^[①-⑳]\s*/, '')
    .replace(/[\s　]+/g, ' ')
    .replace(/[／/]\s*$/, '')
    .trim();
}

/** 설명문을 문장/항목 단위로 자릅니다. (테스트·디버깅용으로도 씁니다) */
export function splitDescriptionSegments(description: string): string[] {
  let text = decodeEntities(
    description
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:p|div|li|tr|h[1-6])>/gi, '\n')
      .replace(/<[^>]+>/g, '')
  );
  text = text
    .replace(/([。！!])/g, '$1\n')
    .replace(/([■※●◆▶►★☆◎□◇▲▼]|\s・)/g, '\n$1')
    .replace(HEADING_BRACKET_RE, '$1$2\n')
    .replace(LABEL_BRACKET_RE, '\n')
    .replace(UNIT_TAIL_RE, '$1\n')
    .replace(LABEL_COLON_RE, '\n')
    .replace(SECTION_INLINE_RE, '\n');
  return text.split('\n').map(cleanSegment).filter(s => s.length >= 4);
}

// 스펙 값이 구분자 없이 다음 항목/문장으로 이어지는 경우("日本（今治）思わず…", "7.8LIH使用不可内容量1個材質…")
// 1) 값 안에서 다른 라벨이 시작되는 지점, 2) 단위·닫는 괄호 바로 뒤에 가나/한자 문장이 이어지는 지점에서 자릅니다.
const VALUE_LABEL_START_RE = new RegExp(`(?=(?:${ANY_LABEL_ALT})(?:[（(【：:]|\\d|[぀-ゟ゠-ヿ一-鿿]))`);
// ("日" 은 "日本" 의 첫 글자와 겹치므로 단위로 취급하지 않습니다)
const VALUE_TAIL_RE = /((?:mm|cm|m|g|kg|ml|mL|L|cc|%|％|度|個|枚|本|束|組|分|時間|円|W|V|A|GB|TB|kcal|号|台|袋|缶|瓶|箱|巻|セット|以上|以下)|[）)】」』])(?=[぀-ゟ゠-ヿ一-鿿])/;
function trimSpecValue(value: string): string {
  let v = value.split(VALUE_LABEL_START_RE)[0];
  const m = v.match(VALUE_TAIL_RE);
  if (m && m.index !== undefined) v = v.substring(0, m.index + m[0].length);
  return v.replace(/[、,，\s]+$/, '').trim();
}

/** 한 세그먼트가 어떤 종류인지 알려줍니다. (테스트·디버깅용) */
export function describeSegment(seg: string): { kind: 'spec' | 'section' | 'drop' | 'excluded' | 'sentence' | 'skip'; label?: string; value?: string } {
  const labelled = seg.match(LABEL_LINE_RE);
  if (labelled) {
    const label = labelled[1];
    const value = (labelled[2] || '').replace(/^[：:]\s*/, '').trim();
    if (DROP_RE.test(label)) return { kind: 'drop', label, value };
    if (!value) return { kind: 'skip', label };
    if (SECTION_RE.test(label)) return (EXCLUDE_RE.test(value) || isKeywordList(value)) ? { kind: 'excluded', label, value } : { kind: 'section', label, value };
    const trimmed = trimSpecValue(value);
    if (!trimmed) return { kind: 'skip', label };
    if (EXCLUDE_RE.test(trimmed) && !NUMERIC_RE.test(trimmed)) return { kind: 'excluded', label, value: trimmed };
    return { kind: 'spec', label, value: trimmed };
  }
  const bare = seg.replace(/^【[^】]*】\s*/, '');
  if (!bare || bare.length < 6) return { kind: 'skip' };
  if (EXCLUDE_RE.test(bare) || isKeywordList(bare)) return { kind: 'excluded', value: bare };
  if (/^[\w\-_.]+$/.test(bare)) return { kind: 'skip', value: bare }; // fk094igrjs 같은 관리 코드
  return { kind: 'sentence', value: bare };
}

export function extractProductFeatures(description?: string | null): string[] {
  if (!description) return [];

  const segments = splitDescriptionSegments(description);
  if (segments.length === 0) return [];

  const specs: string[] = [];
  const sentences: { text: string; score: number; index: number }[] = [];
  // 🐛 스펙 목록과 최종 목록이 같은 "본 항목" 집합을 공유하면, 스펙을 최종 목록으로 옮길 때
  //    전부 "이미 본 항목" 으로 걸러져 스펙이 하나도 안 나왔습니다. 배열마다 따로 중복을 봅니다.
  const push = (arr: string[], value: string) => {
    const v = truncateFeature(value.trim());
    if (!v || arr.includes(v)) return;
    arr.push(v);
  };
  const scoreSentence = (bare: string): number => {
    let score = 0;
    if (POSITIVE_RE.test(bare)) score += 2;
    if (NUMERIC_RE.test(bare)) score += 1;
    if (MARKETING_RE.test(bare)) score -= 2;
    if (bare.length >= 12 && bare.length <= 90) score += 1;
    if (bare.length < 10) score -= 1;
    if (/[。！!]$/.test(bare) || /です|ます|ました|である|다\.?$/.test(bare)) score += 1;
    return score;
  };

  segments.forEach((seg, index) => {
    const d = describeSegment(seg);
    if (d.kind === 'spec') push(specs, `${d.label}: ${d.value}`);
    else if (d.kind === 'section') sentences.push({ text: d.value!, score: scoreSentence(d.value!) + 2, index });
    else if (d.kind === 'sentence') sentences.push({ text: d.value!, score: scoreSentence(d.value!), index });
  });

  // 설명 문장: 점수 상위 N개를 원문 순서대로 → 그 뒤에 스펙
  const topSentences = sentences
    .filter(s => s.score >= 1)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, FEATURE_MAX_SENTENCES)
    .sort((a, b) => a.index - b.index);

  const features: string[] = [];
  topSentences.forEach(s => push(features, s.text));
  specs.slice(0, FEATURE_MAX_ITEMS - features.length).forEach(s => push(features, s));

  // 아무것도 못 골랐으면 설명 첫 문장 하나. 단, 남은 문장이 판매 조건뿐인 중고 도서처럼
  // 점수가 음수인 잡음만 있으면 차라리 비워 둡니다(섹션이 통째로 숨겨집니다).
  if (features.length === 0) {
    const first = sentences.find(s => s.score >= 1);
    if (first) push(features, first.text);
  }

  return features.slice(0, FEATURE_MAX_ITEMS);
}

// ─────────────────────────────────────────────────────────────────────────────
// 🌟 "상품 상세 설명" 을 읽기 좋게 나누기
//
//    라쿠텐 itemCaption 은 줄바꿈 없이 통째로 오는 경우가 많습니다(표본 233건 중 18%).
//    형태는 두 가지입니다.
//      (가) 라벨과 값이 구분자 없이 붙은 벽: "メーカー名Espelir商品名Downsusメーカー品番ESM-3064F…"
//      (나) "。" 로만 이어진 산문: "…カラーチェンジ！ジェルタイプのワンデーカラー。その日の気分で…"
//    예전에는 ■※●◆▶► 와 【 앞에서만 줄을 나눠서, 이 기호가 없는 설명은 한 줄로 쭉 나왔습니다.
//    → 문장 부호(。！？)와 "알려진 라벨" 앞에서도 나눕니다.
//
//    ⚠️ 라벨로 끊을 때 가장 위험한 것은 합성어를 잘라먹는 것입니다
//       (ワンデー|カラー, 保湿|成分, 総|重量, 外観・|仕様). 그래서
//       - "個装サイズ·広告文責" 처럼 길고 분명한 라벨(STRONG)만 앞말이 한자·가타카나여도 끊고,
//       - "サイズ·重量·カラー" 같은 짧고 흔한 라벨은 앞이 확실한 경계(줄 시작·영숫자·문장부호)이고
//         뒤에 값(숫자·영문·콜론)이 올 때만 끊습니다.
// ─────────────────────────────────────────────────────────────────────────────

/** 상세 설명에만 나오는 라벨 (요약용 목록에 더해 씁니다) */
const DESCRIPTION_EXTRA_LABELS = [
  'メーカー名', 'メーカー品番', 'メーカー希望小売価格', '商品番号', '品名', '数量',
  '自動車メーカー', '車種', '型式', '駆動', '適合詳細', '適合情報', '備考', '特記事項',
  '注意事項', '使用上の注意', 'ご使用方法', '使用方法', 'お手入れ方法',
  '商品区分', '広告文責', '販売業者', '区分', '製品仕様', '商品仕様', 'スペック',
  '生産国', '原産国', '使用期限', '検索キーワード', '関連キーワード', '総重量', '総内容量',
  'お届け数', '配送料について', '送料について', '商品説明文', '商品コード', '商品名称', 'ブランド名',
];
/** 앞말이 한자·가타카나여도 끊어도 되는, 길고 분명한 라벨 */
const DESCRIPTION_STRONG_LABELS = new Set([
  '個装サイズ', '個装重量', '商品サイズ', '本体サイズ', '本体重量', '箱サイズ', 'パッケージサイズ', '外形寸法',
  '素材・材質', 'セット内容', '原材料名', '賞味期限', '保存方法', '製造販売元', '販売元', '製造元', '販売会社',
  '発売会社', '製造国', '生産国', '原産国', '原産地', 'メーカー名', 'メーカー品番', 'メーカー希望小売価格',
  'JANコード', 'ISBN-10', 'ISBN-13', '自動車メーカー', '適合詳細', '適合情報', '注意事項', '使用上の注意',
  'ご使用方法', '使用方法', 'お手入れ方法', '商品区分', '広告文責', '販売業者', '特記事項', '商品説明',
  '商品概要', '商品詳細', '商品紹介', '商品内容', '商品種別', '商品番号', '商品仕様', '製品仕様',
  '発売日', '発売年月日', '収録時間', '対応機種', 'アルコール分', 'アルコール度数', '検索キーワード',
  '関連キーワード', '品質表示', '入力電圧', '入力電流', '入力電力', '消費電力', '演色性', '全光束',
  'エンジン型式', '排気量', '駆動方式', '車両型式', '車種名', '総重量', '総内容量', '対象年齢', 'ページ数',
  '商品名', '商品名称', '商品コード', 'ブランド名',
  '원재료명', '유통기한', '보존방법', '제조판매원', '원산지', '제조국',
]);
const DESCRIPTION_LABELS = Array.from(new Set([
  ...SPEC_LABELS_JA, ...SPEC_LABELS_KO, ...SECTION_LABELS, ...DROP_LABELS, ...DESCRIPTION_EXTRA_LABELS,
])).sort((a, b) => b.length - a.length);

const DESC_BULLET_CHARS = '■※●◆▶►★☆◎□◇▲▼';
const DESC_BULLET_RE = new RegExp(`([${DESC_BULLET_CHARS}]|【)`, 'g');
// 라벨 앞이 "값이 끝난 자리"로 보이는 경우. ("・"는 素材・材質, 外観・仕様처럼 낱말을 잇는 기호라 제외)
const DESC_STRICT_BOUNDARY_RE = /[A-Za-z0-9０-９）)】」』\]］。、，,！!？?／/\s　\-–—:：]/;
// 그보다 약한 근거 (가타카나·한자 뒤). STRONG 라벨이고 "라벨 벽"일 때만 인정합니다.
const DESC_LOOSE_BOUNDARY_RE = /[゠-ヿー一-鿿々]/;
const DESC_HIRAGANA_RE = /[぀-ゟ]/;
// 짧고 흔한 라벨은 뒤에 이런 "값"이 와야 라벨로 인정합니다.
const DESC_VALUE_START_RE = /[：:0-9０-９A-Za-zＡ-Ｚａ-ｚ（(]/;
// 라쿠텐 시스템 코드 (fk094igrjs 처럼 설명 끝에 붙습니다)
const DESC_SYSTEM_CODE_RE = /fk[a-z0-9]{6,}/gi;

/** text 의 i 위치에서 시작하는 가장 긴 라벨을 찾습니다. (라벨로 인정할지는 아래 함수가 판단) */
function matchDescriptionLabelAt(text: string, i: number): string | null {
  for (const label of DESCRIPTION_LABELS) {
    if (text.startsWith(label, i)) return label;
  }
  return null;
}

/** 이 자리를 "항목의 시작"으로 볼지 판단합니다. */
function isDescriptionLabelHere(text: string, i: number, label: string): boolean {
  const next = text[i + label.length];
  if (next === undefined) return false; // 문장 끝이면 라벨로 보지 않습니다
  // STRONG 라벨은 값이 히라가나로 시작해도 됩니다 ("注意事項ご注文数量により…")
  if (DESCRIPTION_STRONG_LABELS.has(label)) return true;
  if (DESC_HIRAGANA_RE.test(next)) return false; // "対応しています" 처럼 뒤에 조사가 오면 라벨이 아닙니다
  // 짧고 흔한 라벨은 뒤에 값(숫자·영문·콜론)이 오거나, 곧바로 다음 라벨이 이어질 때만 인정합니다.
  return DESC_VALUE_START_RE.test(next) || matchDescriptionLabelAt(text, i + label.length) !== null;
}

/** 라벨 앞에 줄바꿈을 넣습니다. (가장 긴 라벨부터 매칭하고 그만큼 건너뛰어 "エンジン型式" 안의 "型式"은 건드리지 않습니다) */
function insertDescriptionLabelBreaks(text: string): string {
  const marks: { at: number; strict: boolean; strong: boolean }[] = [];
  for (let i = 0; i < text.length;) {
    const label = matchDescriptionLabelAt(text, i);
    if (!label) { i++; continue; }
    if (!isDescriptionLabelHere(text, i, label)) { i += label.length; continue; }

    const prev = i > 0 ? text[i - 1] : '\n';
    const atLineStart = i === 0 || prev === '\n';
    marks.push({
      at: i,
      strict: atLineStart || DESC_STRICT_BOUNDARY_RE.test(prev),
      strong: DESCRIPTION_STRONG_LABELS.has(label),
    });
    i += label.length;
  }
  if (marks.length === 0) return text;

  // 확실한 라벨이 하나라도 있으면 "라벨을 쓰는 설명"으로 보고, 한자·가타카나 뒤에 붙은 STRONG 라벨까지 끊습니다.
  const useLoose = marks.some(m => m.strict);
  const applied = marks.filter(m =>
    m.strict || (useLoose && m.strong && DESC_LOOSE_BOUNDARY_RE.test(text[m.at - 1] ?? ''))
  );
  if (applied.length === 0) return text;

  let out = '';
  let cursor = 0;
  for (const m of applied) {
    if (m.at === 0) continue;
    out += text.slice(cursor, m.at);
    if (out !== '' && !/\n\s*$/.test(out)) out += '\n';
    cursor = m.at;
  }
  return out + text.slice(cursor);
}

export type DescriptionBlock = {
  /** 앞머리 표식 (【표제】, ■ 같은 기호, 또는 "メーカー名" 같은 라벨). 없으면 null */
  marker: string | null;
  text: string;
};

/**
 * 상품 상세 설명을 화면에 뿌리기 좋은 블록 목록으로 나눕니다.
 * (야후 옥션처럼 원문이 HTML 인 경우는 호출하는 쪽에서 sanitize 후 그대로 렌더링합니다)
 */
export function splitDescriptionForDisplay(description?: string | null): DescriptionBlock[] {
  if (!description) return [];

  let text = decodeEntities(
    description
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:p|div|li|tr|h[1-6])>/gi, '\n')
      .replace(/<[^>]+>/g, '')
  ).replace(DESC_SYSTEM_CODE_RE, ' ');

  text = text.replace(DESC_BULLET_RE, '\n$1');
  text = insertDescriptionLabelBreaks(text);
  // 문장 끝에서 줄바꿈 (닫는 괄호·따옴표가 이어지면 그것까지 포함해서 끊습니다)
  text = text.replace(/([。！？][」』）)\]］]?)/g, '$1\n');

  const lines = text.split('\n').map(s => s.replace(/[\s　]+/g, ' ').trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const blocks: DescriptionBlock[] = [];
  for (const line of lines) {
    const symbol = line.match(/^(【[^】]*】|[■※●◆▶►★☆◎□◇▲▼])\s*([\s\S]*)$/);
    if (symbol) {
      blocks.push({ marker: symbol[1], text: symbol[2].trim() });
      continue;
    }
    const label = matchDescriptionLabelAt(line, 0);
    // 값 없이 라벨만 있는 줄("サイズ", "特徴")은 그 자체가 소제목입니다.
    if (label === line) {
      blocks.push({ marker: line, text: '' });
      continue;
    }
    const isLabel = !!label && (
      /^[\s　：:・]/.test(line[label.length] ?? '') || isDescriptionLabelHere(line, 0, label)
    );
    const rest = isLabel ? line.slice(label!.length).replace(/^[\s　：:・]+/, '').trim() : '';
    if (isLabel && rest) blocks.push({ marker: label, text: rest });
    else blocks.push({ marker: null, text: line });
  }

  // 표식 없는 짧은 문장이 잘게 흩어지지 않도록, 이어지는 산문은 한 문단으로 묶습니다.
  const merged: DescriptionBlock[] = [];
  for (const block of blocks) {
    const prev = merged[merged.length - 1];
    if (block.marker === null && prev && prev.marker === null && (prev.text.length + block.text.length) <= 90) {
      prev.text = `${prev.text} ${block.text}`;
      continue;
    }
    merged.push({ ...block });
  }
  return merged.filter(b => b.marker || b.text);
}
