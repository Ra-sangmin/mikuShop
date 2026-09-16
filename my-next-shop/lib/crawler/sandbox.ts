// 🔒 Chrome 샌드박스 정책 (크롤러 공용)
//
// 크롤러는 외부 쇼핑몰의 신뢰할 수 없는 페이지를 렌더링합니다. 이때 --no-sandbox를 켜면
// Chrome 렌더러가 뚫렸을 때 곧바로 서버 호스트 권한으로 이어질 수 있습니다.
// 따라서 기본값은 "샌드박스 켬"이고, 컨테이너/root 실행처럼 샌드박스를 쓸 수 없는
// 환경에서만 PUPPETEER_DISABLE_SANDBOX=1 로 명시적으로 꺼야 합니다.
//
// 참고: Docker에서는 --no-sandbox 대신 --cap-add=SYS_ADMIN 또는 seccomp 프로파일을
// 지정하는 편이 안전합니다.

/** 샌드박스를 끄도록 명시적으로 설정했는지 여부 */
export const isSandboxDisabled = process.env.PUPPETEER_DISABLE_SANDBOX === '1';

/** 샌드박스 관련 실행 인자. 기본은 빈 배열(= 샌드박스 활성). */
export const SANDBOX_ARGS: string[] = isSandboxDisabled
  ? ['--no-sandbox', '--disable-setuid-sandbox']
  : [];

if (isSandboxDisabled && process.env.NODE_ENV === 'production') {
  console.warn(
    '[보안 경고] PUPPETEER_DISABLE_SANDBOX=1 이라 Chrome 샌드박스가 꺼진 채로 실행됩니다. ' +
    '신뢰할 수 없는 페이지를 크롤링하므로 가능하면 컨테이너 권한 설정으로 해결하세요.'
  );
}
