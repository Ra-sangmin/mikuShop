"use client";
import React, { useState, useRef, useEffect } from 'react';
import DaumPostcode from 'react-daum-postcode';

export default function AddressForm({ userData, selectedItems, fetchOrders }: any) {
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isOpenPostcode, setIsOpenPostcode] = useState(false);
  const detailAddressRef = useRef<HTMLInputElement>(null);

  const [addressForm, setAddressForm] = useState({
    recipientName: '', recipientEnglishName: '', phone: '', zipCode: '', address: '', detailAddress: '', personalCustomsCode: ''
  });

  useEffect(() => {
    if (userData) {
      setAddressForm({
        recipientName: userData.name || '', recipientEnglishName: '', phone: userData.phone || '', zipCode: userData.zipCode || '', address: userData.address || '', detailAddress: userData.detailAddress || '', personalCustomsCode: userData.personalCustomsCode || ''
      });
    }
  }, [userData]);

  const handleCompletePostcode = (data: any) => {
    setAddressForm(prev => ({ ...prev, zipCode: data.zonecode, address: data.address, detailAddress: '' }));
    setIsOpenPostcode(false);
    setTimeout(() => detailAddressRef.current?.focus(), 100);
  };

  const handleSubmit = async () => {
    if (!addressForm.recipientName || !addressForm.zipCode) return alert('필수 정보를 입력해 주세요.');
    if (selectedItems.length === 0) return alert('적용할 상품을 선택해 주세요.');
    
    const res = await fetch('/api/admin/orders', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates: selectedItems.map((id: string) => ({ id, recipient: addressForm.recipientName })) })
    });
    if (res.ok) { alert('적용되었습니다.'); setShowAddressForm(false); fetchOrders(); }
  };

  return (
    <div style={{ marginTop: '50px' }}>
      {!showAddressForm ? (
        <button onClick={() => setShowAddressForm(true)} style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#fff' }}>+ 새 배송지 추가</button>
      ) : (
        <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginBottom: '20px' }}>배송지 입력</h3>
          
          <input type="text" value={addressForm.recipientName} onChange={e => setAddressForm({...addressForm, recipientName: e.target.value})} placeholder="성명" style={{ padding: '10px', width: '100%', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <input type="text" value={addressForm.zipCode} readOnly placeholder="우편번호" style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }} />
            <button onClick={() => setIsOpenPostcode(true)} style={{ padding: '10px', backgroundColor: '#1e293b', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>우편번호 검색</button>
          </div>
          
          <input type="text" value={addressForm.address} readOnly placeholder="기본주소" style={{ padding: '10px', width: '100%', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
          <input type="text" ref={detailAddressRef} value={addressForm.detailAddress} onChange={e => setAddressForm({...addressForm, detailAddress: e.target.value})} placeholder="상세주소" style={{ padding: '10px', width: '100%', marginBottom: '20px', borderRadius: '8px', border: '1px solid #ddd' }} />
          
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setShowAddressForm(false)} style={{ padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>취소</button>
            <button onClick={handleSubmit} style={{ padding: '10px 20px', backgroundColor: '#ff4b2b', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>적용하기</button>
          </div>
        </div>
      )}

      {isOpenPostcode && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '400px', backgroundColor: '#fff', borderRadius: '16px', overflow: 'hidden' }}>
            <button onClick={() => setIsOpenPostcode(false)} style={{ float: 'right', padding: '10px', border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
            <DaumPostcode onComplete={handleCompletePostcode} />
          </div>
        </div>
      )}
    </div>
  );
}