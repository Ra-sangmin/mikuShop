// 🤖 /ai-search — AI 통합 검색 전용 페이지
import type { Metadata } from 'next';
import { Suspense } from 'react';
import AiSearchChat from './AiSearchChat';

export const metadata: Metadata = {
  title: 'AI 쇼핑 비서 | 미쿠짱',
  description: '메루카리·라쿠텐·야후 쇼핑·야후 옥션을 한국어 한 문장으로 한 번에 검색하세요.',
};

export default function AiSearchPage() {
  // useSearchParams 를 쓰는 클라이언트 컴포넌트는 Suspense 로 감싸야 합니다.
  return (
    <Suspense fallback={null}>
      <AiSearchChat />
    </Suspense>
  );
}
