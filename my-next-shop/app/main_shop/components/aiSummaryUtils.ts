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

// 🌟 이름 정리 + 길이 제한을 한 번에 적용하는 편의 함수
export function getDisplayedName(name: string, maxLength = 10): string {
  return truncateName(simplifyProductName(name), maxLength);
}

function truncateFeature(text: string, maxLength = 70): string {
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// 🌟 브라켓 없이 라벨만 나열되는 스펙 정보(예: "상품명 ... 보존 방법 ...")도 항목별로 나눌 수
// 있도록, 이 라벨들 앞에도 줄바꿈을 삽입합니다.
const SPEC_LABELS = [
  '상품명', '원재료명', '명칭', '영양 성분 표시', '영양성분표시', '내용량',
  '유통 기한', '유통기한', '보존 방법', '보존방법', '제조 판매원', '제조판매원',
];

// 🌟 "상품 상세 설명"에서 이 상품만의 특징을 여러 개 뽑아냅니다.
// 1) "【상품의 특징】" 같은 표제가 있으면 그 내용을 최우선으로 포함하고,
// 2) 배송/재고 안내가 아닌 ■/※/● 항목들을 모두 포함하고,
// 3) 라벨 없이 나열된 스펙 정보(상품명/원재료명/보존 방법 등)도 각각 별도 항목으로 포함합니다.
// 4) 위 어디에도 해당하지 않으면 설명 맨 앞부분 하나만 사용합니다.
// 🌟 야후 옥션처럼 description이 raw HTML로 오는 경우도 있어, <br>은 줄바꿈으로 바꾸고
// 나머지 태그는 전부 제거한 뒤 처리합니다.
export function extractProductFeatures(description?: string | null): string[] {
  if (!description) return [];

  let normalized = description
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '') // 남은 HTML 태그 제거 (야후 옥션 description 대응)
    .replace(/([■※●◆▶►]|【)/g, '\n$1');

  for (const label of SPEC_LABELS) {
    normalized = normalized.split(label).join('\n' + label);
  }

  const lines = normalized.split('\n').map(s => s.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const features: string[] = [];
  const seen = new Set<string>();
  const addFeature = (raw: string) => {
    const content = truncateFeature(raw.trim());
    if (content && !seen.has(content)) {
      seen.add(content);
      features.push(content);
    }
  };

  const labeledLine = lines.find(line => /^【\s*(?:상품의\s*)?(?:특징|포인트|매력)\s*】/.test(line));
  if (labeledLine) {
    addFeature(labeledLine.replace(/^【[^】]*】\s*/, ''));
  }

  lines
    .filter(line => /^[■※●]/.test(line) && !/무료|배송|우송|송료|한정품|재고/.test(line))
    .forEach(line => addFeature(line.replace(/^[■※●]\s*/, '')));

  lines
    .filter(line => SPEC_LABELS.some(label => line.startsWith(label)))
    .forEach(line => addFeature(line));

  if (features.length === 0) {
    const plainLine = lines.find(line => !/^(?:【|[■※●])/.test(line)) || lines[0];
    addFeature(plainLine);
  }

  return features.slice(0, 6);
}
