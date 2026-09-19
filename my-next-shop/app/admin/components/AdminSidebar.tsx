"use client";
import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ADMIN_MENU } from '@/app/admin/adminMenu';
import {
  SquaresFour, Users, ClipboardText, Truck, ChartLineUp, ArrowUUpLeft,
  Headset, Crown, AirplaneTilt, Calculator, Code, Package, CaretRight,
} from '@phosphor-icons/react';
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
  '회원 등급 및 수수료 관리': Crown,
  '국제 배송 업체 정보 관리': AirplaneTilt,
  '견적 계산기': Calculator,
  '개발자 전용': Code,
};

export default function AdminSidebar({
  isOpen = false,
  onClose = () => {},
}: {
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();

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
