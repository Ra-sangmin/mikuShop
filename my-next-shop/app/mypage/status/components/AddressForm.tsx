"use client";
import React, { useState, useRef, useEffect } from 'react';
import DaumPostcode from 'react-daum-postcode';

export default function AddressForm({ userData, selectedItems, fetchOrders, selectedAddress, setSelectedAddress }: any) {
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isOpenPostcode, setIsOpenPostcode] = useState(false);
  const detailAddressRef = useRef<HTMLInputElement>(null);

  const [addressForm, setAddressForm] = useState({
    recipientName: '', recipientEnglishName: '', phone: '', zipCode: '', address: '', detailAddress: '', personalCustomsCode: '', isDefault: false
  });

  // 🌟 1. 하드코딩된 가짜 데이터를 완전히 삭제했습니다! 오직 백엔드에서 준 실제 데이터만 씁니다.
  const displayAddresses = userData?.addresses || userData?.addressList || userData?.shippingAddresses || userData?.deliveries || [];

  // 🌟 2. 주소록 데이터가 로드되면, 가장 첫 번째 주소(또는 기본 배송지)를 자동 선택합니다.
  useEffect(() => {
    if (displayAddresses.length > 0) {
      // 이미 선택된 주소가 새 로그인 유저의 주소록에도 존재하는지 검증
      const isSelectedValid = selectedAddress && displayAddresses.some((a: any) => a.id === selectedAddress.id);
      
      if (!isSelectedValid) {
        const defaultAddr = displayAddresses.find((a: any) => a.isDefault);
        setSelectedAddress(defaultAddr ? defaultAddr : displayAddresses[0]);
      }
    } else {
      // 주소가 아예 없다면 선택 상태도 확실하게 초기화
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
        if (fetchOrders) fetchOrders(); // 부모 컴포넌트 데이터 갱신
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

  return (
    <div style={{ marginTop: '50px', boxSizing: 'border-box', width: '100%' }}>
      <style jsx>{`
        * { box-sizing: border-box; }
        
        .addr-wrapper {
          background-color: #fff;
          border-radius: 16px;
          padding: 32px;
          border: 1px solid #f1f5f9;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
          width: 100%;
        }

        .addr-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .addr-title {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }

        .add-new-btn {
          background-color: #f97316;
          color: #fff;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .add-new-btn:hover { background-color: #ea580c; }

        .addr-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .radio-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          background-color: #fff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          cursor: pointer;
          transition: all 0.2s;
        }
        .radio-card:hover { border-color: #cbd5e1; }
        
        .radio-card.selected {
          border: 1.5px solid #f97316;
          background-color: #fffaf5; 
        }

        .modal-input {
          width: 100%;
          padding: 14px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          outline: none;
          font-size: 14px;
          transition: border-color 0.2s;
        }
        .modal-input:focus { border-color: #f97316; }
        .modal-input[readonly] { background-color: #f8fafc; border-color: #e2e8f0; color: #64748b; }

        .input-label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: #475569;
          margin-bottom: 6px;
        }

        @media (max-width: 768px) {
          .addr-wrapper { padding: 20px; }
          .radio-card { padding: 20px; align-items: flex-start; }
        }
      `}</style>

      <div className="addr-wrapper">
        <div className="addr-header">
          <h3 className="addr-title">수취인 주소 리스트</h3>
          <button className="add-new-btn" onClick={() => setShowAddressForm(true)}>
            새 배송지 추가
          </button>
        </div>

        <div className="addr-list">
          {/* 🌟 3. 주소가 있으면 출력, 없으면 '없음' 메시지 출력 */}
          {displayAddresses.length > 0 ? (
            displayAddresses.map((addr: any, idx: number) => {
              const isSelected = selectedAddress?.id === addr.id;
              
              return (
                <div 
                  key={addr.id || idx} 
                  className={`radio-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectCard(addr)}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px', fontWeight: '800', color: isSelected ? '#f97316' : '#1e293b', transition: 'color 0.2s' }}>
                        {addr.name || addr.recipientName || addr.title}
                      </span>
                      {addr.isDefault && (
                        <span style={{ backgroundColor: '#f97316', color: '#fff', fontSize: '11px', fontWeight: '800', padding: '3px 6px', borderRadius: '4px' }}>
                          기본 배송지
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6', textAlign: 'left', wordBreak: 'keep-all' }}>
                      ({addr.zipCode || '-'}) {addr.address} {addr.detailAddress}
                    </div>
                    <div style={{ fontSize: '14px', color: '#94a3b8', textAlign: 'left' }}>
                      {addr.phone || '-'}
                    </div>
                  </div>

                  <div style={{ width: '24px', height: '24px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '16px' }}>
                    {isSelected ? (
                      <span style={{ color: '#f97316', fontSize: '20px', fontWeight: '900' }}>✔</span>
                    ) : (
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #cbd5e1' }}></div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontWeight: '600' }}>
              등록된 배송지가 없습니다. '새 배송지 추가' 버튼을 눌러 등록해주세요.
            </div>
          )}
        </div>
      </div>

      {/* 새 배송지 추가 팝업 (Modal) */}
      {showAddressForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '450px', padding: '30px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '24px', color: '#0f172a' }}>새 배송지 추가</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="input-label">수취인명(한글)</label>
                <input type="text" name="recipientName" value={addressForm.recipientName} onChange={handleFormChange} className="modal-input" />
              </div>
              
              <div>
                <label className="input-label">수취인명(영문)</label>
                <input type="text" name="recipientEnglishName" value={addressForm.recipientEnglishName} onChange={handleFormChange} className="modal-input" />
              </div>

              <div>
                <label className="input-label">연락처</label>
                <input type="text" name="phone" value={addressForm.phone} onChange={handleFormChange} className="modal-input" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label className="input-label" style={{ marginBottom: 0 }}>주소</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="text" value={addressForm.zipCode} readOnly placeholder="우편번호" className="modal-input" style={{ flex: 1 }} />
                  <button type="button" onClick={() => setIsOpenPostcode(true)} style={{ padding: '0 20px', backgroundColor: '#5b21b6', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    검색
                  </button>
                </div>
                <input type="text" value={addressForm.address} readOnly placeholder="기본 주소" className="modal-input" />
                <input type="text" ref={detailAddressRef} name="detailAddress" value={addressForm.detailAddress} onChange={handleFormChange} placeholder="상세 주소 입력" className="modal-input" />
              </div>

              <div>
                <label className="input-label">개인통관고유부호</label>
                <input type="text" name="personalCustomsCode" value={addressForm.personalCustomsCode} onChange={handleFormChange} placeholder="P로 시작하는 13자리" className="modal-input" />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '800', padding: '14px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '4px' }}>
                <input type="checkbox" name="isDefault" checked={addressForm.isDefault} onChange={handleFormChange} style={{ width: '18px', height: '18px', accentColor: '#f97316' }} />
                기본 배송지로 설정
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
              <button onClick={() => setShowAddressForm(false)} style={{ flex: 1, padding: '16px', background: '#f8fafc', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', color: '#475569', fontSize: '16px' }}>취소</button>
              <button onClick={handleSubmitNewAddress} style={{ flex: 1, padding: '16px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '16px' }}>저장</button>
            </div>
          </div>
        </div>
      )}

      {/* 우편번호 검색 팝업 */}
      {isOpenPostcode && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '400px', backgroundColor: '#fff', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 20px', borderBottom: '1px solid #eee' }}>
              <span style={{ fontWeight: '800' }}>우편번호 찾기</span>
              <button onClick={() => setIsOpenPostcode(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '20px' }}>✕</button>
            </div>
            <DaumPostcode onComplete={handleCompletePostcode} style={{ height: '400px' }} />
          </div>
        </div>
      )}
    </div>
  );
}