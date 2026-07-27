'use client'

import React, { useState } from 'react';
import { User } from './types';
import { ChevronLeft } from 'lucide-react';

// 💡 roomCode 속성 추가됨
export default function ParticipantLoginScreen({ roomTitle, roomCode, onLogin, onBack }: { roomTitle: string, roomCode: string, onLogin: (user: User) => void, onBack: () => void }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false); // 로딩 상태

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('이름을 입력해주세요.');
    if (!password.trim()) return alert('나중에 투표를 수정하기 위한 임시 비밀번호를 입력해주세요.');
    
    setIsLoading(true);
    try {
      // 💡 백엔드에 로그인(비밀번호 검증) 요청
      const res = await fetch(`https://meeting-app-dade.onrender.com/api/rooms/${roomCode}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), password: password.trim() })
      });

      if (res.ok) {
        onLogin({ name: name.trim(), password: password.trim() });
      } else {
        const errorData = await res.json();
        alert(errorData.detail || '로그인에 실패했습니다.'); // 예: "비밀번호가 일치하지 않습니다."
      }
    } catch (err) {
      alert('서버와 통신할 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 relative">
      <button onClick={onBack} className="absolute top-6 left-6 p-2 bg-white rounded-full shadow-sm text-gray-600 hover:text-black border border-gray-200 flex items-center justify-center transition-all z-10 active:scale-95">
         <ChevronLeft className="w-6 h-6" />
      </button>

      <div className="w-full bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
        <h2 className="text-2xl font-extrabold text-gray-900 mb-2 text-center">방 입장하기</h2>
        <p className="text-sm text-gray-500 text-center mb-8 break-keep">{roomTitle}</p>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-gray-700">사용할 이름</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="예: 홍길동" className="p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-gray-700">임시 비밀번호 (수정용)</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="숫자나 영문 4자리 이상" className="p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
          </div>
          <button type="submit" disabled={isLoading} className="mt-2 w-full bg-black text-white font-bold py-4 rounded-xl shadow-md hover:bg-gray-800 transition-colors active:scale-[0.98]">
            {isLoading ? '확인 중...' : '입장하기'}
          </button>
        </form>
      </div>
    </div>
  );
}