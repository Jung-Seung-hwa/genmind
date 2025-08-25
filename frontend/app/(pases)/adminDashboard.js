'use client';

import React from 'react';
import Header from '../(tabs)/Header';
import UploadBox from '../(tabs)/UploadBox';
import CalendarBox from '../(tabs)/CalendarBox';
import JoinRequestTable from '../(tabs)/JoinRequestTable';
import DocumentList from '../(tabs)/DocumentList';

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* 상단 헤더 */}
      <Header />

      {/* 관리자 대시보드 2x2 그리드 카드 */}
      <main className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
        <UploadBox />
        <CalendarBox />
        <JoinRequestTable />
        <DocumentList />
      </main>
    </div>
  );
}
