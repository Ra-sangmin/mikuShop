"use client";
import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import GuideLayout from '../../components/GuideLayout';
import DaumPostcode from 'react-daum-postcode';
import { useMikuAlert } from '../../context/MikuAlertContext';
import { useSearchParams } from 'next/navigation';

function ProfileEditContent() {
  const searchParams = useSearchParams();
  const { showAlert } = useMikuAlert();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);

  const [user, setUser] = useState({
    id: '',
    name: '',
    email: '',
    phone: '',
    nickname: '',
    personalCustomsCode: '',
    defaultAddressId: null as number | null,
  });

  const fetchAddresses = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`/api/addresses?userId=${userId}`);
      const data = await res.json();
      if (data.success) {
        const sorted = [...data.addresses].sort((a, b) => {
          if (a.isDefault) return -1;
          if (b.isDefault) return 1;
          return 0;
        });
        setAddresses(sorted);
      }
    } catch (error) {
      console.error("배송지 불러오기 실패:", error);
    }
  }, []);

  useEffect(() => {
    const autoOpen = searchParams.get('newAddress') === 'true';
    if (autoOpen) {
      setEditingAddress(null);
      setIsAddressModalOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const storedId = localStorage.getItem('user_id');
    if (storedId) {
      fetch(`/api/users?id=${storedId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setUser({
              id: data.user.id.toString(),
              name: data.user.name || '',
              email: data.user.email || '',
              phone: data.user.phone || '',
              nickname: data.user.nickname || '',
              personalCustomsCode: data.user.personalCustomsCode || '',
              defaultAddressId: data.user.defaultAddressId || null,
            });
            fetchAddresses(data.user.id.toString());
          }
          setLoading(false);
        })
        .catch(error => {
          console.error("유저 정보 불러오기 실패:", error);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [fetchAddresses]);

  const handleAddressAction = async (addressData: any) => {
    if (!addressData.recipientName) return showAlert('수취인명(한글)을 입력해주세요.');
    if (!addressData.phone) return showAlert('연락처를 입력해주세요.');
    if (!addressData.zipCode || !addressData.address) return showAlert('주소 검색을 통해 주소를 입력해주세요.');
    if (!addressData.detailAddress) return showAlert('상세 주소를 입력해주세요.');
    if (!addressData.personalCustomsCode) return showAlert('개인통관고유부호를 입력해주세요.');

    const storedId = localStorage.getItem('user_id');
    if (!storedId) return;

    try {
      const res = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addressData, userId: storedId }),
      });
      const data = await res.json();
      if (data.success) {
        showAlert(editingAddress ? '배송지가 수정되었습니다.' : '새 배송지가 추가되었습니다.', 'success');
        setIsAddressModalOpen(false);
        setEditingAddress(null);
        fetchAddresses(storedId);
        if (addressData.isDefault) {
          const userRes = await fetch(`/api/users?id=${storedId}`);
          const userData = await userRes.json();
          if (userData.success) {
            setUser(prev => ({ ...prev, defaultAddressId: userData.user.defaultAddressId }));
          }
        }
      }
    } catch (error) {
      console.error("배송지 처리 오류:", error);
      showAlert('배송지 저장 중 오류가 발생했습니다.', 'error');
    }
  };

  const deleteAddress = async (id: number) => {
    if (!window.confirm('이 배송지를 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/addresses?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showAlert('배송지가 삭제되었습니다.', 'success');
        fetchAddresses(user.id);
      }
    } catch (error) {
      console.error("배송지 삭제 오류:", error);
      showAlert('배송지 삭제 중 오류가 발생했습니다.', 'error');
    }
  };

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>로딩 중...</div>;

  const defaultAddress = addresses.find(a => a.id === user.defaultAddressId) || addresses.find(a => a.isDefault);

  return (
    <>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
          <section style={{ background: '#fff', padding: '30px', borderRadius: '15px', border: '1px solid #e2e8f0', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>나의 기본 배송지</h3>
              <button 
                type="button"
                onClick={() => window.location.href = '/mypage/profile/default-address'}
                style={{ padding: '8px 16px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                기본 배송지 변경
              </button>
            </div>
            {defaultAddress ? (
              <div style={{ padding: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontWeight: '900', fontSize: '20px', color: '#1e293b' }}>{defaultAddress.recipientName}</span>
                    {defaultAddress.recipientEnglishName && (
                      <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>{defaultAddress.recipientEnglishName}</span>
                    )}
                  </div>
                  <span style={{ fontSize: '12px', background: '#fff8f6', color: '#f97316', padding: '3px 8px', borderRadius: '6px', border: '1px solid #f97316', fontWeight: 'bold' }}>기본 배송지</span>
                </div>
                <div style={{ color: '#475569', fontSize: '16px', lineHeight: '1.6', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 'bold' }}>우편번호</span>
                    <span style={{ fontWeight: '600' }}>{defaultAddress.zipCode}</span>
                  </div>
                  <div>{defaultAddress.address}</div>
                  <div style={{ fontWeight: '600', color: '#1e293b' }}>{defaultAddress.detailAddress}</div>
                </div>
                <div style={{ display: 'flex', gap: '20px', marginTop: '15px', padding: '15px', background: '#f8fafc', borderRadius: '10px' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '2px', fontWeight: 'bold' }}>연락처</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#334155' }}>{defaultAddress.phone}</span>
                  </div>
                  {defaultAddress.personalCustomsCode && (
                    <div>
                      <span style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '2px', fontWeight: 'bold' }}>개인통관고유부호</span>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#334155' }}>{defaultAddress.personalCustomsCode}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ color: '#94a3b8', fontSize: '15px', textAlign: 'center', padding: '40px' }}>
                등록된 기본 배송지가 없습니다.<br/>
                하단의 배송지 목록에서 배송지를 추가하거나 기본값으로 설정해주세요.
              </div>
            )}
          </section>
        </div>

        <section style={{ background: '#fff', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>전체 배송지 목록</h3>
            <button 
              onClick={() => { setEditingAddress(null); setIsAddressModalOpen(true); }}
              style={{ padding: '8px 16px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              새 배송지 추가
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {addresses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '10px' }}>
                등록된 배송지가 없습니다.
              </div>
            ) : (
              addresses.map((addr) => (
                <div key={addr.id} style={{ padding: '20px', border: `1px solid ${addr.id === user.defaultAddressId ? '#f97316' : '#e2e8f0'}`, borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: addr.id === user.defaultAddressId ? '#fff8f6' : '#fff' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{addr.recipientName}</span>
                      {addr.id === user.defaultAddressId && <span style={{ fontSize: '11px', background: '#f97316', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>기본배송지</span>}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '14px', marginBottom: '4px' }}>({addr.zipCode}) {addr.address} {addr.detailAddress}</div>
                    <div style={{ color: '#64748b', fontSize: '14px' }}>{addr.phone}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => { setEditingAddress(addr); setIsAddressModalOpen(true); }}
                      style={{ padding: '4px 12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
                    >
                      수정
                    </button>
                    {addr.id !== user.defaultAddressId && (
                      <button 
                        onClick={() => deleteAddress(addr.id)}
                        style={{ padding: '4px 12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', color: '#ef4444', cursor: 'pointer' }}
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {isAddressModalOpen && (
          <AddressModal 
            address={editingAddress} 
            onClose={() => setIsAddressModalOpen(false)} 
            onSave={handleAddressAction}
            isFirstAddress={addresses.length === 0}
          />
        )}
      </div>
    </>
  );
}

export default function ProfileEditPage() {
  return (
    <GuideLayout title="나의 배송지 정보 수정" type="mypage">
      <Suspense fallback={<div style={{ padding: '50px', textAlign: 'center' }}>로딩 중...</div>}>
        <ProfileEditContent />
      </Suspense>
    </GuideLayout>
  );
}

function AddressModal({ address, onClose, onSave, isFirstAddress }: any) {
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
    let fullAddress = data.address;
    let extraAddress = '';

    if (data.addressType === 'R') {
      if (data.bname !== '') {
        extraAddress += data.bname;
      }
      if (data.buildingName !== '') {
        extraAddress += extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName;
      }
      fullAddress += extraAddress !== '' ? ` (${extraAddress})` : '';
    }

    setFormData(prev => ({
      ...prev,
      zipCode: data.zonecode,
      address: fullAddress,
      detailAddress: ''
    }));

    setIsOpenPostcode(false);

    setTimeout(() => {
      detailAddressRef.current?.focus();
    }, 100);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
      <div style={{ background: '#fff', width: '90%', maxWidth: '500px', padding: '30px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>{address ? '배송지 수정' : '새 배송지 추가'}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '70vh', overflowY: 'auto', padding: '5px' }}>
          <InputGroup label="수취인명(한글)" name="recipientName" value={formData.recipientName} onChange={handleChange} required />
          <InputGroup label="수취인명(영문)" name="recipientEnglishName" value={formData.recipientEnglishName} onChange={handleChange} />
          <InputGroup label="연락처" name="phone" value={formData.phone} onChange={handleChange} required />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#64748b' }}>주소</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input 
                type="text" 
                value={formData.zipCode} 
                readOnly 
                placeholder="우편번호" 
                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', outline: 'none', fontSize: '15px' }} 
              />
              <button 
                type="button" 
                onClick={() => setIsOpenPostcode(true)}
                style={{ padding: '0 15px', backgroundColor: '#5b21b6', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
              >
                우편번호검색
              </button>
            </div>
            <input 
              type="text" 
              value={formData.address} 
              readOnly 
              placeholder="기본 주소" 
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', outline: 'none', fontSize: '15px', marginBottom: '8px' }} 
            />
            <input 
              type="text" 
              ref={detailAddressRef}
              name="detailAddress"
              value={formData.detailAddress} 
              onChange={handleChange} 
              placeholder="상세 주소 (동, 호수 등을 입력해주세요)" 
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', outline: 'none', fontSize: '15px' }} 
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#64748b' }}>개인통관고유부호</label>
              <a 
                href="https://unipass.customs.go.kr/per/persIndex.do" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  fontSize: '12px', 
                  color: '#3b82f6', 
                  textDecoration: 'underline',
                  fontWeight: 'bold'
                }}
              >
                발급/조회하기
              </a>
            </div>
            <input 
              type="text"
              name="personalCustomsCode"
              value={formData.personalCustomsCode}
              onChange={handleChange}
              placeholder="P로 시작하는 13자리 번호"
              style={{ 
                padding: '12px', 
                borderRadius: '8px', 
                border: '1px solid #e2e8f0', 
                outline: 'none',
                fontSize: '15px'
              }}
            />
          </div>
          
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            cursor: isFirstAddress ? 'not-allowed' : 'pointer', 
            fontSize: '15px', 
            fontWeight: 'bold',
            padding: '15px',
            backgroundColor: isFirstAddress ? '#fff8f6' : '#f8fafc',
            borderRadius: '12px',
            border: isFirstAddress ? '1px solid #f97316' : '1px solid #e2e8f0',
            marginTop: '10px',
            transition: 'all 0.2s',
            opacity: isFirstAddress ? 0.9 : 1
          }}
          onMouseEnter={e => { if(!isFirstAddress) { e.currentTarget.style.borderColor = '#f97316'; e.currentTarget.style.backgroundColor = '#fff8f6'; } }}
          onMouseLeave={e => { if(!isFirstAddress) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.backgroundColor = '#f8fafc'; } }}
          >
            <input 
              type="checkbox" 
              name="isDefault" 
              checked={formData.isDefault} 
              onChange={handleChange} 
              disabled={isFirstAddress}
              style={{ width: '20px', height: '20px', cursor: isFirstAddress ? 'not-allowed' : 'pointer', accentColor: '#f97316' }}
            />
            기본 배송지로 설정 {isFirstAddress && <span style={{ fontSize: '12px', color: '#f97316', fontWeight: 'normal' }}>(첫 배송지는 필수로 설정됩니다)</span>}
          </label>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>취소</button>
          <button onClick={() => onSave(formData)} style={{ flex: 1, padding: '12px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>저장</button>
        </div>
      </div>

      {isOpenPostcode && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '500px', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 20px', borderBottom: '1px solid #eee' }}>
              <h3 style={{ margin: 0 }}>우편번호 검색</h3>
              <button onClick={() => setIsOpenPostcode(false)} style={{ border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <DaumPostcode onComplete={handleCompletePostcode} style={{ height: '450px' }} />
          </div>
        </div>
      )}
    </div>
  );
}

function InputGroup({ label, name, value, onChange, type = "text", required = false, readOnly = false, placeholder = "" }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#64748b' }}>{label}</label>
      <input 
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        readOnly={readOnly}
        placeholder={placeholder}
        style={{ 
          padding: '12px', 
          borderRadius: '8px', 
          border: '1px solid #e2e8f0', 
          background: readOnly ? '#f8fafc' : '#fff',
          outline: 'none',
          fontSize: '15px'
        }}
      />
    </div>
  );
}
