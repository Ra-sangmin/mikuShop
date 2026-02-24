'use client';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SortBar({ currentSort , setSelectedItem }: any) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSortClick = (sortType: string) => {
    
    setSelectedItem(null);

    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', sortType);
    params.set('page', '1');
    router.push(`/main_shop/rakuten?${params.toString()}`);
  };

  const sortOptions = [
    { id: 'standard', label: '기본순' },
    { id: '-updateTimestamp', label: '최신등록순' },
    { id: '-reviewCount', label: '조회수많은순' },
    { id: '-itemPrice', label: '가격높은순' },
    { id: '%2BitemPrice', label: '가격낮은순' },
  ];

  return (

    <div className="sort-filter-bar notranslate" style={{
        margin: '20px 0',
        borderTop: '1px solid #ddd',
        borderBottom: '1px solid #ddd',
        padding: '10px 0',
        display: 'flex' // 정렬 버튼들을 가로로 나열하기 위함
      }}>

      {sortOptions.map((opt) => (
        <button
          key={opt.id}
          onClick={() => handleSortClick(opt.id)}
          style={{
            fontSize: '18px',
            fontWeight: currentSort === opt.id ? 'bold' : 'normal',
            color: currentSort === opt.id ? 'black' : 'gray',
            marginRight: '20px',
            cursor: 'pointer',
            border: 'none',
            background: 'none'
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}