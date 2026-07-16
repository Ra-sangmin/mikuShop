'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import GuideLayout from '../../components/GuideLayout';
import DaumPostcode from 'react-daum-postcode';
import { useMikuAlert } from '../../context/MikuAlertContext';
import { useSearchParams } from 'next/navigation';

// =================================================================
// 1. 비즈니스 로직 영역 (Business Logic Layer)
// 데이터 연동, 팝업 상태 관리, 주소 등록/수정/삭제 등의 순수 기능만 전담합니다.
// =================================================================
function useProfileEditLogic() {
  const searchParams = useSearchParams();
  const { showAlert } = useMikuAlert();
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);

  const [user, setUser] = useState({
    id: '', name: '', email: '', phone: '', nickname: '', personalCustomsCode: '', defaultAddressId: null as number | null,
  });

  const fetchAddresses = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`/api/addresses?userId=${userId}`);
      const data = await res.json();
      if (data.success) {
        const sorted = [...data.addresses].sort((a, b) => (a.isDefault ? -1 : b.isDefault ? 1 : 0));
        setAddresses(sorted);
      }
    } catch (error) { console.error("배송지 불러오기 실패:", error); }
  }, []);

  useEffect(() => {
    if (searchParams.get('newAddress') === 'true') {
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
              name: data.user.name || '', email: data.user.email || '', phone: data.user.phone || '',
              nickname: data.user.nickname || '', personalCustomsCode: data.user.personalCustomsCode || '',
              defaultAddressId: data.user.defaultAddressId || null,
            });
            fetchAddresses(data.user.id.toString());
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else setLoading(false);
  }, [fetchAddresses]);

  const handleAddressAction = async (addressData: any) => {
    if (!addressData.recipientName) return showAlert('수취인명(한글)을 입력해주세요.', 'warning');
    if (!addressData.phone) return showAlert('연락처를 입력해주세요.', 'warning');
    if (!addressData.zipCode || !addressData.address) return showAlert('주소 검색을 통해 주소를 입력해주세요.', 'warning');
    if (!addressData.detailAddress) return showAlert('상세 주소를 입력해주세요.', 'warning');
    if (!addressData.personalCustomsCode) return showAlert('개인통관고유부호를 입력해주세요.', 'warning');

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
          if (userData.success) setUser(prev => ({ ...prev, defaultAddressId: userData.user.defaultAddressId }));
        }
      }
    } catch (error) { showAlert('배송지 저장 중 오류가 발생했습니다.', 'error'); }
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
    } catch (error) { showAlert('배송지 삭제 중 오류가 발생했습니다.', 'error'); }
  };

  const openNewAddress = () => { setEditingAddress(null); setIsAddressModalOpen(true); };
  const openEditAddress = (addr: any) => { setEditingAddress(addr); setIsAddressModalOpen(true); };
  const closeAddressModal = () => setIsAddressModalOpen(false);

  return {
    loading, user, addresses, isAddressModalOpen, editingAddress,
    handleAddressAction, deleteAddress, openNewAddress, openEditAddress, closeAddressModal
  };
}

function useAddressModalLogic(address: any, isFirstAddress: boolean) {
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

  return { formData, handleChange, isOpenPostcode, setIsOpenPostcode, detailAddressRef, handleCompletePostcode };
}


// =================================================================
// 2. 화면 컴포넌트 영역 (View Layer)
// 인라인 스타일 배제, 의미 있는 클래스명 적용
// =================================================================
function InputGroup({ label, name, value, onChange, type = "text", placeholder = "", required = false, readOnly = false, inputRef = null }: any) {
  return (
    <div className="miku-profile-input-group">
      <label className="input-label">{label} {required && <span className="required">*</span>}</label>
      <input 
        ref={inputRef} type={type} name={name} value={value} onChange={onChange} 
        placeholder={placeholder} readOnly={readOnly}
        className={`input-field ${readOnly ? 'readonly' : ''}`}
      />
    </div>
  );
}

