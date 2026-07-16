'use client';

import React, { useState, useEffect, useCallback } from 'react';
import GuideLayout from '../../../components/GuideLayout'; // 경로에 맞게 수정해주세요.
import { useMikuAlert } from '@/app/context/MikuAlertContext'; // 알림 컨텍스트가 있다면 적용 (없으면 alert 사용)

// =================================================================
// 1. 비즈니스 로직 영역 (Business Logic Layer)
// 데이터 연동, 기본 배송지 설정 처리 등 순수 기능만 전담합니다.
// =================================================================
function useDefaultAddressLogic() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addresses, setAddresses] = useState<any[]>([]);

  // (선택 사항) 커스텀 알림이 있다면 사용, 없으면 window.alert로 대체 가능
  const showAlert = (msg: string) => alert(msg);

  const fetchAddresses = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`/api/addresses?userId=${userId}`);
      const data = await res.json();
      if (data.success) {
        // 기본 배송지가 위로 오도록 정렬
        const sorted = [...data.addresses].sort((a, b) => (a.isDefault ? -1 : b.isDefault ? 1 : 0));
        setAddresses(sorted);
      }
      setLoading(false);
    } catch (error) {
      console.error("배송지 불러오기 실패:", error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedId = localStorage.getItem('user_id');
    if (storedId) {
      fetchAddresses(storedId);
    } else {
      setLoading(false);
    }
  }, [fetchAddresses]);

  const handleSetDefault = async (addressId: number) => {
    const userId = localStorage.getItem('user_id');
    if (!userId) return;

    setSaving(true);
    try {
      const targetAddress = addresses.find(a => a.id === addressId);
      const res = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...targetAddress, 
          userId, 
          isDefault: true 
        }),
      });
      const data = await res.json();
      if (data.success) {
        showAlert('기본 배송지가 변경되었습니다.');
        fetchAddresses(userId);
      }
    } catch (error) {
      console.error("기본 배송지 설정 오류:", error);
      showAlert('설정 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return { loading, saving, addresses, handleSetDefault };
}

// =================================================================
// 2. 화면 컴포넌트 영역 (View Layer)
// 인라인 스타일 배제, 의미 있는 클래스명 적용으로 구조를 한눈에 파악합니다.
// =================================================================
export default function DefaultAddressPage() {
  const { loading, saving, addresses, handleSetDefault } = useDefaultAddressLogic();

  if (loading) return <div className="miku-default-loading">데이터를 불러오는 중입니다...</div>;

  return (
    <GuideLayout title="기본 배송지 설정" type="mypage">
      <div className="miku-default-wrapper">
        
        <div className="miku-default-header anim-fade-in">
          <p className="helper-text">주문 시 기본으로 선택될 배송지를 선택해주세요.</p>
        </div>

        <div className="miku-default-list">
          {addresses.length === 0 ? (
            <div className="empty-state anim-slide-up">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <h3>등록된 배송지가 없습니다</h3>
              <p>마이페이지에서 먼저 배송지를 등록해주세요.</p>
            </div>
          ) : (
            addresses.map((addr, index) => {
              const isDefault = addr.isDefault;
              const isDisabled = saving && !isDefault;
              
              return (
                <div 
                  key={addr.id} 
                  onClick={() => !isDefault && !saving && handleSetDefault(addr.id)}
                  className={`miku-address-card anim-slide-up ${isDefault ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="card-info">
                    <div className="card-header">
                      <span className="recipient-name">{addr.recipientName}</span>
                      {isDefault && <span className="badge-default">기본 배송지</span>}
                    </div>
                    <div className="address-text">
                      ({addr.zipCode}) {addr.address} <span className="detail">{addr.detailAddress}</span>
                    </div>
                    <div className="phone-text">{addr.phone}</div>
                  </div>
                  
                  {/* 커스텀 라디오(체크) 버튼 */}
                  <div className="card-action">
                    <div className={`custom-radio ${isDefault ? 'checked' : ''}`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="miku-default-footer anim-fade-in" style={{ animationDelay: '0.3s' }}>
          <button className="btn-back" onClick={() => window.location.href = '/mypage/profile'}>
            돌아가기
          </button>
        </div>

      </div>

      {/* ================================================================= */}
      {/* 3. 디자인 영역 (CSS Layer) */}
      {/* 글로벌 오염 방지를 위해 .miku-default- 접두사를 일관되게 사용합니다. */}
      {/* ================================================================= */}
      <style jsx global>{`
        .miku-default-wrapper {
          max-width: 840px;
          margin: 0 auto;
          font-family: 'Pretendard', "Noto Sans KR", sans-serif;
          color: #0f172a;
          box-sizing: border-box;
        }

        .miku-default-loading {
          padding: 100px;
          text-align: center;
          color: #64748b;
          font-weight: 600;
          font-size: 16px;
        }

        .miku-default-header {
          margin-bottom: 24px;
        }
        .helper-text {
          color: #64748b;
          font-size: 15px;
          font-weight: 500;
          margin: 0;
        }

        /* 🌟 빈 화면 (Empty State) */
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: #ffffff;
          border-radius: 24px;
          border: 1px dashed #cbd5e1;
          color: #64748b;
        }
        .empty-state svg { width: 48px; height: 48px; color: #cbd5e1; margin-bottom: 16px; }
        .empty-state h3 { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; }
        .empty-state p { font-size: 14px; margin: 0; }

        /* 🌟 배송지 카드 리스트 */
        .miku-default-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .miku-address-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 28px 32px;
          background: #ffffff;
          border: 2px solid #e2e8f0;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 10px rgba(0,0,0,0.02);
        }
        .miku-address-card:hover:not(.active):not(.disabled) {
          border-color: #cbd5e1;
          transform: translateY(-2px);
          box-shadow: 0 12px 24px -6px rgba(0,0,0,0.05);
        }

        /* 활성화(기본 배송지) 상태 */
        .miku-address-card.active {
          border-color: #ff4b2b;
          background: #fff8f6;
          box-shadow: 0 8px 24px rgba(255, 75, 43, 0.12);
          cursor: default;
        }

        /* 비활성화(저장 중) 상태 */
        .miku-address-card.disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* 카드 내부 텍스트 정보 */
        .card-info { flex: 1; min-width: 0; }
        
        .card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .recipient-name {
          font-size: 20px;
          font-weight: 900;
          color: #0f172a;
          transition: color 0.3s;
        }
        .miku-address-card.active .recipient-name { color: #ea580c; }
        
        .badge-default {
          background: linear-gradient(135deg, #ff4b2b 0%, #e63e1f 100%);
          color: #ffffff;
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 800;
          box-shadow: 0 2px 6px rgba(255, 75, 43, 0.2);
        }

        .address-text {
          font-size: 15px;
          color: #475569;
          line-height: 1.5;
          margin-bottom: 6px;
          word-break: keep-all;
        }
        .address-text .detail { font-weight: 700; color: #334155; }
        
        .phone-text {
          font-size: 14px;
          color: #64748b;
          font-weight: 600;
        }

        /* 🌟 커스텀 라디오(체크) 버튼 애니메이션 */
        .card-action {
          margin-left: 24px;
          flex-shrink: 0;
        }
        .custom-radio {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid #cbd5e1;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .custom-radio svg {
          width: 16px;
          height: 16px;
          color: white;
          opacity: 0;
          transform: scale(0.5);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .custom-radio.checked {
          border-color: transparent;
          background: linear-gradient(135deg, #ff4b2b 0%, #e63e1f 100%);
          box-shadow: 0 4px 10px rgba(255, 75, 43, 0.3);
        }
        .custom-radio.checked svg {
          opacity: 1;
          transform: scale(1);
        }

        /* 🌟 하단 돌아가기 버튼 */
        .miku-default-footer {
          margin-top: 48px;
          display: flex;
          justify-content: center;
        }
        .btn-back {
          padding: 14px 36px;
          background: #f1f5f9;
          color: #475569;
          border: none;
          border-radius: 14px;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-back:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        /* 애니메이션 */
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        
        .anim-fade-in { animation: fadeIn 0.4s ease forwards; }
        .anim-slide-up { opacity: 0; animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        /* =============================================================
           📱 모바일 반응형 최적화
           ============================================================= */
        @media (max-width: 768px) {
          .miku-address-card {
            padding: 20px;
            border-radius: 16px;
            align-items: flex-start;
          }
          
          .card-header { flex-direction: column; align-items: flex-start; gap: 8px; margin-bottom: 16px; }
          .recipient-name { font-size: 18px; }
          
          .card-action { margin-left: 16px; margin-top: 4px; }
          .custom-radio { width: 28px; height: 28px; }
          .custom-radio svg { width: 14px; height: 14px; }
          
          .miku-default-footer { margin-top: 32px; }
          .btn-back { width: 100%; text-align: center; }
        }
      `}</style>
    </GuideLayout>
  );
}