"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProductDetail from '../rakuten/ProductDetail';
import { useExchangeRate } from '../context/ExchangeRateContext';

export default function WishlistPage() {
  const router = useRouter();
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const { exchangeRate } = useExchangeRate();
  const detailRef = useRef<HTMLDivElement>(null);

  // ★ 브라우저 뒤로가기 제어
  useEffect(() => {
    if (selectedItem) {
      window.history.pushState({ isDetail: true }, "");
    }

    const handlePopState = (event: PopStateEvent) => {
      if (selectedItem) {
        setSelectedItem(null);
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedItem]);

  useEffect(() => {
    // 자동 번역을 위한 쿠키 설정
    const domain = window.location.hostname;
    document.cookie = `googtrans=/ja/ko; path=/;`;
    document.cookie = `googtrans=/ja/ko; domain=${domain}; path=/;`;

    const savedWishlist = JSON.parse(localStorage.getItem('rakutenWishlist') || '[]');
    setWishlist(savedWishlist);
  }, []);

  const updateCounts = () => {
    const savedWishlist = JSON.parse(localStorage.getItem('rakutenWishlist') || '[]');
    setWishlist(savedWishlist);
  };

  const handleRemove = (itemId: string) => {
    const updatedWishlist = wishlist.filter((item) => item.itemId !== itemId);
    setWishlist(updatedWishlist);
    localStorage.setItem('rakutenWishlist', JSON.stringify(updatedWishlist));
  };

  const handleRemoveSelected = () => {
    if (selectedItems.length === 0) {
      alert("삭제할 상품을 선택해주세요.");
      return;
    }
    if (confirm("선택한 상품을 삭제하시겠습니까?")) {
      const updatedWishlist = wishlist.filter((item) => !selectedItems.includes(item.itemId));
      setWishlist(updatedWishlist);
      localStorage.setItem('rakutenWishlist', JSON.stringify(updatedWishlist));
      setSelectedItems([]);
    }
  };

  const toggleItemSelection = (itemId: string) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(selectedItems.filter(id => id !== itemId));
    } else {
      setSelectedItems([...selectedItems, itemId]);
    }
  };

  const toggleAllSelection = () => {
    if (selectedItems.length === wishlist.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(wishlist.map(item => item.itemId));
    }
  };

  const handleItemClick = (item: any) => {
    setSelectedItem(item);
    setTimeout(() => {
      if (detailRef.current) {
        detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px', fontFamily: 'dotum, sans-serif', color: '#333' }}>
      
      <div ref={detailRef} style={{ scrollMarginTop: '20px' }}>
      {selectedItem && (
        <div style={{ 
            position: 'relative',    
            width: '100%',            
            margin: '20px auto 40px',     
            backgroundColor: '#fff',
            border: '1px solid #ddd',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
            zIndex: 1000
        }}>
          <div style={{ textAlign: 'right' }}>
            <button 
              onClick={() => setSelectedItem(null)}
              style={{ 
                position: 'absolute', top: '-15px', right: '-20px', width: '50px', height: '50px',
                borderRadius: '50%', backgroundColor: '#fff', border: '2px solid #333',
                fontSize: '25px', fontWeight: 'bold', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                zIndex: 1001
              }}
            >
              X
            </button>
          </div>
          <ProductDetail 
            item={selectedItem} 
            exchangeRate={exchangeRate} 
            onCartUpdate={updateCounts}
          />
        </div>
      )}
      </div>

      {/* 1. 헤더 */}
      <h2 style={{ fontSize: '28px', fontWeight: 'bold', paddingBottom: '15px', borderBottom: '2px dashed #ccc', marginBottom: '30px' }}>
        관심물품보기
      </h2>

      {/* 2. 회원등급 및 사이버머니 */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px', border: '1px solid #ddd', fontSize: '16px' }}>
        <tbody>
          <tr>
            <td style={{ width: '50%', padding: '15px', backgroundColor: '#f9f9f9', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>회원등급</td>
            <td style={{ width: '50%', padding: '15px', border: '1px solid #ddd', textAlign: 'center' }}>
                일반회원 <button style={{ fontSize: '13px', padding: '3px 8px', border: '1px solid #ccc', backgroundColor: '#fff', marginLeft: '10px', cursor: 'pointer' }}>등급안내▶</button>
            </td>
          </tr>
          <tr>
            <td style={{ width: '50%', padding: '15px', backgroundColor: '#f9f9f9', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>사이버머니</td>
            <td style={{ width: '50%', padding: '15px', border: '1px solid #ddd', textAlign: 'center' }}>
                <span style={{ fontWeight: 'bold', fontSize: '18px' }}>10,000 원</span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* 3. 현재 대행신청 현황 */}
      <div style={{ padding: '20px', border: '1px solid #eee', backgroundColor: '#fcfcfc', borderLeft: '5px solid #d9534f', marginBottom: '40px', fontSize: '16px' }}>
        <span style={{ color: '#337ab7', fontWeight: 'bold' }}>라상민</span> 님의 현재 대행신청 현황입니다.
      </div>

      {/* 4. 상태 아이콘 바 */}
      <div style={{ display: 'flex', width: '100%', border: '1px solid #ddd', marginBottom: '40px', textAlign: 'center', fontSize: '13px' }}>
        <StatusIcon icon="fa-trash" label="경매.구매실패" count="0" />
        <StatusIcon icon="fa-edit" label="1등경매중" count="0" />
        <StatusIcon icon="fa-shopping-cart" label="낙찰/구매승인 1차결제" count="2" highlight />
        <StatusIcon icon="fa-credit-card" label="1차결제완료" count="0" />
        <StatusIcon icon="fa-truck" label="현지배송완료 국제배송신청" count="0" />
        <StatusIcon icon="fa-boxes" label="통합포장진행중" count="0" />
        <StatusIcon icon="fa-file-invoice" label="포장완료 2차결제요청" count="0" />
        <StatusIcon icon="fa-wallet" label="2차결제완료" count="0" />
        <StatusIcon icon="fa-plane" label="한국으로 국제배송" count="0" />
        <StatusIcon icon="fa-gift" label="배송완료" count="0" last />
      </div>

      {/* 5. 안내 박스 */}
      <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '25px', backgroundColor: '#f9f9f9', marginBottom: '40px' }}>
        <h4 style={{ fontWeight: 'bold', marginBottom: '20px', fontSize: '18px' }}>[관심물품보기]</h4>
        <div style={{ fontSize: '15px', color: '#666', lineHeight: '2' }}>
            <p>회원님의 관심 물품 리스트입니다.</p>
            <p>구매대행 상품의 경우 해당 상품명을 누르면 바로 구매신청을 하실 수 있습니다.</p>
            <p>야후옥션 입찰의 경우에는 해당 상품명을 클릭해서 입찰에 참여하거나 현재의 관심물품 리스트에서 바로 입찰에 참여 하실 수도 있습니다.</p>
            <br />
            <p>■ 현재 리스트에서 바로 입찰에 참여하는 방법 안내</p>
            <p>- 금액을 높혀 적고 <span style={{ color: '#f0ad4e', fontWeight: 'bold' }}>입찰하기</span>를 클릭해서 바로 입찰에 참여하실 수 있습니다.</p>
            <p>- [금액 구간별 입찰 단위]를 확인하시고 충분히 높은 금액으로 입찰하세요.</p>
            <p>- 마감이 임박한 경매는 빠른 대응을 위해 새로고침 버튼 대신 원문에서 확인하세요. 마감 10분 내에 입찰하면 10분 연장됩니다.</p>
        </div>
      </div>

      {/* 6. 관심물품리스트 타이틀 */}
      <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <i className="fa fa-list-alt" style={{ fontSize: '22px' }}></i> 관심물품리스트
      </div>

      {/* 7. 리스트 본문 */}
      <div style={{ borderTop: '3px solid #666', marginBottom: '30px' }}>
        {wishlist.length === 0 ? (
          <div style={{ padding: '50px', textAlign: 'center', borderBottom: '1px solid #ddd', color: '#888' }}>
            관심물품이 없습니다.
          </div>
        ) : (
          wishlist.map((item, index) => (
            <div key={item.itemId || index} style={{ display: 'flex', padding: '30px 0', borderBottom: '1px solid #ddd' }}>
              <div style={{ width: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                <div style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    삭제<input 
                      type="checkbox" 
                      checked={selectedItems.includes(item.itemId)} 
                      onChange={() => toggleItemSelection(item.itemId)}
                      style={{ width: '18px', height: '18px' }}
                    />
                </div>
                {item.imageUrl && (
                    <img 
                        src={item.imageUrl} 
                        alt="상품" 
                        style={{ width: '100px', height: '100px', objectFit: 'contain', border: '1px solid #eee', cursor: 'pointer' }} 
                        onClick={() => handleItemClick(item)}
                    />
                )}
                <button 
                  onClick={() => handleItemClick(item)}
                  style={{ backgroundColor: '#80b031', color: '#fff', border: 'none', padding: '8px 15px', fontSize: '14px', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold', width: '100px' }}
                >
                  Q상세정보
                </button>
              </div>
              <div style={{ flex: 1, paddingLeft: '20px' }}>
                <div 
                    onClick={() => handleItemClick(item)}
                    style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', marginBottom: '12px', cursor: 'pointer', lineHeight: '1.4' }}
                >
                    {item.itemName}
                    <div style={{ fontSize: '14px', color: '#888', fontWeight: 'normal', marginTop: '5px' }}>
                      ({item.itemName})
                    </div>
                </div>
                <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.8' }}>
                    <span style={{ color: '#d9534f', fontWeight: 'bold' }}>• 주문번호 : </span> {String(item.itemId).substring(0, 8)}
                    <span style={{ marginLeft: '20px', color: '#d9534f', fontWeight: 'bold' }}>• 입찰/구매금액 : </span> 
                    <span style={{ color: '#337ab7', fontWeight: 'bold', fontSize: '16px' }}>JPY {Number(item.priceYen).toLocaleString()}</span>
                    <span style={{ fontSize: '13px', marginLeft: '3px' }}>(₩{(Math.round(Number(item.priceYen) * exchangeRate / 100) * 100).toLocaleString()})</span>
                    <span style={{ marginLeft: '20px', color: '#d9534f', fontWeight: 'bold' }}>• 수량 : </span> 1
                    <span style={{ marginLeft: '20px', color: '#d9534f', fontWeight: 'bold' }}>• 경매번호/입찰ID : </span> {item.shopName}
                </div>
                <div style={{ fontSize: '14px', color: '#666', marginTop: '8px', lineHeight: '1.8' }}>
                    <span style={{ color: '#d9534f', fontWeight: 'bold' }}>• 구분/종료일 : </span> 일본구매대행/{new Date(item.addedAt || Date.now()).toISOString().slice(0, 16).replace('T', ' ')}
                    <span style={{ marginLeft: '20px', color: '#d9534f', fontWeight: 'bold' }}>• 상태/주문 : </span> 관심물품/진행중
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 8. 하단 버튼 */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '40px', marginTop: '20px' }}>
        <button 
          onClick={toggleAllSelection}
          style={{ padding: '8px 20px', fontSize: '14px', border: '1px solid #ccc', backgroundColor: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
        >
          <i className="fa fa-check" style={{ fontSize: '12px', color: '#337ab7' }}></i> 전체 선택
        </button>
        <button 
          onClick={handleRemoveSelected}
          style={{ padding: '8px 20px', fontSize: '14px', border: '1px solid #ccc', backgroundColor: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
        >
          <i className="fa fa-times" style={{ fontSize: '12px', color: '#d9534f' }}></i> 선택 삭제
        </button>
      </div>

      {/* 9. 페이지네이션 */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '5px' }}>
        <button style={{ width: '40px', height: '40px', backgroundColor: '#337ab7', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}>1</button>
      </div>

    </div>
  );
}

function StatusIcon({ icon, label, count, highlight, last }: any) {
    return (
        <div style={{ flex: 1, borderRight: last ? 'none' : '1px solid #ddd' }}>
            <div style={{ padding: '20px 10px', height: '90px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', borderBottom: '1px solid #ddd' }}>
                <i className={`fa ${icon}`} style={{ fontSize: '28px', marginBottom: '10px', color: highlight ? '#d9534f' : '#666' }}></i>
                <div style={{ lineHeight: '1.2' }}>{label}</div>
            </div>
            <div style={{ padding: '15px 0', fontSize: '20px', fontWeight: highlight ? 'bold' : 'normal', color: highlight ? '#d9534f' : '#333' }}>
                {count}
            </div>
        </div>
    );
}
