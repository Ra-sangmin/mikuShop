-- AI 검색 추천 태그에 뜨는 오타 검색어("캐핑 갈 때 쓸 가벼운 랜턴 추천해줘")를 기록에서 지웁니다.
-- 실행: npx prisma db execute --file scripts/delete-ai-search-typo.sql --schema prisma/schema.prisma
DELETE FROM ai_search_logs WHERE query LIKE '캐핑 갈 때 쓸 가벼운 랜턴%';
