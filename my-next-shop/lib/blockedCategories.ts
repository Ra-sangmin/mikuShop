// 🚫 손님에게 내보내지 않는 카테고리
//
// 미쿠짱은 구매대행·배송대행이라 한국으로 들여올 수 없는 물건은 처음부터 보여주지 않습니다.
// 이용약관 제10조(서비스 대상 물품)에 이미 "의약품"이 금지 품목으로 적혀 있고,
// 목록통관 배제대상에도 의약품·한약재가 들어 있습니다. 콘택트렌즈는 한국에서 의료기기라
// 개인이 해외직구로 들여올 때 제약이 있습니다.
//
// 약관에 글로만 적어두면 손님이 카테고리를 타고 들어가 주문을 넣고, 관리자가 뒤늦게
// 취소해야 합니다. 그래서 목록 자체에서 지웁니다.
//
// ⚠️ 여기에 적은 카테고리는 **카테고리 동기화가 다시 켜지 못합니다.**
//    (lib/rakutenGenres.ts 의 동기화가 매번 isActive=true 로 되살리기 때문에,
//     DB 의 isActive 만 꺼두면 다음 동기화 때 되살아납니다)

/** 판매처별로 감출 카테고리 ID. 값은 그 판매처의 카테고리(장르) 번호입니다. */
const BLOCKED: Record<string, { id: number; name: string; reason: string }[]> = {
  rakuten: [
    { id: 551169, name: '医薬品・コンタクト・介護', reason: '의약품·콘택트렌즈 — 수입 제한' },
  ],
  // 야후쇼핑·야후옥션·메루카리는 현재 쓰는 카테고리 목록에 해당 분류가 없습니다.
  // (검사 방법: 카테고리 표의 이름에서 医薬/コンタクト 를 찾습니다)
  yahoo_shopping: [],
  yahoo_auction: [],
  mercari: [],
  // 🛒 아마존은 ドラッグストア(160384011) 부문 전체가 의약품·콘택트렌즈라 카테고리 목록에
  //    아예 넣지 않습니다. 넣지 않은 것은 여기 적을 필요가 없지만, 나중에 누군가
  //    "왜 드럭스토어가 없지?" 하고 되살리지 않도록 이유를 남겨 둡니다.
  amazon: [
    { id: 160384011, name: 'ドラッグストア', reason: '의약품·콘택트렌즈 — 수입 제한' },
  ],
};

/** 그 판매처에서 감출 카테고리 ID 집합. (라쿠텐·야후처럼 숫자 ID 를 쓰는 곳) */
export function blockedCategoryIds(platform: string): Set<number> {
  return new Set((BLOCKED[platform] ?? []).map(c => c.id));
}

/**
 * 문자열 ID 를 쓰는 판매처용. (아마존 노드 ID 는 11자리까지 나와 문자열로 둡니다)
 * 숫자 표기가 같으면 같은 카테고리로 봅니다.
 */
export function blockedCategoryIdStrings(platform: string): Set<string> {
  return new Set((BLOCKED[platform] ?? []).map(c => String(c.id)));
}

/** 이 카테고리를 손님에게 보여도 되는지. 숫자·문자열 어느 쪽으로 물어도 됩니다. */
export function isBlockedCategory(platform: string, genreId: number | string): boolean {
  return blockedCategoryIdStrings(platform).has(String(genreId));
}

/** 관리자 화면·로그에서 "왜 빠졌는지" 설명할 때 씁니다. */
export function blockedCategoryList(platform: string) {
  return BLOCKED[platform] ?? [];
}
