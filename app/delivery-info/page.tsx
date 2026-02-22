"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// 아까 만든 데이터 파일을 불러옵니다. 경로가 다르면 수정해주세요.
import { DELIVERY_FEE_DATA } from '../lib/shippingData'; 
import { useExchangeRate } from '../context/ExchangeRateContext';

export default function DeliveryInfoPage() {
  const router = useRouter();
  
  // 상태 관리: 입력 무게
  const [inputWeight, setInputWeight] = useState<number>(0.5);
  const { exchangeRate: globalRate } = useExchangeRate();
  const exchangeRate = globalRate / 100; // 요금표 계산 로직상 1엔 기준으로 변환

  // 2. 요금표에서 특정 무게 구간의 엔화 가격을 찾는 로직
  const getFeeJpy = (method: string, weight: number) => {
    const table = DELIVERY_FEE_DATA[method];
    if (!table) return 0;
    const tiers = Object.keys(table).map(Number).sort((a, b) => a - b);
    const targetTier = tiers.find(t => t >= weight) || tiers[tiers.length - 1];
    return table[targetTier] || 0;
  };

  // 3. 요금표용 무게 리스트 (주요 구간만 추출하거나 전체 출력)
  const displayWeights = [0.5, 1.0, 1.5, 2.0, 3.0, 4.0, 5.0, 10.0, 20.0, 30.0];

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '50px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
      
      {/* 타이틀 및 환율 정보 */}
      <div style={{ borderBottom: '2px solid #333', paddingBottom: '20px', marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#333', marginBottom: '10px' }}>✈️ 국제 배송 요금 안내</h1>
          <p style={{ color: '#666' }}>현재 적용 환율: 100엔 = {(exchangeRate * 100).toFixed(2)}원</p>
        </div>
        <button 
          onClick={() => router.back()}
          style={{ padding: '12px 25px', backgroundColor: '#f5f5f5', border: '1px solid #ddd', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}
        >
          돌아가기
        </button>
      </div>

      {/* 1. 배송 수단별 특징 안내 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '50px' }}>
        <FeatureBox title="EMS 항공" desc="가장 빠르고 안정적인 우체국 항공 서비스 (3~5일)" color="#d9534f" />
        <FeatureBox title="EMS 선편" desc="시간은 걸리지만 저렴한 경제적 배송 (2~4주)" color="#5bc0de" />
        <FeatureBox title="판토스 항공" desc="합리적인 가격의 대형 항공 배송 (4~7일)" color="#337ab7" />
        <FeatureBox title="선편 특송" desc="오사카항 기준 최저가 선편 서비스 (2~3주)" color="#5cb85c" />
      </div>

      {/* 2. 무게별 요금표 (원화 환산 완료) */}
      <h2 style={{ fontSize: '24px', marginBottom: '20px', color: '#337ab7' }}>┃ 주요 무게별 요금표 (단위: 원)</h2>
      <div style={{ overflowX: 'auto', marginBottom: '60px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa', borderTop: '2px solid #333', borderBottom: '1px solid #ddd' }}>
              <th style={thStyle}>중량 (kg)</th>
              <th style={thStyle}>EMS 항공</th>
              <th style={thStyle}>EMS 선편</th>
              <th style={thStyle}>판토스</th>
              <th style={thStyle}>선편 특송</th>
            </tr>
          </thead>
          <tbody>
            {displayWeights.map((w, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ ...tdStyle, fontWeight: 'bold', backgroundColor: '#fafafa' }}>{w} kg</td>
                <td style={tdStyle}>{Math.floor(getFeeJpy("EMS_AIR", w) * exchangeRate).toLocaleString()}</td>
                <td style={tdStyle}>{Math.floor(getFeeJpy("EMS_SHIP", w) * exchangeRate).toLocaleString()}</td>
                <td style={tdStyle}>{Math.floor(getFeeJpy("PANTOS", w) * exchangeRate).toLocaleString()}</td>
                <td style={tdStyle}>{Math.floor(getFeeJpy("SHIP_SPECIAL", w) * exchangeRate).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 3. 실시간 배송비 계산기 (구간 데이터 기반) */}
      <div style={{ backgroundColor: '#f9f9f9', padding: '40px', borderRadius: '10px', border: '1px solid #ddd', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
        <h2 style={{ fontSize: '26px', textAlign: 'center', marginBottom: '30px', fontWeight: 'bold' }}>🧮 실시간 정밀 배송비 계산기</h2>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px' }}>무게를 입력하면 실제 요금표 구간 데이터에 맞춰 자동 계산됩니다.</p>
        
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginBottom: '50px' }}>
          <span style={{ fontSize: '22px', fontWeight: 'bold' }}>측정 무게 :</span>
          <input 
            type="number" 
            step="0.1" 
            value={inputWeight} 
            onChange={(e) => setInputWeight(Number(e.target.value))}
            style={{ width: '140px', padding: '12px', fontSize: '24px', textAlign: 'center', border: '3px solid #337ab7', borderRadius: '6px', fontWeight: 'bold' }}
          />
          <span style={{ fontSize: '22px', fontWeight: 'bold' }}>kg</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '25px' }}>
          <CalcResult label="EMS 항공" price={Math.floor(getFeeJpy("EMS_AIR", inputWeight) * exchangeRate)} color="#d9534f" />
          <CalcResult label="EMS 선편" price={Math.floor(getFeeJpy("EMS_SHIP", inputWeight) * exchangeRate)} color="#5bc0de" />
          <CalcResult label="판토스 항공" price={Math.floor(getFeeJpy("PANTOS", inputWeight) * exchangeRate)} color="#337ab7" />
          <CalcResult label="선편 특송" price={Math.floor(getFeeJpy("SHIP_SPECIAL", inputWeight) * exchangeRate)} color="#5cb85c" />
        </div>
        
        <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#fff', border: '1px dashed #ccc', borderRadius: '6px', fontSize: '14px', color: '#777', lineHeight: '1.6' }}>
            <strong>※ 안내사항</strong><br/>
            - 위 금액은 일본 현지 물류센터에서 한국 주소지까지의 기본 순수 운임입니다.<br/>
            - 실제 배송비는 포장 후 박스의 부피무게(가로x세로x높이/6000)와 실무게 중 큰 쪽으로 책정됩니다.<br/>
            - 20만원(약 150달러) 이상의 상품 구매 시 관부가세가 별도로 발생할 수 있습니다.
        </div>
      </div>
    </div>
  );
}

// 서브 컴포넌트: 특징 박스
const FeatureBox = ({ title, desc, color }: any) => (
  <div style={{ padding: '20px', borderLeft: `6px solid ${color}`, backgroundColor: '#fff', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', borderRadius: '4px' }}>
    <h3 style={{ margin: '0 0 12px 0', color: color, fontSize: '20px', fontWeight: 'bold' }}>{title}</h3>
    <p style={{ margin: 0, fontSize: '15px', color: '#555', lineHeight: '1.5' }}>{desc}</p>
  </div>
);

// 서브 컴포넌트: 계산 결과 카드
const CalcResult = ({ label, price, color }: any) => (
  <div style={{ textAlign: 'center', padding: '25px', backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #eee', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
    <div style={{ fontSize: '16px', color: '#888', marginBottom: '12px', fontWeight: 'bold' }}>{label}</div>
    <div style={{ fontSize: '26px', fontWeight: 'bold', color: color }}>{price.toLocaleString()} 원</div>
    <div style={{ fontSize: '12px', color: '#ccc', marginTop: '8px' }}>단위: KRW</div>
  </div>
);

const thStyle = { padding: '18px', fontSize: '16px', fontWeight: 'bold' };
const tdStyle = { padding: '16px', fontSize: '17px' };
