"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProductDetail from '../rakuten/ProductDetail';
import { useExchangeRate } from '../context/ExchangeRateContext';

// 서브 컴포넌트: 상태 아이콘
function StatusIcon({ icon, label, count, highlight, last }: any) {
  return (
      <div style={{ flex: 1, borderRight: last ? 'none' : '1px solid #ddd', position: 'relative' }}>
          {highlight && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, border: '3px solid #d9534f', zIndex: 1 }}></div>
          )}
          <div style={{ padding: '20px 10px', height: '90px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', borderBottom: '1px solid #ddd' }}>
              <i className={`fa ${icon}`} style={{ fontSize: '28px', marginBottom: '10px', color: highlight ? '#d9534f' : '#666' }}></i>
              <div style={{ fontSize: '13px', lineHeight: '1.2' }}>{label}</div>
          </div>
          <div style={{ padding: '15px 0', fontSize: '20px', fontWeight: highlight ? 'bold' : 'normal', color: highlight ? '#d9534f' : '#333' }}>
              {count}
          </div>
      </div>
  );
}

export default function CartPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [selectedForPayment, setSelectedForPayment] = useState<string[]>([]);
  const { exchangeRate } = useExchangeRate();
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    // 자동 번역을 위한 쿠키 설정 (라쿠텐 페이지와 동일)
    const domain = window.location.hostname;
    document.cookie = `googtrans=/ja/ko; path=/;`;
    document.cookie = `googtrans=/ja/ko; domain=${domain}; path=/;`;

    const savedCart = JSON.parse(localStorage.getItem('rakutenCart') || '[]');
    setCartItems(savedCart);
    setSelectedForPayment(savedCart.map((item: any) => item.itemId));
  }, []);

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    const updatedCart = cartItems.map(item => {
      if (item.itemId === itemId) {
        const newQty = Math.max(1, (item.quantity || 1) + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    });
    setCartItems(updatedCart);
    localStorage.setItem('rakutenCart', JSON.stringify(updatedCart));
  };

  const handleRemoveItem = (itemId: string) => {
    if (confirm("이 상품을 장바구니에서 삭제하시겠습니까?")) {
      const updatedCart = cartItems.filter((item) => item.itemId !== itemId);
      setCartItems(updatedCart);
      localStorage.setItem('rakutenCart', JSON.stringify(updatedCart));
      // 페이지 내 아이템이 없어지면 이전 페이지로 이동
      if (currentItems.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    }
  };

  const togglePaymentSelection = (itemId: string) => {
    if (selectedForPayment.includes(itemId)) {
      setSelectedForPayment(selectedForPayment.filter(id => id !== itemId));
    } else {
      setSelectedForPayment([...selectedForPayment, itemId]);
    }
  };

  const toggleAllSelection = () => {
    if (selectedForPayment.length === cartItems.length) {
      setSelectedForPayment([]);
    } else {
      setSelectedForPayment(cartItems.map(item => item.itemId));
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

  const selectedItems = cartItems.filter(item => selectedForPayment.includes(item.itemId));
  // 10의 자리 반올림하여 100의 자리로 맞춤
  const totalProductPrice = Math.round(selectedItems.reduce((sum, item) => sum + (Number(item.priceYen) * (item.quantity || 1) * exchangeRate), 0) / 100) * 100;
  const totalFeeAndShipping = selectedItems.length > 0 ? 10000 : 0;
  const expectedTotalPayment = Math.round((totalProductPrice + totalFeeAndShipping) / 100) * 100;

  // 페이지네이션 계산
  const totalPages = Math.ceil(cartItems.length / ITEMS_PER_PAGE);
  const currentItems = cartItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px', backgroundColor: '#fff', minHeight: '100vh', fontFamily: 'dotum, sans-serif' }}>
      
      {/* 1. 상단 대행 신청 현황 디자인 추가 */}
      <div style={{ marginBottom: '50px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 'bold', paddingBottom: '15px', borderBottom: '2px dashed #ccc', marginBottom: '30px' }}>
          나의 대행신청 현황
        </h2>

        {/* 회원정보 테이블 */}
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

        {/* 사용자 현황 안내 */}
        <div style={{ padding: '20px', border: '1px solid #eee', backgroundColor: '#fcfcfc', borderLeft: '5px solid #d9534f', marginBottom: '40px', fontSize: '16px' }}>
          <span style={{ color: '#337ab7', fontWeight: 'bold' }}>라상민</span> 님의 현재 대행신청 현황입니다.
        </div>

        {/* 상태 아이콘 바 */}
        <div style={{ display: 'flex', width: '100%', border: '1px solid #ddd', marginBottom: '40px', textAlign: 'center' }}>
          <StatusIcon icon="fa-trash" label="경매.구매실패" count="0" />
          <StatusIcon icon="fa-edit" label="1등경매중" count="0" />
          <StatusIcon icon="fa-gavel" label="낙찰/구매승인 1차결제" count={cartItems.length} highlight />
          <StatusIcon icon="fa-credit-card" label="1차결제완료" count="0" />
          <StatusIcon icon="fa-truck" label="현지배송완료 국제배송신청" count="0" />
          <StatusIcon icon="fa-boxes" label="통합포장진행중" count="0" />
          <StatusIcon icon="fa-file-invoice" label="포장완료 2차결제요청" count="0" />
          <StatusIcon icon="fa-wallet" label="2차결제완료" count="0" />
          <StatusIcon icon="fa-plane" label="한국으로 국제배송" count="0" />
          <StatusIcon icon="fa-gift" label="배송완료" count="0" last />
        </div>

        {/* 안내 박스 */}
        <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '25px', backgroundColor: '#f9f9f9', marginBottom: '40px' }}>
          <h4 style={{ fontWeight: 'bold', marginBottom: '20px', fontSize: '18px', color: '#337ab7' }}>[낙찰/구매승인 1차결제]</h4>
          <div style={{ fontSize: '15px', color: '#666', lineHeight: '2' }}>
              <p>경매에 낙찰된 상품 및 구매 승인된 상품을 1차 결제하는 곳입니다.</p>
              <p>결제는 해당상품의 우측에 있는 네모박스를 체크하고, [결제]버튼을 클릭하여 주십시오.</p>
              <p>결제가 완료되면 [1차결제완료]리스트로 이동됩니다.</p>
              <p>상세한 내역을 보고자한 경우 [상세]란의 "보기"를 클릭하시면 상품구매금액을 상세하게 볼 수 있습니다.</p>
              <br />
              <p style={{ fontWeight: 'bold' }}>[ 일본내 배송관련안내 ]</p>
              <p>일본의 배송방법은</p>
              <p>1) 다이비끼(대금상환): 제품을 택배기사가 배달후 제품대금을 직접수령(대금상환수수료 별도발생)</p>
              <p>2) 택배1(추적,보상가능)</p>
              <p>3) 택배2(추적기능,보상안됨)</p>
              <p>4) 정형외(우편발송): 추적,보상이 안됨</p>
              <br />
              <p>크게 4가지 형태입니다. 배송비용은 4)-&gt;1)가면서 올라가게 됩니다.</p>
              <p>배송방법 변경은 대부분 판매자가 지정한대로 발송하기에 어려울 수 있습니다. 이점 참고바랍니다.</p>
          </div>
        </div>

        {/* 주의사항 및 메모 */}
        <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className="fa fa-list-alt" style={{ fontSize: '22px' }}></i> 낙찰 및 구매승인리스트
        </div>
        <div style={{ fontSize: '14px', color: '#d9534f', marginBottom: '20px' }}>
          [주의] 현금으로 결제시, 사이버머니 충전후, <span style={{ fontWeight: 'bold' }}>반드시 한번더 결제처리를 하셔야 합니다.</span> 결제 할 물품의 <span style={{ fontWeight: 'bold' }}>결제체크란에 체크후 결제버튼을 클릭하여 결제바랍니다.</span>
        </div>
        <textarea 
          placeholder="운영사에게 전달 말을 적으세요."
          style={{ width: '100%', height: '100px', padding: '20px', border: '1px solid #ddd', marginBottom: '50px', fontSize: '15px', fontFamily: 'inherit' }}
        />
      </div>

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
            onCartUpdate={() => {
                const savedCart = JSON.parse(localStorage.getItem('rakutenCart') || '[]');
                setCartItems(savedCart);
            }}
          />
        </div>
      )}
      </div>

      {/* 상단 헤더 영역 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <i className="fa fa-shopping-cart" style={{ fontSize: '30px', color: '#333' }}></i>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>나의 장바구니</h1>
        </div>
        <div style={{ backgroundColor: '#eff6ff', padding: '8px 15px', borderRadius: '20px', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa fa-tag" style={{ color: '#1e40af' }}></i>
            <span style={{ fontSize: '14px', color: '#1e40af', fontWeight: '500' }}>
                환율 환산: 100엔 = {exchangeRate.toFixed(2)}원
            </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start' }}>
        
        {/* 왼쪽: 상품 리스트 */}
        <div style={{ flex: 1.8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {cartItems.length === 0 ? (
                <div style={{ padding: '100px 0', textAlign: 'center', backgroundColor: '#fff', borderRadius: '15px', border: '1px solid #eee', color: '#888' }}>
                    장바구니가 비어있습니다.
                </div>
            ) : (
                currentItems.map((item, index) => (
                    <div key={item.itemId || index} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        {/* 체크박스 */}
                        <div onClick={() => togglePaymentSelection(item.itemId)} style={{ 
                            width: '24px', height: '24px', 
                            backgroundColor: selectedForPayment.includes(item.itemId) ? '#64748b' : '#fff',
                            border: '1px solid #ccc', borderRadius: '4px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer'
                        }}>
                            {selectedForPayment.includes(item.itemId) && <i className="fa fa-check" style={{ fontSize: '12px' }}></i>}
                        </div>

                        {/* 상품 카드 */}
                        <div style={{ flex: 1, backgroundColor: '#fff', borderRadius: '15px', border: '1px solid #eee', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', overflow: 'hidden' }}>
                            <div style={{ padding: '20px', display: 'flex', flex: 1, gap: '20px', alignItems: 'center' }}>
                                <div 
                                    onClick={() => handleItemClick(item)}
                                    style={{ width: '120px', height: '120px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #f5f5f5', cursor: 'pointer' }}
                                >
                                    <img src={item.imageUrl} alt="상품" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h3 
                                        onClick={() => handleItemClick(item)}
                                        style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', marginBottom: '10px', cursor: 'pointer' }}
                                    >
                                        {item.itemName}
                                    </h3>
                                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#111' }}>
                                    {(Math.round(Number(item.priceYen) * exchangeRate / 100) * 100).toLocaleString()}원
                                </div>
                                </div>
                            </div>
                            
                            {/* 삭제 바 */}
                            <div 
                                onClick={() => handleRemoveItem(item.itemId)}
                                style={{ width: '80px', backgroundColor: '#2d3e61', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <i className="fa fa-trash-alt" style={{ fontSize: '24px', color: '#fff' }}></i>
                            </div>
                        </div>
                    </div>
                ))
            )}
          </div>

          {/* 하단 전체 조작 버튼 */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '30px' }}>
              <button 
                onClick={toggleAllSelection}
                style={{ padding: '12px 25px', backgroundColor: '#fff', border: '1px solid #333', borderRadius: '10px', fontSize: '16px', color: '#333', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                  <div style={{ width: '20px', height: '20px', backgroundColor: selectedForPayment.length === cartItems.length && cartItems.length > 0 ? '#64748b' : '#fff', border: '1px solid #ccc', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    {selectedForPayment.length === cartItems.length && cartItems.length > 0 && <i className="fa fa-check" style={{ fontSize: '10px' }}></i>}
                  </div>
                  전체 선택
              </button>
              <button 
                onClick={() => {
                    if (confirm("장바구니를 모두 비우시겠습니까?")) {
                        setCartItems([]);
                        localStorage.removeItem('rakutenCart');
                        setCurrentPage(1);
                    }
                }}
                style={{ padding: '12px 25px', backgroundColor: '#fff', border: '1px solid #333', borderRadius: '10px', fontSize: '16px', color: '#333', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                  <i className="fa fa-trash-alt" style={{ color: '#333' }}></i>
                  전체 삭제
              </button>
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '30px' }}>
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  style={{ width: '35px', height: '35px', border: '1px solid #ddd', backgroundColor: '#fff', borderRadius: '5px', cursor: 'pointer' }}>&lt;</button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button 
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    style={{ 
                      width: '35px', height: '35px', border: 'none', 
                      backgroundColor: currentPage === page ? '#1e3a8a' : 'transparent', 
                      color: currentPage === page ? '#fff' : '#666', 
                      borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold' 
                    }}>
                      {page}
                  </button>
                ))}

                <button 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  style={{ width: '35px', height: '35px', border: '1px solid #ddd', backgroundColor: '#fff', borderRadius: '5px', cursor: 'pointer' }}>&gt;</button>
            </div>
          )}
        </div>

        {/* 오른쪽: 요약 정보 */}
        <div style={{ flex: 1, backgroundColor: '#fff', padding: '30px', borderRadius: '20px', border: '1px solid #eee', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', position: 'sticky', top: '20px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '25px', color: '#111' }}>결제 상세</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px', borderBottom: '1px solid #f1f5f9', paddingBottom: '25px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#333', fontSize: '16px' }}>
                    <span>총 상품 금액</span>
                    <span 
                        key={`total-prod-${selectedForPayment.join(',')}`}
                        style={{ color: '#111', fontWeight: 'bold' }}
                    >
                        {totalProductPrice.toLocaleString()}원
                    </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#333', fontSize: '16px' }}>
                    <span>총 수수료 및 배송비</span>
                    <span style={{ color: '#111', fontWeight: 'bold' }}>{totalFeeAndShipping.toLocaleString()}원</span>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>예상 결제 금액</span>
                <span 
                    key={selectedForPayment.join(',') + cartItems.map(i => i.quantity).join(',')}
                    style={{ fontSize: '28px', fontWeight: 'bold', color: '#111' }}
                >
                    {expectedTotalPayment.toLocaleString()}원
                </span>
            </div>

            <button 
              onClick={() => {
                if (selectedForPayment.length === 0) {
                  alert("결제할 상품을 선택해주세요.");
                  return;
                }
                if (confirm(`선택하신 ${selectedForPayment.length}개의 상품에 대해 1차 결제를 진행하시겠습니까?\n총 예상 결제 금액: ${expectedTotalPayment.toLocaleString()}원`)) {
                  alert(`1차 결제가 완료되었습니다.\n최종 결제 금액: ${expectedTotalPayment.toLocaleString()}원\n[1차결제완료] 리스트로 이동합니다.`);
                  // 실제 결제 처리 로직이 들어갈 자리
                }
              }}
              style={{ width: '100%', padding: '18px', backgroundColor: '#2d3e61', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}
            >
                전체 결제 전송하기
            </button>
        </div>

      </div>

    </div>
  );
}
