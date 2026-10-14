'use client';

// 🎨 styled-jsx(<style jsx>) 를 서버에서 그린 HTML 에 미리 넣어 줍니다.
//
//  🐛 앱 라우터에서는 이 등록기가 없으면 헤더·푸터·가이드 등의 <style jsx> 가 서버 HTML 에 빠지고,
//     자바스크립트가 실행된 뒤에야 붙었습니다. 그래서 처음 열 때(특히 느린 휴대폰)
//     잠깐 모양 없는 화면이 보이고, 모바일 메뉴(드로어)가 펼쳐진 채로 나왔다가 닫히는 모습이 보였습니다.
//  (Next.js 공식 안내의 styled-jsx 등록기 방식)

import { useState, type ReactNode } from 'react';
import { useServerInsertedHTML } from 'next/navigation';
import { StyleRegistry, createStyleRegistry } from 'styled-jsx';

export default function StyledJsxRegistry({ children }: { children: ReactNode }) {
  // 처음 한 번만 만들기 (요청마다 하나)
  const [registry] = useState(() => createStyleRegistry());

  useServerInsertedHTML(() => {
    const styles = registry.styles();
    registry.flush();
    return <>{styles}</>;
  });

  return <StyleRegistry registry={registry}>{children}</StyleRegistry>;
}
