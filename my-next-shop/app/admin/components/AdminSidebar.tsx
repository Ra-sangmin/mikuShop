"use client";
import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ADMIN_MENU } from '@/app/admin/adminMenu';
import {
  SquaresFour, Users, ClipboardText, Truck, ChartLineUp, ArrowUUpLeft,
  Headset, ChatCircleDots, Crown, AirplaneTilt, Calculator, Code, Package, CaretRight,
} from '@phosphor-icons/react';
import { ADMIN_ORDERS_CHANGED_EVENT } from '@/app/admin/adminEvents';
import '@/app/admin/admin-shell.css';

// 🌟 메뉴 이름 → 아이콘. adminMenu.ts 는 순수 데이터 파일이라 아이콘은 여기서 붙입니다.
const MENU_ICON: Record<string, React.ElementType> = {
  '대시보드': SquaresFour,
  '사용자 관리': Users,
  '주문 관리': ClipboardText,
  '배송 현황': Truck,
  '정산 관리': ChartLineUp,
  '미쿠짱 머니': ArrowUUpLeft,
  '고객 센터': Headset,
  '카카오톡 알림톡 관리': ChatCircleDots,
  '회원 등급 및 수수료 관리': Crown,
  '국제 배송 업체 정보 관리': AirplaneTilt,
  '견적 계산기': Calculator,
  '개발자 전용': Code,
};

// 🔔 '주문 관리' 옆에 관리자가 처리해야 하는 주문 건수(주문 관리의 '관리자 처리 필요' 숫자와 같음)를 보여 줍니다.
const BADGE_MENU = '주문 관리';
const BADGE_REFRESH_MS = 60_000;

export default function AdminSidebar({
  isOpen = false,
  onClose = () => {},
}: {
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [adminTodoCount, setAdminTodoCount] = useState(0);
  const loadAdminTodoCount = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/orders/today-count', { cache: 'no-store' });
      const data = await res.json();
      if (data?.success) setAdminTodoCount(Number(data.count) || 0);
    } catch { /* 숫자는 보조 정보라 실패해도 조용히 넘어갑니다 */ }
  }, []);
  useEffect(() => {
    loadAdminTodoCount();
    // 1분마다 · 다른 화면에서 주문을 처리하고 돌아왔을 때도 다시 셉니다.
    const timer = setInterval(loadAdminTodoCount, BADGE_REFRESH_MS);
    const onFocus = () => loadAdminTodoCount();
    window.addEventListener('focus', onFocus);
    // 🔔 주문 상태를 바꾼 직후(주문 관리 화면)에는 기다리지 않고 바로 다시 셉니다.
    window.addEventListener(ADMIN_ORDERS_CHANGED_EVENT, onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener(ADMIN_ORDERS_CHANGED_EVENT, onFocus);
    };
  }, [loadAdminTodoCount, pathname]);

  return (
    <>
      {/* 🌟 모바일에서 사이드바가 열려있을 때만 보이는 반투명 배경 (클릭하면 닫힘) */}
      <div
        className={`ash-backdrop ${isOpen ? 'is-open' : ''}`}
        onClick={onClose}
      />

      <aside className={`ash-side ${isOpen ? 'is-open' : ''}`}>
        {/* 브랜드 */}
        <div className="ash-brand">
          <span className="ash-brand-mark" aria-hidden="true"><Package size={20} weight="duotone" /></span>
          <span className="ash-brand-text">
            <span className="ash-brand-eyebrow">ADMIN CONSOLE</span>
            <span className="ash-brand-name">미쿠짱 관리자</span>
          </span>
        </div>

        {/* 메뉴 */}
        <nav className="ash-nav" aria-label="관리자 메뉴">
          <ul className="ash-list">
            {ADMIN_MENU.map(item => {
              const isActive = pathname === item.path;
              const Icon = MENU_ICON[item.name] || SquaresFour;
              return (
                <React.Fragment key={item.path}>
                  {item.group && <li className="ash-group-label" aria-hidden="true">{item.group}</li>}
                  <li>
                    <button
                      type="button"
                      className={`ash-item ${isActive ? 'is-active' : ''}`}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => { router.push(item.path); onClose(); }}
                    >
                      <span className="ash-item-icon" aria-hidden="true"><Icon size={15} weight="duotone" /></span>
                      <span className="ash-item-label">{item.name}</span>
                      {item.name === BADGE_MENU && adminTodoCount > 0 && (
                        <span className="ash-item-badge" title={`관리자 처리가 필요한 주문 ${adminTodoCount}건`}>
                          {adminTodoCount > 99 ? '99+' : adminTodoCount}
                        </span>
                      )}
                      <CaretRight className="ash-item-caret" size={11} weight="bold" />
                    </button>
                  </li>
                </React.Fragment>
              );
            })}
          </ul>
        </nav>

        {/* 하단 상태 */}
        <div className="ash-foot">
          <span className="ash-foot-dot" aria-hidden="true" />
          <span className="ash-foot-text">
            <span className="ash-foot-title">시스템 정상</span>
            <span className="ash-foot-sub">미쿠짱 관리자 콘솔</span>
          </span>
        </div>
      </aside>
    </>
  );
}
