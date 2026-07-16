'use client';

import React, { useState, useRef, useEffect } from 'react';
import DaumPostcode from 'react-daum-postcode';

// =================================================================
// 1. 비즈니스 로직 영역 (Business Logic Layer)
// 주소 목록 추출, 자동 선택, 새 주소 등록 API 통신 등의 기능만 전담합니다.
// =================================================================
function useAddressFormLogic({ userData, selectedAddress, setSelectedAddress, fetchOrders }: any) {
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isOpenPostcode, setIsOpenPostcode] = useState(false);
  const detailAddressRef = useRef<HTMLInputElement>(null);

  const [addressForm, setAddressForm] = useState({
    recipientName: '', recipientEnglishName: '', phone: '', zipCode: '', 
    address: '', detailAddress: '', personalCustomsCode: '', isDefault: false
  });

  // 하드코딩 데이터를 완전히 삭제하고 실제 데이터만 사용
  const displayAddresses = userData?.addresses || userData?.addressList || userData?.shippingAddresses || userData?.deliveries || [];

  // 주소록 데이터 로드 시, 기본 배송지 자동 선택
  useEffect(() => {
    if (displayAddresses.length > 0) {
      const isSelectedValid = selectedAddress && displayAddresses.some((a: any) => a.id === selectedAddress.id);
      
      if (!isSelectedValid) {
        const defaultAddr = displayAddresses.find((a: any) => a.isDefault);
        setSelectedAddress(defaultAddr ? defaultAddr : displayAddresses[0]);
      }
    } else {
      setSelectedAddress(null);
    }
  }, [userData, displayAddresses, selectedAddress, setSelectedAddress]);

  const handleCompletePostcode = (data: any) => {
    setAddressForm(prev => ({ ...prev, zipCode: data.zonecode, address: data.address, detailAddress: '' }));
    setIsOpenPostcode(false);
    setTimeout(() => detailAddressRef.current?.focus(), 100);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setAddressForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmitNewAddress = async () => {
    if (!addressForm.recipientName) return alert('수취인명(한글)을 입력해주세요.');
    if (!addressForm.phone) return alert('연락처를 입력해주세요.');
    if (!addressForm.zipCode || !addressForm.address) return alert('주소 검색을 통해 주소를 입력해주세요.');
    if (!addressForm.detailAddress) return alert('상세 주소를 입력해주세요.');
    if (!addressForm.personalCustomsCode) return alert('개인통관고유부호를 입력해주세요.');

    const storedId = localStorage.getItem('user_id');
    if (!storedId) return alert('로그인 정보가 없습니다.');

    try {
      const res = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addressForm, userId: storedId }),
      });
      const data = await res.json();

      if (data.success) {
        alert('새 배송지가 목록에 저장되었습니다.\n(위에서 개별포장 또는 합포장 버튼을 누르면 이 배송지로 적용됩니다.)');
        setSelectedAddress({ ...addressForm, id: data.address?.id || Date.now(), recipientName: addressForm.recipientName });
        
        setShowAddressForm(false);
        setAddressForm({ recipientName: '', recipientEnglishName: '', phone: '', zipCode: '', address: '', detailAddress: '', personalCustomsCode: '', isDefault: false });
        
        if (fetchOrders) fetchOrders();
      } else {
        alert('배송지 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error(error);
      alert('처리 중 오류가 발생했습니다.');
    }
  };

  const handleSelectCard = (addr: any) => {
    setSelectedAddress(addr);
  };

  return {
    displayAddresses, addressForm, showAddressForm, setShowAddressForm,
    isOpenPostcode, setIsOpenPostcode, detailAddressRef,
    handleCompletePostcode, handleFormChange, handleSubmitNewAddress, handleSelectCard
  };
}


// =================================================================
// 2. 화면 컴포넌트 영역 (View Layer)
// 인라인 스타일을 배제하고 의미 있는 클래스명(className)을 적용했습니다.
// =================================================================

// 🌟 공통 입력창 컴포넌트 (모달 내부용)
function FormInputGroup({ label, name, value, onChange, placeholder = "", readOnly = false, type = "text", inputRef = null, required = false }: any) {
  return (
    <div className="miku-addr-input-group">
      <label className="input-label">{label} {required && <span className="req">*</span>}</label>
      <input 
        ref={inputRef} type={type} name={name} value={value} onChange={onChange} 
        placeholder={placeholder} readOnly={readOnly}
        className={`modal-input ${readOnly ? 'readonly' : ''}`}
      />
    </div>
  );
}

