"use client";
import React, { useState, useEffect, useCallback } from 'react';
import GuideLayout from '../../../components/GuideLayout';

export default function DefaultAddressPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addresses, setAddresses] = useState<any[]>([]);

  const fetchAddresses = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`/api/addresses?userId=${userId}`);
      const data = await res.json();
      if (data.success) {
        setAddresses(data.addresses);
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
      // 주소 정보를 업데이트하여 기본 배송지로 설정
      // 기존 API(/api/addresses POST)가 isDefault: true를 받으면 다른 것들을 false로 만듬
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
        alert('기본 배송지가 변경되었습니다.');
        fetchAddresses(userId);
      }
    } catch (error) {
      console.error("기본 배송지 설정 오류:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>로딩 중...</div>;

  return (
    <GuideLayout title="기본 배송지 설정" type="mypage">
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
        <p style={{ color: '#64748b', marginBottom: '30px', fontSize: '15px' }}>
          주문 시 기본으로 선택될 배송지를 선택해주세요.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {addresses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px', color: '#64748b', background: '#fff', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
              등록된 배송지가 없습니다. 먼저 배송지를 등록해주세요.
            </div>
          ) : (
            addresses.map((addr) => (
              <div 
                key={addr.id} 
                onClick={() => !addr.isDefault && handleSetDefault(addr.id)}
                style={{ 
                  padding: '25px', 
                  background: '#fff',
                  border: `2px solid ${addr.isDefault ? '#f97316' : '#e2e8f0'}`, 
                  borderRadius: '15px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  cursor: addr.isDefault ? 'default' : (saving ? 'not-allowed' : 'pointer'),
                  transition: 'all 0.2s',
                  boxShadow: addr.isDefault ? '0 4px 12px rgba(249, 115, 22, 0.1)' : 'none',
                  opacity: saving && !addr.isDefault ? 0.7 : 1
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '18px', color: addr.isDefault ? '#f97316' : '#1e293b' }}>
                      {addr.recipientName}
                    </span>
                    {addr.isDefault && (
                      <span style={{ fontSize: '12px', background: '#f97316', color: '#fff', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                        기본 배송지
                      </span>
                    )}
                  </div>
                  <div style={{ color: '#475569', fontSize: '15px', marginBottom: '5px' }}>
                    ({addr.zipCode}) {addr.address} {addr.detailAddress}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '14px' }}>
                    {addr.phone}
                  </div>
                </div>
                
                <div style={{ marginLeft: '20px' }}>
                  {addr.isDefault ? (
                    <div style={{ color: '#f97316' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                  ) : (
                    <div style={{ 
                      width: '24px', 
                      height: '24px', 
                      borderRadius: '50%', 
                      border: '2px solid #cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ marginTop: '40px', textAlign: 'center' }}>
          <button 
            onClick={() => window.location.href = '/mypage/profile'}
            style={{ 
              padding: '12px 30px', 
              background: '#f1f5f9', 
              color: '#475569', 
              border: 'none', 
              borderRadius: '10px', 
              fontWeight: 'bold', 
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
          >
            돌아가기
          </button>
        </div>
      </div>
    </GuideLayout>
  );
}
