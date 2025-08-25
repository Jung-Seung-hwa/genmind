import React from 'react';
import '../../styles/DocumentList.css';

export default function DocumentList() {
  const uploadedDocs = [
    { name: '사내규정.pdf', date: '2025-01-21', size: '12.5MB', status: '승인', id: 1 },
    { name: '신입사원 교육자료.pdf', date: '2025-02-21', size: '500.2MB', status: '승인', id: 2 },
    { name: '사용자 가이드.pdf', date: '2025-02-21', size: '970.6KB', status: '반려', id: 3 },
  ];

  const handleDownload = (name) => {
    console.log(`다운로드: ${name}`);
  };

  const handleDelete = (id) => {
    console.log(`삭제: 문서 ID ${id}`);
  };

  return (
    <div className="doc-box">
      <h2 className="doc-title">📁 업로드된 문서 목록</h2>
      <table className="doc-table">
        <thead>
          <tr>
            <th>파일명</th>
            <th>업로드 일시</th>
            <th>파일 크기</th>
            <th>상태</th>
            <th>작업</th>
          </tr>
        </thead>
        <tbody>
          {uploadedDocs.map((doc) => (
            <tr key={doc.id}>
              <td>{doc.name}</td>
              <td>{doc.date}</td>
              <td>{doc.size}</td>
              <td>
                <span className={`status ${doc.status}`}>{doc.status}</span>
              </td>
              <td>
                <button className="download" onClick={() => handleDownload(doc.name)}>다운로드</button>
                <button className="delete" onClick={() => handleDelete(doc.id)}>삭제</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
