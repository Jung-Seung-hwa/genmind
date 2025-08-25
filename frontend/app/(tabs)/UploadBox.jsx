import React, { useRef } from 'react';
import '../../styles/UploadBox.css'; // ✅ 상대경로로 css import

export default function UploadBox() {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) console.log('파일 선택됨:', file);
  };

  return (
    <div className="box">
      <h2 className="title">📄 문서 업로드</h2>
      <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
        <p className="upload-text">파일을 클릭해서 업로드하세요</p>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
      </div>
    </div>
  );
}