function AddressModal({ address, onClose, onSave, isFirstAddress }: any) {
  const { formData, handleChange, isOpenPostcode, setIsOpenPostcode, detailAddressRef, handleCompletePostcode } = useAddressModalLogic(address, isFirstAddress);

  return (
    <div className="miku-profile-modal-overlay anim-fade-in">
      <div className="miku-profile-modal-content anim-slide-up-modal">
        
        <div className="modal-header">
          <h3>{address ? '배송지 수정' : '새 배송지 추가'}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <InputGroup label="수취인명(한글)" name="recipientName" value={formData.recipientName} onChange={handleChange} required />
          <InputGroup label="수취인명(영문)" name="recipientEnglishName" value={formData.recipientEnglishName} onChange={handleChange} />
          <InputGroup label="연락처" name="phone" value={formData.phone} onChange={handleChange} required />
          
          <div className="miku-profile-input-group">
            <label className="input-label">주소 <span className="required">*</span></label>
            <div className="address-search-row">
              <input type="text" value={formData.zipCode} readOnly placeholder="우편번호" className="input-field readonly" />
              <button type="button" className="btn-search" onClick={() => setIsOpenPostcode(true)}>검색</button>
            </div>
            <input type="text" value={formData.address} readOnly placeholder="기본 주소" className="input-field readonly" />
            <input type="text" ref={detailAddressRef} name="detailAddress" value={formData.detailAddress} onChange={handleChange} placeholder="상세 주소 입력" className="input-field" />
          </div>

          <InputGroup label="개인통관고유부호" name="personalCustomsCode" value={formData.personalCustomsCode} onChange={handleChange} placeholder="P로 시작하는 13자리" required />
          
          <label className="checkbox-label">
            <input type="checkbox" name="isDefault" checked={formData.isDefault} onChange={handleChange} disabled={isFirstAddress} className="checkbox-input" />
            <span className="checkbox-text">기본 배송지로 설정</span>
          </label>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>취소</button>
          <button className="btn-save" onClick={() => onSave(formData)}>저장</button>
        </div>
      </div>

      {isOpenPostcode && (
        <div className="miku-profile-postcode-overlay anim-fade-in">
          <div className="postcode-content">
            <div className="postcode-header">
              <h3>우편번호 검색</h3>
              <button className="close-btn" onClick={() => setIsOpenPostcode(false)}>✕</button>
            </div>
            <DaumPostcode onComplete={handleCompletePostcode} style={{ height: '400px', width: '100%' }} />
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileEditContent() {
  const { loading, user, addresses, isAddressModalOpen, editingAddress, handleAddressAction, deleteAddress, openNewAddress, openEditAddress, closeAddressModal } = useProfileEditLogic();

  if (loading) return <div className="miku-profile-loading">데이터를 불러오는 중입니다...</div>;

  const defaultAddress = addresses.find(a => a.id === user.defaultAddressId) || addresses.find(a => a.isDefault);

  return (
    <div className="miku-profile-wrapper">
      
      {/* 🌟 나의 기본 배송지 섹션 */}
      <section className="miku-profile-section anim-slide-up">
        <div className="section-header">
          <h2>나의 기본 배송지</h2>
          <button className="btn-primary-outline" onClick={() => window.location.href = '/mypage/profile/default-address'}>
            기본 배송지 변경
          </button>
        </div>

        {defaultAddress ? (
          <div className="default-address-card">
            <div className="address-header">
              <div className="recipient-info">
                <span className="name">{defaultAddress.recipientName}</span>
                {defaultAddress.recipientEnglishName && <span className="eng-name">{defaultAddress.recipientEnglishName}</span>}
              </div>
              <span className="badge-default">기본</span>
            </div>
            
            <div className="address-body">
              <div className="info-row"><span className="label">우편번호</span> <span className="value">{defaultAddress.zipCode}</span></div>
              <div className="info-row full"><span className="value">{defaultAddress.address}</span></div>
              <div className="info-row full"><span className="value highlight">{defaultAddress.detailAddress}</span></div>
            </div>

            <div className="address-footer">
              <div className="footer-item">
                <span className="label">연락처</span>
                <span className="value">{defaultAddress.phone}</span>
              </div>
              {defaultAddress.personalCustomsCode && (
                <div className="footer-item">
                  <span className="label">통관번호</span>
                  <span className="value">{defaultAddress.personalCustomsCode}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="empty-state">등록된 기본 배송지가 없습니다.</div>
        )}
      </section>

      {/* 🌟 전체 배송지 목록 섹션 */}
      <section className="miku-profile-section anim-slide-up delay-1">
        <div className="section-header">
          <h2>전체 배송지 목록</h2>
          <button className="btn-primary" onClick={openNewAddress}>새 배송지 추가</button>
        </div>

        <div className="address-list">
          {addresses.length === 0 ? (
            <div className="empty-state">등록된 배송지가 없습니다.</div>
          ) : (
            addresses.map((addr) => {
              const isDefault = addr.id === user.defaultAddressId;
              return (
                <div key={addr.id} className={`address-list-item ${isDefault ? 'is-default' : ''}`}>
                  <div className="item-info">
                    <div className="item-header">
                      <span className="name">{addr.recipientName}</span>
                      {isDefault && <span className="badge-mini">기본배송지</span>}
                    </div>
                    <div className="item-address">({addr.zipCode}) {addr.address} {addr.detailAddress}</div>
                    <div className="item-phone">{addr.phone}</div>
                  </div>
                  
                  <div className="item-actions">
                    <button className="btn-edit" onClick={() => openEditAddress(addr)}>수정</button>
                    {!isDefault && <button className="btn-delete" onClick={() => deleteAddress(addr.id)}>삭제</button>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* 모달 렌더링 */}
      {isAddressModalOpen && (
        <AddressModal 
          address={editingAddress} onClose={closeAddressModal} 
          onSave={handleAddressAction} isFirstAddress={addresses.length === 0}
        />
      )}

      {/* ================================================================= */}
      {/* 3. 디자인 영역 (CSS Layer) */}
      {/* 글로벌 오염 방지를 위해 .miku-profile- 접두사를 일관되게 사용합니다. */}
      {/* ================================================================= */}
      <style jsx global>{`
        .miku-profile-wrapper {
          max-width: 840px;
          margin: 0 auto;
          font-family: 'Pretendard', "Noto Sans KR", sans-serif;
          color: #0f172a;
          box-sizing: border-box;
        }

        .miku-profile-loading { padding: 100px; text-align: center; color: #64748b; font-weight: 600; }

        /* 🌟 공통 섹션 패널 */
        .miku-profile-section {
          background: #ffffff;
          border-radius: 24px;
          padding: 32px 40px;
          border: 1px solid rgba(226, 232, 240, 0.8);
          box-shadow: 0 10px 30px rgba(0,0,0,0.03);
          margin-bottom: 40px;
        }
        
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 20px;
          border-bottom: 1px solid #f1f5f9;
        }
        .section-header h2 { font-size: 20px; font-weight: 900; color: #0f172a; margin: 0; }

        /* 공통 버튼 디자인 */
        .btn-primary {
          background: linear-gradient(135deg, #ff4b2b 0%, #e63e1f 100%);
          color: #fff; padding: 10px 20px; border-radius: 12px; border: none;
          font-size: 14px; font-weight: 800; cursor: pointer; transition: all 0.3s;
          box-shadow: 0 4px 10px rgba(255, 75, 43, 0.2);
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(255, 75, 43, 0.3); }

        .btn-primary-outline {
          background: #fff8f6; color: #ea580c; border: 1px solid #fdba74;
          padding: 10px 20px; border-radius: 12px; font-size: 14px; font-weight: 800;
          cursor: pointer; transition: all 0.3s;
        }
        .btn-primary-outline:hover { background: #ea580c; color: #fff; }

        .empty-state {
          text-align: center; padding: 40px; color: #94a3b8; font-size: 15px;
          background: #f8fafc; border-radius: 16px; font-weight: 500;
        }

        /* 🌟 기본 배송지 카드 */
        .default-address-card { padding: 10px 0; }
        .address-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
        .recipient-info { display: flex; flex-direction: column; gap: 4px; }
        .recipient-info .name { font-size: 22px; font-weight: 900; color: #0f172a; line-height: 1; }
        .recipient-info .eng-name { font-size: 14px; color: #64748b; font-weight: 600; }
        
        .badge-default {
          background: #fff8f6; color: #ea580c; border: 1px solid #fdba74;
          padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 800;
        }

        .address-body { color: #475569; font-size: 16px; margin-bottom: 24px; display: flex; flex-direction: column; gap: 6px; }
        .info-row { display: flex; align-items: center; gap: 12px; }
        .info-row .label { color: #94a3b8; font-size: 14px; font-weight: 700; }
        .info-row .value { font-weight: 500; }
        .info-row .value.highlight { font-weight: 800; color: #0f172a; }

        .address-footer {
          display: flex; gap: 32px; background: #f8fafc; padding: 20px 24px; border-radius: 16px; border: 1px solid #f1f5f9;
        }
        .footer-item { display: flex; flex-direction: column; gap: 6px; }
        .footer-item .label { font-size: 12px; color: #94a3b8; font-weight: 800; text-transform: uppercase; }
        .footer-item .value { font-size: 15px; font-weight: 700; color: #334155; }

        /* 🌟 배송지 목록 아이템 */
        .address-list { display: flex; flex-direction: column; gap: 16px; }
        .address-list-item {
          display: flex; justify-content: space-between; align-items: center;
          padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;
          background: #ffffff; transition: all 0.3s;
        }
        .address-list-item:hover { border-color: #cbd5e1; box-shadow: 0 10px 20px rgba(0,0,0,0.03); transform: translateY(-2px); }
        .address-list-item.is-default { background: #fff8f6; border-color: #fdba74; }

        .item-info { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 0; }
        .item-header { display: flex; align-items: center; gap: 10px; }
        .item-header .name { font-size: 18px; font-weight: 800; color: #0f172a; }
        .badge-mini { background: #ea580c; color: #fff; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 800; }
        
        .item-address { color: #64748b; font-size: 14px; line-height: 1.5; word-break: keep-all; }
        .item-phone { color: #475569; font-size: 14px; font-weight: 600; }

        .item-actions { display: flex; gap: 8px; }
        .btn-edit, .btn-delete {
          padding: 8px 16px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px;
          font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s;
        }
        .btn-edit { color: #334155; }
        .btn-edit:hover { background: #f1f5f9; border-color: #94a3b8; }
        .btn-delete { color: #ef4444; border-color: #fca5a5; }
        .btn-delete:hover { background: #fff1f2; border-color: #ef4444; }

        /* 🌟 프리미엄 모달 디자인 */
        .miku-profile-modal-overlay {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
          background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          z-index: 2000; padding: 20px; box-sizing: border-box;
        }
        .miku-profile-modal-content {
          background: #ffffff; width: 100%; max-width: 520px; border-radius: 28px;
          box-shadow: 0 24px 48px rgba(0,0,0,0.1); overflow: hidden; display: flex; flex-direction: column;
          max-height: 90vh;
        }
        
        .modal-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 24px 32px; border-bottom: 1px solid #f1f5f9;
        }
        .modal-header h3 { margin: 0; font-size: 20px; font-weight: 800; color: #0f172a; }
        .close-btn {
          background: #f1f5f9; border: none; width: 36px; height: 36px; border-radius: 50%;
          font-size: 16px; color: #64748b; cursor: pointer; transition: all 0.2s;
        }
        .close-btn:hover { background: #e2e8f0; color: #0f172a; transform: rotate(90deg); }

        .modal-body { padding: 32px; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; }
        
        .modal-footer {
          display: flex; gap: 12px; padding: 24px 32px; background: #f8fafc; border-top: 1px solid #f1f5f9;
        }
        .btn-cancel, .btn-save { flex: 1; padding: 16px; border-radius: 14px; font-size: 15px; font-weight: 800; cursor: pointer; transition: all 0.2s; border: none; }
        .btn-cancel { background: #e2e8f0; color: #475569; }
        .btn-cancel:hover { background: #cbd5e1; color: #0f172a; }
        .btn-save { background: linear-gradient(135deg, #ff4b2b 0%, #e63e1f 100%); color: #fff; box-shadow: 0 4px 10px rgba(255, 75, 43, 0.2); }
        .btn-save:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(255, 75, 43, 0.3); }

        /* 입력 폼 그룹 */
        .miku-profile-input-group { display: flex; flex-direction: column; gap: 8px; }
        .input-label { font-size: 13px; font-weight: 800; color: #475569; }
        .input-label .required { color: #ef4444; margin-left: 2px; }
        .input-field {
          width: 100%; padding: 14px 16px; border-radius: 12px; border: 1px solid #cbd5e1;
          font-size: 15px; color: #0f172a; transition: all 0.2s; box-sizing: border-box; outline: none;
        }
        .input-field:focus { border-color: #ff4b2b; box-shadow: 0 0 0 4px rgba(255, 75, 43, 0.1); }
        .input-field.readonly { background: #f8fafc; color: #64748b; cursor: not-allowed; }
        .input-field.readonly:focus { border-color: #cbd5e1; box-shadow: none; }
        
        .address-search-row { display: flex; gap: 8px; }
        .btn-search {
          padding: 0 20px; background: #0f172a; color: #fff; border: none; border-radius: 12px;
          font-size: 14px; font-weight: 800; cursor: pointer; transition: background 0.2s; flex-shrink: 0;
        }
        .btn-search:hover { background: #334155; }

        .checkbox-label {
          display: flex; align-items: center; gap: 10px; padding: 16px; background: #fff8f6;
          border: 1px solid #ffedd5; border-radius: 12px; cursor: pointer; margin-top: 8px;
        }
        .checkbox-input { width: 20px; height: 20px; accent-color: #ea580c; cursor: pointer; }
        .checkbox-text { font-size: 15px; font-weight: 800; color: #ea580c; }

        /* 🌟 다음 우편번호 모달 */
        .miku-profile-postcode-overlay {
          position: absolute; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center;
          border-radius: 28px; z-index: 3000;
        }
        .postcode-content { background: #fff; width: 90%; border-radius: 20px; overflow: hidden; }
        .postcode-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
        .postcode-header h3 { margin: 0; font-size: 16px; font-weight: 800; }

        /* 애니메이션 */
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUpModal { from { opacity: 0; transform: translateY(40px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        
        .anim-fade-in { animation: fadeIn 0.3s ease forwards; }
        .anim-slide-up { opacity: 0; animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .anim-slide-up-modal { opacity: 0; animation: slideUpModal 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .delay-1 { animation-delay: 0.1s; }

        /* =============================================================
           📱 모바일 반응형 처리
           ============================================================= */
        @media (max-width: 768px) {
          .miku-profile-section { padding: 24px 20px; border-radius: 20px; }
          .section-header { flex-direction: column; align-items: flex-start; gap: 16px; }
          .btn-primary, .btn-primary-outline { width: 100%; text-align: center; padding: 14px; }
          
          .address-footer { flex-direction: column; gap: 16px; }
          .address-list-item { flex-direction: column; align-items: stretch; gap: 20px; }
          .item-actions { border-top: 1px dashed #e2e8f0; padding-top: 16px; justify-content: flex-end; }
          .btn-edit, .btn-delete { flex: 1; padding: 12px; text-align: center; }

          .miku-profile-modal-content { border-radius: 24px 24px 0 0; position: absolute; bottom: 0; max-height: 95vh; }
          .modal-body { padding: 24px 20px; }
          .modal-footer { padding: 20px; }
        }
      `}</style>
    </div>
  );
}

export default function ProfileEditPage() {
  return (
    <GuideLayout title="나의 배송지 정보 수정" type="mypage">
      <Suspense fallback={<div className="miku-profile-loading">페이지를 불러오는 중입니다...</div>}>
        <ProfileEditContent />
      </Suspense>
    </GuideLayout>
  );
}