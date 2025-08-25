import React from 'react';
import '../../styles/Header.css'; // ✅ 경로 수정

export default function Header() {
  return (
    <header className="admin-header">
      <div className="header-left">
        <h1 className="logo">GenMind Admin</h1>
      </div>
      <div className="header-right">
        <span className="admin-label">관리자 모드</span>
      </div>
    </header>
  );
}
