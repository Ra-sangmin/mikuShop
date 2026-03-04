"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

// 인터페이스 정의
interface MercariCategory {
  id: string;
  name: string;
  parentId: string | null;
  isLeaf: boolean;
  updatedAt: string;
}

export default function MercariCategoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCatId = searchParams.get('cat') || '';

  // 💡 상태 선언 확인
  const [categories, setCategories] = useState<MercariCategory[]>([]);
  const [isLeaf, setIsLeaf] = useState(false); 
  const [isLoading, setIsLoading] = useState(false);
  const [path, setPath] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/mercari/categories${currentCatId ? `?parentId=${currentCatId}` : ''}`);
        const result = await res.json();
        
        if (result.success) {
          setCategories(result.data);
          setIsLeaf(result.isLeaf || false);
        }
      } catch (err) {
        console.error("데이터 로딩 실패", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [currentCatId]);

  const handleMove = (id: string, name: string) => {
    if (!id) setPath([]);
    else {
      const exists = path.find(p => p.id === id);
      if (!exists) setPath([...path, { id, name }]);
    }
    router.push(`/main_shop/mercari?cat=${id}`);
  };

  return (
    <div className="max-w-6xl mx-auto p-8 bg-gray-50 min-h-screen">
      {/* 브레드크럼 */}
      <nav className="flex gap-2 mb-6 text-sm text-gray-400">
        <span className="cursor-pointer hover:text-pink-500" onClick={() => handleMove('', '')}>HOME</span>
        {path.map((p) => (
          <span key={p.id}>/ <span className="text-gray-600">{p.name}</span></span>
        ))}
      </nav>

      <div className="bg-white border border-gray-200 rounded-2xl p-10 shadow-sm relative min-h-[300px]">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-20">
            <div className="animate-spin h-8 w-8 border-4 border-pink-500 border-t-transparent rounded-full"></div>
          </div>
        )}

        {/* 💡 카테고리 출력부 */}
        {!isLeaf && categories.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {categories.map((cat) => (
              <div 
                key={cat.id} 
                onClick={() => handleMove(cat.id, cat.name)}
                className="text-[14px] text-gray-600 hover:text-pink-500 cursor-pointer p-2 hover:bg-pink-50 rounded-lg transition"
              >
                {cat.name}
              </div>
            ))}
          </div>
        ) : !isLoading && isLeaf ? (
          <div className="text-center py-20">
            <p className="text-gray-500 mb-6 font-bold">마지막 단계 카테고리입니다.</p>
            <button className="bg-pink-500 text-white px-8 py-3 rounded-xl font-bold">상품 전체보기</button>
          </div>
        ) : !isLoading && (
          <div className="text-center py-20 text-gray-400">데이터가 없습니다.</div>
        )}
      </div>
    </div>
  );
}