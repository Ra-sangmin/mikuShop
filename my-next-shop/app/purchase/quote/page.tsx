"use client";
import React from 'react';
import GuideLayout from '../../components/GuideLayout';
import PurchaseFormContainer from '../../components/PurchaseFormContainer';

export default function QuotePage() {
  return (
    <GuideLayout title="견적문의" type="purchase" hideSidebar={true}>
      <PurchaseFormContainer />
    </GuideLayout>
  );
}
