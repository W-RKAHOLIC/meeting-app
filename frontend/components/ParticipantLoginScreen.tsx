'use client'

import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { User } from '../types';

export default function ParticipantLoginScreen({ roomTitle, onLogin }: { roomTitle: string, onLogin: (user: User) => void }) {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');

  const handleLogin = () => {
    if (!name.trim() || !pin.trim()) return alert('이름과 임시 비밀번호를 모두 입력해주세요.');
    onLogin({ name: name.trim(), pin: pin.trim() });
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col justify-center p-6">
      <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 flex flex-col items-center">
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
          <Users className="w-8 h-8 text-blue-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 text-center mb-2">{roomTitle}</h2>
        <p className="text-sm text-gray-500 mb-8 text-center">참여를 위해 이름과 수정용 비밀번호를 입력해주세요.</p>
        <div className="w-full flex flex-col gap-4">
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="참여자 이름 (예: 홍길동)" className="w-full bg-gray-50 p-4 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-black" />
          <input type="password" value={pin} onChange={e => setPin(e.target.value)} maxLength={4} placeholder="숫자 비밀번호 4자리" className="w-full bg-gray-50 p-4 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-black text-center tracking-widest" />
          <button onClick={handleLogin} className="mt-2 w-full bg-black text-white p-4 rounded-xl font-bold hover:bg-gray-800">
            투표 참여하기
          </button>
        </div>
      </div>
    </div>
  );
}