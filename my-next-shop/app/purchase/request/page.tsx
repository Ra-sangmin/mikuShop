"use client";
import React from 'react';
import GuideLayout from '../../components/GuideLayout';
import PurchaseFormContainer from '../../components/PurchaseFormContainer';

export default function PurchaseRequestPage() {
  return (
    <GuideLayout title="구매대행 신청" type="purchase">
      <PurchaseFormContainer />
    </GuideLayout>
  );
}
