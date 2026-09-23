'use client';

import React, { useState, useEffect, useRef } from 'react';
import GuideLayout from '@/app/components/GuideLayout';
import '@/app/guide/guide-common.css';
import { useRouter } from 'next/navigation'; // 🌟 라우터 임포트
import { useMikuAlert } from '@/app/context/MikuAlertContext'; // 🌟 미쿠짱 Alert 임포트
import { Landmark, Hash, User, ShieldCheck, Coins, Undo2, Loader2, ArrowRight, ChevronDown, Check, Search } from 'lucide-react';
import MoneyBalanceCard from '../MoneyBalanceCard';
import GuideTitle from '@/app/guide/components/GuideTitle';

// ==========================================
// 🎨 1. 디자인 및 스타일 시스템 (모든 인라인 스타일 분리)
// ==========================================
const s = {
  // 공통 및 레이아웃
  // 🌟 padding-top을 0으로: GuideLayout이 헤더와 콘텐츠 패널 사이 간격을 이미 없앴는데,
  // 이 컨테이너 자체의 위쪽 padding(48px)이 그 위에 또 여백을 만들고 있었음
  // 🌟 가로 폭: 다른 사이드바 페이지(inquiry/faq 등의 .guide-page-container)처럼 본문 영역 전체를 씁니다.
  container: { width: '100%', padding: '0 0 48px 0', boxSizing: 'border-box' as const, fontFamily: 'Pretendard, "Noto Sans KR", sans-serif' },
  formWrapper: { display: 'flex', flexDirection: 'column' as const, gap: '24px' },

  // 라벨 및 입력창 공통
  label: { display: 'block', fontSize: '13px', fontWeight: '800', color: '#475569', marginLeft: '4px', marginBottom: '8px' },
  
  // 금액 입력 영역
  amountInputWrapper: { position: 'relative' as const, marginBottom: '8px' },
  amountInput: { width: '100%', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', boxSizing: 'border-box' as const, transition: 'all 0.3s ease', padding: '16px 45px 16px 16px', fontSize: '18px', fontWeight: '700', color: '#0f172a' },
  currencyUnit: { position: 'absolute' as const, right: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: '800', color: '#94a3b8', pointerEvents: 'none' as const },
  fullRefundBtn: { background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '13px', color: '#ea580c', fontWeight: '800' },
  
  // 환불 계좌 정보 영역
  accountSection: { paddingTop: '24px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column' as const, gap: '16px' },
  accountTitle: { fontSize: '16px', fontWeight: '900', color: '#0f172a', margin: '0 0 8px 0' },
  standardInput: { width: '100%', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', boxSizing: 'border-box' as const, transition: 'all 0.3s ease', padding: '14px 16px', fontSize: '15px' },
  
  // 하단 안내 및 전송 버튼
  bottomSection: { display: 'flex', flexDirection: 'column' as const, gap: '24px', marginTop: '8px' },
  infoBox: { backgroundColor: '#f8fafc', borderRadius: '16px', padding: '16px', border: '1px solid #f1f5f9' },
  infoText: { fontSize: '12px', color: '#64748b', lineHeight: '1.8', fontWeight: '600', margin: 0, wordBreak: 'keep-all' as const },
  submitBtn: (loading: boolean) => ({ width: '100%', padding: '18px', backgroundColor: loading ? '#cbd5e1' : '#0f172a', color: '#fff', borderRadius: '16px', fontWeight: '900', fontSize: '18px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' })
};

const globalStyles = `
  /* 🌟 화면 디자인은 ../money-common.css(mm- 클래스)에 있습니다. */
  @media (max-width: 768px) {
    /* 🌟 currentMenu(고정 바)와 카드 사이 여백 제거 */
    .refund-container { padding-top: 0 !important; }
  }
`;

// ==========================================
// 🧠 2. 비즈니스 로직 훅 (상태 관리 및 API 통신)
// ==========================================
function useMoneyRefundLogic() {
  const router = useRouter(); // 🌟 라우터 추가
  const { showAlert } = useMikuAlert(); // 🌟 전역 알림 컨텍스트 추가
  const hasAlerted = useRef(false); // 🌟 알림 중복 방지

  const [isAuthChecking, setIsAuthChecking] = useState(true); // 🌟 로그인 확인 상태 추가
  const [balance, setBalance] = useState<number>(0);
  const [amount, setAmount] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [accountHolder, setAccountHolder] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem('user_id');
    
    // 🌟 1. 로그인 체크 로직
    if (!userId) {
      if (!hasAlerted.current) {
        hasAlerted.current = true;
        showAlert('로그인이 필요한 페이지입니다.', 'warning');
        router.push('/auth/login');
      }
      return;
    }

    // 🌟 2. 로그인이 확인되면 인증 중단 -> 화면 표시
    setIsAuthChecking(false);

    // 🌟 3. 유저 잔액 가져오기
    fetch(`/api/users?id=${userId}`)
      .then(res => res.json())
      .then(data => { if (data.success) setBalance(data.user.cyberMoney || 0); })
      .catch(err => console.error(err));
  }, [router, showAlert]);

  const handleRefund = async () => {
    const userId = localStorage.getItem('user_id');
    const amountNum = parseInt(amount);

    // 🌟 기본 alert를 모두 showAlert로 교체
    if (!userId) {
      showAlert('로그인이 필요합니다.', 'warning');
      router.push('/auth/login');
      return;
    }
    if (!amount || amountNum <= 0) return showAlert('환불할 금액을 입력해주세요.', 'warning');
    if (amountNum > balance) return showAlert('환불 가능 금액을 초과했습니다.', 'warning');
    if (!bankName || !accountNumber || !accountHolder) return showAlert('환불받으실 계좌 정보를 모두 입력해주세요.', 'warning');

    setLoading(true);
    try {
      const res = await fetch('/api/money/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amount: amountNum,
          type: 'REFUND',
          bankName,
          accountNumber,
          accountHolder
        })
      });

      if (res.ok) {
        showAlert(`${amountNum.toLocaleString()}원 환불 신청이 접수되었습니다.\n영업일 기준 1-3일 내로 관리자 확인 후 처리됩니다.`, 'success');
        setAmount('');
        // 신청 완료 후 입력 필드 초기화
        setBankName('');
        setAccountNumber('');
        setAccountHolder('');
      } else {
        const errorData = await res.json();
        showAlert(errorData.error || '환불 신청 중 오류가 발생했습니다.', 'warning');
      }
    } catch (error) {
      showAlert('서버 통신 중 오류가 발생했습니다.', 'warning');
    } finally {
      setLoading(false);
    }
  };

  return {
    isAuthChecking, // 🌟 UI 컴포넌트로 내보내기
    balance, amount, setAmount, bankName, setBankName, 
    accountNumber, setAccountNumber, accountHolder, setAccountHolder, 
    loading, handleRefund
  };
}

