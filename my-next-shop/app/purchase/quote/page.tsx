"use client";
import React from 'react';
import GuideLayout from '@/app/components/GuideLayout';
import PurchaseFormContainer from '@/app/components/PurchaseFormContainer';

import { ORDER_TYPE, OrderType } from '@/src/types/order';

export default function QuotePage() {
  // 공통 타입을 상수로 선언
    const PAGE_TYPE: OrderType = ORDER_TYPE.PURCHASE;
  
    return (
      <GuideLayout title="견적문의" type={PAGE_TYPE} hideSidebar={true}>
        <PurchaseFormContainer type={PAGE_TYPE}/>
      </GuideLayout>
    );
}