import React from 'react';
import '../../styles/JoinRequestTable.css';

export default function JoinRequestTable() {
  const joinRequests = [
    { name: '정주하', email: 'jeongjunha@naver.com', date: '2025-01-21', status: '완료' },
    { name: '오리', email: 'ohmiskorea@gmail.com', date: '2025-02-21', status: '대기' },
    { name: '김구라', email: 'gura@nate.com', date: '2025-02-21', status: '반려' },
  ];

  const handleApprove = (email) => {
    console.log(`승인: ${email}`);
  };

  const handleReject = (email) => {
    console.log(`반려: ${email}`);
  };

  return (
    <div className="table-box">
      <h2 className="table-title">👥 가입 승인 요청</h2>
      <table className="table">
        <thead>
          <tr>
            <th>이름</th>
            <th>이메일</th>
            <th>신청일</th>
            <th>상태</th>
            <th>작업</th>
          </tr>
        </thead>
        <tbody>
          {joinRequests.map((user, index) => (
            <tr key={index}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.date}</td>
              <td>
                <span className={`status ${user.status}`}>
                  {user.status}
                </span>
              </td>
              <td>
                <button className="approve" onClick={() => handleApprove(user.email)}>승인</button>
                <button className="reject" onClick={() => handleReject(user.email)}>반려</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
