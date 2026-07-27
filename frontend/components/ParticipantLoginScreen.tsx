'use client'

import React, { useState } from 'react';
import { User } from './types';
import { ChevronLeft } from 'lucide-react'; // 💡 아이콘 추가

// 💡 onBack 속성 추가
export default function ParticipantLoginScreen({ roomTitle, onLogin, onBack }: { roomTitle: string, onLogin: (user: User) => void, onBack: () => void }) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('이름을 입력해주세요.');
    onLogin({ name: name.trim() });
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 relative">
      
      {/* 💡 뒤로가기 버튼 */}
      <button onClick={onBack} className="absolute top-6 left-6 p-2 bg-white rounded-full shadow-sm text-gray-600 hover:text-black border border-gray-200 flex items-center justify-center transition-all z-10 active:scale-95">
         <ChevronLeft className="w-6 h-6" />
      </button>

      <div className="w-full bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
        <h2 className="text-2xl font-extrabold text-gray-900 mb-2 text-center">방 입장하기</h2>
        <p className="text-sm text-gray-500 text-center mb-8 break-keep">{roomTitle}</p>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-gray-700">사용할 이름</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="예: 홍길동" className="p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
          </div>
          <button type="submit" className="mt-2 w-full bg-black text-white font-bold py-4 rounded-xl shadow-md hover:bg-gray-800 transition-colors active:scale-[0.98]">
            입장하기
          </button>
        </form>
      </div>
    </div>
  );
}