// ==========================================
// 🖥️ 3. 메인 컴포넌트 (UI 렌더링 전용)
// ==========================================
// 🏦 은행 목록 — 이름 · 짧은 표기 · 상징색 · 로고 파일
//    logo 는 public/images/bankIcon/ 아래 파일명입니다. 파일이 없으면 색 뱃지(short)로 대신 보여 줍니다.
//    로고를 추가하려면 그 폴더에 파일을 넣고 여기 logo 값만 채우면 됩니다. (png · svg 모두 가능)
type Bank = { name: string; short: string; color: string; text?: string; logo?: string };
const BANK_LOGO_DIR = '/images/bankIcon/';
const BANKS: Bank[] = [
  // 로고 파일은 피그마의 '색 타일' 버전(80×80 정사각, 색 배경 + 흰 심볼)을 씁니다.
  // 여백이 파일 안에서 이미 맞춰져 있어, 화면에서는 칸에 꽉 채워 그대로 보여 줍니다.
  { name: 'KB국민은행',  short: 'KB',  color: '#ffbc00', text: '#3b2f00', logo: 'kookmin_bank.svg' },
  { name: '신한은행',    short: '신한', color: '#0046ff', logo: 'sinhan_bank.svg' },
  { name: '우리은행',    short: '우리', color: '#0067ac', logo: 'woori_bank.svg' },
  { name: '하나은행',    short: '하나', color: '#008b84', logo: 'hana_bank.svg' },
  { name: 'NH농협은행',  short: 'NH',  color: '#00a64f', logo: 'nh_bank.svg' },
  { name: 'IBK기업은행', short: 'IBK', color: '#0067b1', logo: 'ibk_bank.svg' },
  { name: '카카오뱅크',  short: 'kakao', color: '#ffe300', text: '#3c1e1e', logo: 'kakao_bank.svg' },
  { name: '토스뱅크',    short: 'toss', color: '#0064ff', logo: 'toss_bank.svg' },
  { name: '케이뱅크',    short: 'K',   color: '#ff6600', logo: 'k_bank.svg' },
  { name: 'SC제일은행',  short: 'SC',  color: '#00a19c', logo: 'sc_bank.svg' },
  { name: '우체국',      short: '우편', color: '#e4002b', logo: 'post_bank.svg' },
];

