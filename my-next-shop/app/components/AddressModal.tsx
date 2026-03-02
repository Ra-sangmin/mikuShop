"use client";
import React, { useState, useRef, useEffect } from 'react';
import DaumPostcode from 'react-daum-postcode';

function InputGroup({ label, name, value, onChange, type = "text", placeholder = "", required = false, readOnly = false }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      <input
        type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} readOnly={readOnly}
        style={{
          padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: readOnly ? '#f8fafc' : '#fff',
          fontSize: '14px', outline: 'none', transition: 'border-color 0.2s'
        }}
      />
    </div>
  );
}

export default function AddressModal({ address, onClose, onSave, isFirstAddress, showAlert }: any) {
  const [formData, setFormData] = useState({
    id: address?.id || null,
    recipientName: address?.recipientName || '',
    recipientEnglishName: address?.recipientEnglishName || '',
    phone: address?.phone || '',
    zipCode: address?.zipCode || '',
    address: address?.address || '',
    detailAddress: address?.detailAddress || '',
    personalCustomsCode: address?.personalCustomsCode || '',
    isDefault: isFirstAddress ? true : (address?.isDefault || false),
  });

  const [isOpenPostcode, setIsOpenPostcode] = useState(false);
  const detailAddressRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleCompletePostcode = (data: any) => {
    setFormData(prev => ({ ...prev, zipCode: data.zonecode, address: data.address, detailAddress: '' }));
    setIsOpenPostcode(false);
    setTimeout(() => detailAddressRef.current?.focus(), 100);
  };

  const handleSubmit = () => {
    if (!formData.recipientName) return showAlert('수취인명(한글)을 입력해주세요.');
    if (!formData.phone) return showAlert('연락처를 입력해주세요.');
    if (!formData.zipCode || !formData.address) return showAlert('주소 검색을 통해 주소를 입력해주세요.');
    if (!formData.detailAddress) return showAlert('상세 주소를 입력해주세요.');
    if (!formData.personalCustomsCode) return showAlert('개인통관고유부호를 입력해주세요.');
    onSave(formData);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '15px' }}>
      <div style={{ background: '#fff', width: '100%', maxWidth: '500px', padding: '25px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px' }}>{address ? '배송지 수정' : '새 배송지 추가'}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <InputGroup label="수취인명(한글)" name="recipientName" value={formData.recipientName} onChange={handleChange} required />
          <InputGroup label="수취인명(영문)" name="recipientEnglishName" value={formData.recipientEnglishName} onChange={handleChange} />
          <InputGroup label="연락처" name="phone" value={formData.phone} onChange={handleChange} required />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>주소 <span style={{ color: '#ef4444' }}>*</span></label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="text" value={formData.zipCode} readOnly placeholder="우편번호" style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '14px' }} />
              <button type="button" onClick={() => setIsOpenPostcode(true)} style={{ padding: '0 15px', backgroundColor: '#5b21b6', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700' }}>검색</button>
            </div>
            <input type="text" value={formData.address} readOnly placeholder="기본 주소" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '14px' }} />
            <input type="text" ref={detailAddressRef} name="detailAddress" value={formData.detailAddress} onChange={handleChange} placeholder="상세 주소 입력" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '14px', outline: 'none' }} />
          </div>

          <InputGroup label="개인통관고유부호" name="personalCustomsCode" value={formData.personalCustomsCode} onChange={handleChange} placeholder="P로 시작하는 13자리" required />
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '10px' }}>
            <input type="checkbox" name="isDefault" checked={formData.isDefault} onChange={handleChange} disabled={isFirstAddress} style={{ width: '18px', height: '18px', accentColor: '#f97316' }} />
            기본 배송지로 설정
          </label>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '14px', background: '#f1f5f9', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>취소</button>
          <button onClick={handleSubmit} style={{ flex: 1, padding: '14px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>저장</button>
        </div>
      </div>

      {isOpenPostcode && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ background: '#fff', width: '90%', maxWidth: '450px', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 20px', borderBottom: '1px solid #eee' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>우편번호 검색</h3>
              <button onClick={() => setIsOpenPostcode(false)} style={{ border: 'none', background: 'none', fontSize: '20px' }}>✕</button>
            </div>
            <DaumPostcode onComplete={handleCompletePostcode} style={{ height: '400px' }} />
          </div>
        </div>
      )}
    </div>
  );
}