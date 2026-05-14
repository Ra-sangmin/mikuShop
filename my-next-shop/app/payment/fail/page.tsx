'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import GuideLayout from '@/app/components/GuideLayout'; // 미쿠짱 레이아웃 유지

function FailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // 토스페이먼츠에서 넘겨주는 에러 파라미터 받기
  const message = searchParams.get('message') || '결제를 취소하셨거나 알 수 없는 오류가 발생했습니다.';
  const code = searchParams.get('code') || 'PAYMENT_FAILED';

  return (
    <div style={{ maxWidth: '600px', margin: '80px auto', textAlign: 'center', fontFamily: 'Pretendard' }}>
      <div style={{ 
        backgroundColor: '#fff', 
        padding: '50px 40px', 
        borderRadius: '32px', 
        boxShadow: '0 10px 40px rgba(0,0,0,0.04)', 
        border: '1px solid #f1f5f9' 
      }}>
        
        {/* 실패 아이콘 영역 */}
        <div style={{ 
          width: '80px', 
          height: '80px', 
          backgroundColor: '#fef2f2', 
          borderRadius: '50%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          margin: '0 auto 24px',
          color: '#ef4444',
          fontSize: '36px'
        }}>
          <i className="fa fa-exclamation-triangle"></i> {/* 폰트어썸 아이콘 (또는 ⚠️ 이모지 사용 가능) */}
        </div>

        {/* 텍스트 영역 */}
        <h2 style={{ fontSize: '26px', fontWeight: '900', color: '#0f172a', marginBottom: '16px' }}>
          결제에 실패했습니다
        </h2>
        
        <p style={{ color: '#64748b', fontSize: '15px', lineHeight: '1.6', marginBottom: '30px', wordBreak: 'keep-all' }}>
          입력하신 정보가 올바르지 않거나, 결제 한도 초과 등의 사유로 결제가 중단되었습니다.<br/>
          아래의 사유를 확인해 주세요.
        </p>

        {/* 에러 상세 정보 박스 */}
        <div style={{ 
          backgroundColor: '#f8fafc', 
          padding: '24px', 
          borderRadius: '20px', 
          textAlign: 'left',
          border: '1px dashed #cbd5e1',
          marginBottom: '40px'
        }}>
          <div style={{ marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
              오류 메시지
            </span>
            <span style={{ fontSize: '16px', fontWeight: '800', color: '#ef4444', wordBreak: 'keep-all' }}>
              {message}
            </span>
          </div>
          <div>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
              오류 코드
            </span>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#475569', fontFamily: 'monospace' }}>
              {code}
            </span>
          </div>
        </div>

        {/* 버튼 영역 */}
        <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
          <button 
            onClick={() => router.push('/mypage/money/charge')}
            style={{ 
              width: '100%', 
              padding: '18px', 
              backgroundColor: '#d27377', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '16px', 
              fontSize: '17px', 
              fontWeight: '800', 
              cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(210, 115, 119, 0.2)',
              transition: 'all 0.2s ease'
            }}
          >
            충전 페이지로 돌아가기
          </button>
          
          <button 
            onClick={() => router.push('/contact')}
            style={{ 
              width: '100%', 
              padding: '18px', 
              backgroundColor: '#fff', 
              color: '#64748b', 
              border: '1px solid #e2e8f0', 
              borderRadius: '16px', 
              fontSize: '16px', 
              fontWeight: '700', 
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            고객센터 문의하기
          </button>
        </div>

      </div>
    </div>
  );
}

export default function PaymentFailPage() {
  return (
    <GuideLayout title="결제 실패" type="money">
      {/* 🌟 useSearchParams를 사용할 때는 Suspense로 감싸는 것이 Next.js 권장 사항입니다 */}
      <Suspense fallback={<div style={{ textAlign: 'center', padding: '100px', fontSize: '20px', fontWeight: 'bold' }}>정보를 불러오는 중입니다...</div>}>
        <FailContent />
      </Suspense>
    </GuideLayout>
  );
}