/** 은행 뱃지 — 로고 파일이 있으면 로고를, 없으면(또는 로고를 못 읽으면) 색 뱃지를 보여 줍니다. */
function BankMark({ bank, className = '' }: { bank: Bank; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (bank.logo && !failed) {
    return (
      <span className={`mm-bank-chip is-logo ${className}`} aria-hidden="true">
        <img src={`${BANK_LOGO_DIR}${bank.logo}`} alt="" onError={() => setFailed(true)} />
      </span>
    );
  }
  return (
    <span className={`mm-bank-chip ${className}`} style={{ background: bank.color, color: bank.text || '#fff' }} aria-hidden="true">
      {bank.short}
    </span>
  );
}

/** 🏦 은행 선택 드롭다운 — 직접 입력도 되고, 목록에서 고를 수도 있습니다. */
function BankSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const keyword = value.trim();
  const matched = BANKS.filter(b => !keyword || b.name.replace(/\s/g, '').includes(keyword.replace(/\s/g, '')));
  const list = matched.length > 0 ? matched : BANKS;
  const picked = BANKS.find(b => b.name === value) || null;

  // 바깥을 누르면 닫습니다
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // 키보드로 고른 항목이 목록 밖으로 나가지 않게 따라갑니다
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelectorAll('li')[cursor]?.scrollIntoView({ block: 'nearest' });
  }, [cursor, open]);

  const choose = (bank: Bank) => { onChange(bank.name); setOpen(false); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) { setOpen(true); setCursor(0); return; }
      setCursor(c => (e.key === 'ArrowDown' ? (c + 1) % list.length : (c - 1 + list.length) % list.length));
    } else if (e.key === 'Enter' && open) {
      e.preventDefault();
      if (list[cursor]) choose(list[cursor]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className={`mm-bank-select ${open ? 'is-open' : ''}`} ref={wrapRef}>
      <div className="mm-input-wrap">
        {picked
          ? <BankMark bank={picked} className="is-inline" />
          : <Landmark size={17} strokeWidth={2} className="mm-input-icon" aria-hidden="true" />}
        <input
          id="mm-bank-name"
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="mm-bank-listbox"
          aria-autocomplete="list"
          autoComplete="off"
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); setCursor(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="은행을 고르거나 직접 입력하세요"
          className="mm-input has-icon refund-input mm-bank-input"
        />
        <button
          type="button"
          className="mm-bank-toggle"
          aria-label={open ? '은행 목록 닫기' : '은행 목록 열기'}
          tabIndex={-1}
          onMouseDown={(e) => { e.preventDefault(); setOpen(o => !o); }}
        >
          <ChevronDown size={17} strokeWidth={2.4} />
        </button>
      </div>

      {open && (
        <div className="mm-bank-menu" role="presentation">
          <div className="mm-bank-menu-head">
            <Search size={13} strokeWidth={2.4} aria-hidden="true" />
            <span>{keyword && matched.length > 0 ? `'${keyword}' 검색 결과 ${matched.length}곳` : '자주 쓰는 은행'}</span>
          </div>
          <ul className="mm-bank-list" id="mm-bank-listbox" role="listbox" ref={listRef}>
            {list.map((b, i) => (
              <li key={b.name}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === b.name}
                  className={`mm-bank-option ${i === cursor ? 'is-cursor' : ''} ${value === b.name ? 'is-picked' : ''}`}
                  onMouseEnter={() => setCursor(i)}
                  onMouseDown={(e) => { e.preventDefault(); choose(b); }}
                >
                  <BankMark bank={b} />
                  <span className="mm-bank-name">{b.name}</span>
                  {value === b.name && <Check size={15} strokeWidth={3} className="mm-bank-check" aria-hidden="true" />}
                </button>
              </li>
            ))}
          </ul>
          <p className="mm-bank-menu-foot">목록에 없으면 직접 입력해도 돼요</p>
        </div>
      )}
    </div>
  );
}

