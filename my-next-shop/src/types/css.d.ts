// Next.js는 next-env.d.ts를 통해 *.module.css(CSS 모듈)에 대한 타입 선언만 자동으로
// 제공하고, import './x.css'처럼 일반 전역 CSS를 부수 효과로 가져오는 경우는 선언이
// 없어서 TS 언어 서버가 "모듈을 찾을 수 없습니다(ts(2882))" 오류를 표시합니다.
// 실제 빌드(next dev/build)는 이 값과 무관하게 정상 동작하지만, 에디터의 빨간 밑줄을
// 없애기 위해 일반 .css 파일에 대한 타입을 선언해 둡니다.
declare module '*.css';
