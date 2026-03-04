import React from 'react';
import GuideLayout from '../../components/GuideLayout';
import PurchaseFormContainer from '../../components/PurchaseFormContainer';

import { ORDER_TYPE, OrderType } from '@/src/types/order';

export default function DeliveryRequestPage() {

  // 공통 타입을 상수로 선언
  const PAGE_TYPE: OrderType = ORDER_TYPE.DELIVERY;

  return (

    <GuideLayout title="배송신청" type={PAGE_TYPE} hideSidebar={true}>
      <PurchaseFormContainer type={PAGE_TYPE}/>
    </GuideLayout>
  );
}