export default function MoneyRefundPage() {
  const {
    isAuthChecking, // 🌟 상태 가져오기
    balance, amount, setAmount, bankName, setBankName, 
    accountNumber, setAccountNumber, accountHolder, setAccountHolder, 
    loading, handleRefund
  } = useMoneyRefundLogic();

  // 🌟 로그인 여부 확인 중일 때는 빈 화면을 렌더링해 깜빡임 방지
  if (isAuthChecking) {
    return <div style={{ height: '100vh', backgroundColor: '#fdfdfd' }} />;
  }

  const numAmount = parseInt(amount || '0') || 0;
  const isOver = numAmount > balance;
  const afterBalance = Math.max(0, balance - numAmount);

  return (
    <GuideLayout title="미쿠짱머니 환불 신청" type="money">
      <style jsx global>{globalStyles}</style>

      <div className="refund-container mm-page">
        {/* 🌟 요약 카드 + 제목 — mypage/wishlist 와 같은 구성 (카드가 제목 위) */}
        <MoneyBalanceCard
          current="refund"
          balance={balance}
          stats={[
            { label: '환불 신청 금액', value: `${numAmount.toLocaleString()}원`, tone: isOver ? 'warn' : 'minus' },
            { label: '환불 가능 금액', value: `${balance.toLocaleString()}원` },
            { label: '환불 후 잔액', value: isOver ? '한도 초과' : `${afterBalance.toLocaleString()}원`, tone: isOver ? 'warn' : 'default', text: isOver },
            { label: '환불 방식', value: '계좌 입금', text: true },
          ]}
        />

        <GuideTitle eyebrow="Refund" title="환불 신청" icon="fa-money-bill-transfer" />

        <div className="refund-card guide-panel mm-anim">
          <div className="mm-stack">

            {/* 01 환불 금액 */}
            <section className="mm-section">
              <div className="mm-section-head">
                <h3 className="mm-section-title"><span className="mm-step">01</span>환불 금액</h3>
                <button type="button" className="mm-text-btn" onClick={() => setAmount(balance.toString())} disabled={balance <= 0}>
                  <Coins size={13} strokeWidth={2.4} />전액 환불
                </button>
              </div>
              <div className={`mm-amount-box ${isOver ? 'is-error' : ''}`}>
                <div className="mm-amount-row">
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-label="환불 신청 금액"
                    value={numAmount ? numAmount.toLocaleString() : ''}
                    onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="금액 입력"
                    className="mm-amount-input"
                  />
                  <span className="mm-amount-unit">원</span>
                </div>
                <div className="mm-amount-foot">
                  <span className={`mm-amount-readout ${isOver ? 'is-error' : numAmount ? '' : 'is-muted'}`}>
                    {isOver ? '보유 머니보다 많이 신청할 수 없어요' : numAmount ? `환불 후 잔액 ${afterBalance.toLocaleString()}원` : '보유 머니 안에서 신청할 수 있어요'}
                  </span>
                  <span className="mm-amount-limit">환불 가능 {balance.toLocaleString()}원</span>
                </div>
              </div>
            </section>

            {/* 02 환불 계좌 */}
            <section className="mm-section">
              <div className="mm-section-head">
                <h3 className="mm-section-title"><span className="mm-step">02</span>환불 받을 계좌</h3>
                <span className="mm-section-sub">본인 명의 계좌를 입력해주세요</span>
              </div>

              <div className="mm-field">
                <label className="mm-label" htmlFor="mm-bank-name">은행명</label>
                <BankSelect value={bankName} onChange={setBankName} />
              </div>

              <div className="mm-field">
                <label className="mm-label" htmlFor="mm-account-number">계좌번호</label>
                <div className="mm-input-wrap">
                  <Hash size={17} strokeWidth={2} className="mm-input-icon" aria-hidden="true" />
                  <input
                    id="mm-account-number"
                    type="text" inputMode="numeric" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="'-' 없이 숫자만 입력" className="mm-input has-icon refund-input"
                  />
                </div>
              </div>

              <div className="mm-field">
                <label className="mm-label" htmlFor="mm-account-holder">예금주</label>
                <div className="mm-input-wrap">
                  <User size={17} strokeWidth={2} className="mm-input-icon" aria-hidden="true" />
                  <input
                    id="mm-account-holder"
                    type="text" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)}
                    placeholder="예금주 성함 입력" className="mm-input has-icon refund-input"
                  />
                </div>
              </div>
            </section>

            {/* 안내 사항 */}
            <div className="mm-notice is-neutral info-box">
              <span className="mm-notice-icon" aria-hidden="true"><ShieldCheck size={17} strokeWidth={2.2} /></span>
              <div className="mm-notice-body">
                <strong className="mm-notice-title">환불 안내</strong>
                <ul>
                  <li>환불 신청은 <b>영업일 기준 1~3일</b> 이내에 처리됩니다.</li>
                  <li>무통장 입금 충전건은 해당 계좌로 현금 환불됩니다.</li>
                  <li>카드 결제건은 카드 승인 취소로 처리될 수 있습니다.</li>
                  <li>이벤트 무상 지급 머니는 환불이 불가능합니다.</li>
                </ul>
              </div>
            </div>

            <div className="mm-summary" translate="no">
              <div className="mm-summary-item">
                <span>환불 신청 금액</span>
                <strong className={isOver ? 'is-error' : 'is-accent'}>{numAmount.toLocaleString()}원</strong>
              </div>
              <div className="mm-summary-item">
                <span>환불 후 잔액</span>
                <strong className={isOver ? 'is-error' : ''}>{isOver ? '한도 초과' : `${afterBalance.toLocaleString()}원`}</strong>
              </div>
            </div>

            <button
              type="button"
              className="mm-submit is-dark action-btn"
              onClick={handleRefund}
              disabled={loading}
            >
              {loading ? (
                <><Loader2 size={18} strokeWidth={2.4} className="mm-spin" />신청 처리 중...</>
              ) : (
                <>
                  <Undo2 size={19} strokeWidth={2.2} />
                  환불 신청하기
                  <span className="mm-submit-arrow"><ArrowRight size={14} strokeWidth={2.6} /></span>
                </>
              )}
            </button>

          </div>
        </div>
      </div>
    </GuideLayout>
  );
}