export default function AddressForm(props: any) {
  const {
    displayAddresses, addressForm, showAddressForm, setShowAddressForm,
    isOpenPostcode, setIsOpenPostcode, detailAddressRef,
    handleCompletePostcode, handleFormChange, handleSubmitNewAddress, handleSelectCard
  } = useAddressFormLogic(props);

  const { selectedAddress } = props;

  return (
    <div className="miku-addr-form-container anim-slide-up">
      
      {/* 🌟 주소록 카드 리스트 섹션 */}
      <div className="miku-addr-wrapper">
        <div className="addr-header">
          <h3 className="addr-title">수취인 주소 리스트</h3>
          <button className="add-new-btn" onClick={() => setShowAddressForm(true)}>새 배송지 추가</button>
        </div>

        <div className="addr-list">
          {displayAddresses.length > 0 ? (
            displayAddresses.map((addr: any, idx: number) => {
              const isSelected = selectedAddress?.id === addr.id;
              
              return (
                <div 
                  key={addr.id || idx} 
                  className={`radio-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectCard(addr)}
                >
                  <div className="card-info">
                    <div className="card-header">
                      <span className="recipient-name">{addr.name || addr.recipientName || addr.title}</span>
                      {addr.isDefault && <span className="badge-default">기본 배송지</span>}
                    </div>
                    <div className="address-text">
                      ({addr.zipCode || '-'}) {addr.address} <span className="detail">{addr.detailAddress}</span>
                    </div>
                    <div className="phone-text">{addr.phone || '-'}</div>
                  </div>

                  <div className="card-action">
                    <div className={`custom-radio ${isSelected ? 'checked' : ''}`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-state">
              등록된 배송지가 없습니다. '새 배송지 추가' 버튼을 눌러 등록해주세요.
            </div>
          )}
        </div>
      </div>

      {/* 🌟 새 배송지 추가 모달 (글래스모피즘 오버레이) */}
      {showAddressForm && (
        <div className="miku-addr-modal-overlay anim-fade-in">
          <div className="miku-addr-modal-content anim-slide-up-modal">
            
            <div className="modal-header">
              <h3>새 배송지 추가</h3>
              <button className="close-btn" onClick={() => setShowAddressForm(false)}>✕</button>
            </div>

            <div className="modal-body">
              <FormInputGroup label="수취인명(한글)" name="recipientName" value={addressForm.recipientName} onChange={handleFormChange} required />
              <FormInputGroup label="수취인명(영문)" name="recipientEnglishName" value={addressForm.recipientEnglishName} onChange={handleFormChange} />
              <FormInputGroup label="연락처" name="phone" value={addressForm.phone} onChange={handleFormChange} required />
              
              <div className="miku-addr-input-group">
                <label className="input-label">주소 <span className="req">*</span></label>
                <div className="address-search-row">
                  <input type="text" value={addressForm.zipCode} readOnly placeholder="우편번호" className="modal-input readonly" />
                  <button type="button" className="btn-search" onClick={() => setIsOpenPostcode(true)}>검색</button>
                </div>
                <input type="text" value={addressForm.address} readOnly placeholder="기본 주소" className="modal-input readonly" />
                <input type="text" ref={detailAddressRef} name="detailAddress" value={addressForm.detailAddress} onChange={handleFormChange} placeholder="상세 주소 입력" className="modal-input" />
              </div>

              <FormInputGroup label="개인통관고유부호" name="personalCustomsCode" value={addressForm.personalCustomsCode} onChange={handleFormChange} placeholder="P로 시작하는 13자리" required />

              <label className="checkbox-label">
                <input type="checkbox" name="isDefault" checked={addressForm.isDefault} onChange={handleFormChange} className="checkbox-input" />
                <span className="checkbox-text">기본 배송지로 설정</span>
              </label>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowAddressForm(false)}>취소</button>
              <button className="btn-save" onClick={handleSubmitNewAddress}>저장</button>
            </div>

          </div>
        </div>
      )}

      {/* 🌟 우편번호 검색 모달 */}
      {isOpenPostcode && (
        <div className="miku-addr-postcode-overlay anim-fade-in">
          <div className="postcode-content">
            <div className="postcode-header">
              <h3>우편번호 찾기</h3>
              <button className="close-btn" onClick={() => setIsOpenPostcode(false)}>✕</button>
            </div>
            <DaumPostcode onComplete={handleCompletePostcode} style={{ height: '400px', width: '100%' }} />
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 3. 디자인 영역 (CSS Layer) */}
      {/* 글로벌 오염 방지를 위해 .miku-addr- 접두사를 일관되게 사용합니다. */}
      {/* ================================================================= */}
      <style jsx global>{`
        .miku-addr-form-container {
          margin-top: 50px;
          box-sizing: border-box;
          width: 100%;
          font-family: 'Pretendard', "Noto Sans KR", sans-serif;
        }

        /* 🌟 주소록 래퍼 */
        .miku-addr-wrapper {
          background-color: #ffffff;
          border-radius: 24px;
          padding: 32px 40px;
          border: 1px solid rgba(226, 232, 240, 0.8);
          box-shadow: 0 10px 30px rgba(0,0,0,0.03);
          width: 100%;
          box-sizing: border-box;
        }

        .addr-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 20px;
          border-bottom: 1px solid #f1f5f9;
        }
        .addr-title {
          font-size: 20px;
          font-weight: 900;
          color: #0f172a;
          margin: 0;
        }

        .add-new-btn {
          background: #ffffff;
          color: #ea580c;
          border: 1px solid #fdba74;
          padding: 10px 20px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .add-new-btn:hover { background: #fff8f6; color: #ff4b2b; border-color: #ff4b2b; }

        .addr-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .empty-state {
          padding: 40px;
          text-align: center;
          color: #94a3b8;
          background: #f8fafc;
          border-radius: 16px;
          font-weight: 600;
          font-size: 15px;
        }

        /* 🌟 주소 카드 디자인 (Radio 선택형) */
        .radio-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 28px;
          background-color: #ffffff;
          border-radius: 16px;
          border: 2px solid #e2e8f0;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .radio-card:hover:not(.selected) { border-color: #cbd5e1; transform: translateY(-2px); box-shadow: 0 8px 20px -4px rgba(0,0,0,0.05); }
        .radio-card.selected { border-color: #ff4b2b; background-color: #fff8f6; box-shadow: 0 8px 24px rgba(255, 75, 43, 0.12); }

        .card-info { flex: 1; display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
        
        .card-header { display: flex; align-items: center; gap: 10px; }
        .recipient-name { font-size: 18px; font-weight: 900; color: #0f172a; transition: color 0.2s; }
        .radio-card.selected .recipient-name { color: #ea580c; }
        
        .badge-default {
          background-color: #ea580c; color: #fff; font-size: 11px; font-weight: 800;
          padding: 4px 8px; border-radius: 6px;
        }

        .address-text { font-size: 15px; color: #475569; line-height: 1.5; word-break: keep-all; }
        .address-text .detail { font-weight: 700; color: #1e293b; }
        .phone-text { font-size: 14px; color: #94a3b8; font-weight: 600; }

        /* 커스텀 체크박스 애니메이션 */
        .card-action { margin-left: 20px; flex-shrink: 0; }
        .custom-radio {
          width: 28px; height: 28px; border-radius: 50%; border: 2px solid #cbd5e1;
          background: #ffffff; display: flex; align-items: center; justify-content: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .custom-radio svg {
          width: 14px; height: 14px; color: white; opacity: 0; transform: scale(0.5);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .custom-radio.checked { border-color: transparent; background: linear-gradient(135deg, #ff4b2b 0%, #e63e1f 100%); box-shadow: 0 4px 10px rgba(255, 75, 43, 0.3); }
        .custom-radio.checked svg { opacity: 1; transform: scale(1); }

        /* 🌟 모달 디자인 (새 주소 추가) */
        .miku-addr-modal-overlay, .miku-addr-postcode-overlay {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
          background: rgba(15, 23, 42, 0.5); backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          z-index: 3000; padding: 20px; box-sizing: border-box;
        }
        
        .miku-addr-modal-content {
          background: #ffffff; width: 100%; max-width: 480px; border-radius: 28px;
          box-shadow: 0 24px 48px rgba(0,0,0,0.15); overflow: hidden; display: flex; flex-direction: column;
          max-height: 90vh;
        }
        
        .modal-header, .postcode-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 24px 32px; border-bottom: 1px solid #f1f5f9; background: #ffffff;
        }
        .modal-header h3, .postcode-header h3 { margin: 0; font-size: 20px; font-weight: 800; color: #0f172a; }
        
        .close-btn {
          background: #f1f5f9; border: none; width: 36px; height: 36px; border-radius: 50%;
          font-size: 16px; color: #64748b; cursor: pointer; transition: all 0.2s;
          display: flex; align-items: center; justify-content: center;
        }
        .close-btn:hover { background: #e2e8f0; color: #0f172a; transform: rotate(90deg); }

        .modal-body { padding: 32px; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; }
        
        /* 폼 그룹 및 입력창 */
        .miku-addr-input-group { display: flex; flex-direction: column; gap: 8px; }
        .input-label { font-size: 13px; font-weight: 800; color: #475569; }
        .input-label .req { color: #ef4444; margin-left: 2px; }
        
        .modal-input {
          width: 100%; padding: 14px 16px; border-radius: 12px; border: 1px solid #cbd5e1;
          font-size: 15px; color: #0f172a; transition: all 0.2s; outline: none; box-sizing: border-box;
        }
        .modal-input:focus { border-color: #ff4b2b; box-shadow: 0 0 0 4px rgba(255, 75, 43, 0.1); }
        .modal-input.readonly { background: #f8fafc; color: #64748b; cursor: not-allowed; }
        .modal-input.readonly:focus { border-color: #cbd5e1; box-shadow: none; }

        .address-search-row { display: flex; gap: 8px; }
        .btn-search {
          padding: 0 24px; background: #0f172a; color: #fff; border: none; border-radius: 12px;
          font-size: 14px; font-weight: 800; cursor: pointer; transition: background 0.2s; flex-shrink: 0;
        }
        .btn-search:hover { background: #334155; }

        .checkbox-label {
          display: flex; align-items: center; gap: 10px; padding: 16px; background: #fff8f6;
          border: 1px solid #ffedd5; border-radius: 12px; cursor: pointer; margin-top: 8px;
        }
        .checkbox-input { width: 20px; height: 20px; accent-color: #ea580c; cursor: pointer; }
        .checkbox-text { font-size: 15px; font-weight: 800; color: #ea580c; }

        .modal-footer { display: flex; gap: 12px; padding: 24px 32px; background: #f8fafc; border-top: 1px solid #f1f5f9; }
        .btn-cancel, .btn-save { flex: 1; padding: 16px; border-radius: 14px; font-size: 15px; font-weight: 800; cursor: pointer; transition: all 0.2s; border: none; }
        .btn-cancel { background: #e2e8f0; color: #475569; }
        .btn-cancel:hover { background: #cbd5e1; color: #0f172a; }
        .btn-save { background: linear-gradient(135deg, #ff4b2b 0%, #e63e1f 100%); color: #fff; box-shadow: 0 4px 10px rgba(255, 75, 43, 0.2); }
        .btn-save:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(255, 75, 43, 0.3); }

        .postcode-content { background: #fff; width: 100%; max-width: 440px; border-radius: 20px; overflow: hidden; box-shadow: 0 24px 48px rgba(0,0,0,0.15); }

        /* 애니메이션 */
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUpModal { from { opacity: 0; transform: translateY(40px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        
        .anim-fade-in { animation: fadeIn 0.3s ease forwards; }
        .anim-slide-up { opacity: 0; animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .anim-slide-up-modal { opacity: 0; animation: slideUpModal 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        /* =============================================================
           📱 모바일 반응형 최적화
           ============================================================= */
        @media (max-width: 768px) {
          .miku-addr-form-container { margin-top: 30px; }
          .miku-addr-wrapper { padding: 24px 20px; border-radius: 20px; }
          
          .addr-header { flex-direction: column; align-items: flex-start; gap: 12px; }
          .add-new-btn { width: 100%; text-align: center; padding: 14px; }
          
          .radio-card { padding: 20px; align-items: flex-start; }
          .card-action { margin-left: 16px; margin-top: 2px; }
          
          .miku-addr-modal-content { border-radius: 24px 24px 0 0; position: absolute; bottom: 0; max-height: 95vh; }
          .modal-body { padding: 24px 20px; }
          .modal-footer { padding: 20px; }
        }
      `}</style>
    </div>
  );
}