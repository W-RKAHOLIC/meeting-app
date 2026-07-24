'use client'

import React, { useState } from 'react';
import { CalendarPlus, LogIn } from 'lucide-react';

export default function HomeScreen({ onCreate, onJoin }: { onCreate: () => void, onJoin: (code: string) => void }) {
  const [joinCode, setJoinCode] = useState('');

  const handleJoin = () => {
    if (joinCode.length < 4) return alert('정확한 방 코드를 입력해주세요.');
    onJoin(joinCode.toUpperCase());
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col justify-center p-6">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-black text-gray-900 mb-2">모두의 시간</h1>
        <p className="text-gray-500 font-medium">가장 쉬운 일정 조율 서비스</p>
      </div>

      <div className="flex flex-col gap-6">
        {/* 주최자: 방 만들기 버튼 */}
        <button 
          onClick={onCreate}
          className="bg-black text-white p-6 rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-gray-800 transition-transform active:scale-95 shadow-lg"
        >
          <CalendarPlus className="w-10 h-10" />
          <div>
            <div className="font-bold text-lg">새로운 모임 방 만들기</div>
            <div className="text-gray-300 text-sm mt-1">주최자가 되어 일정을 조율합니다</div>
          </div>
        </button>

        <div className="flex items-center gap-4 my-2">
          <div className="flex-1 h-px bg-gray-200"></div>
          <span className="text-gray-400 text-sm font-bold">또는</span>
          <div className="flex-1 h-px bg-gray-200"></div>
        </div>

        {/* 참여자: 코드로 입장하기 */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
          <div className="font-bold text-gray-900 text-center">초대받은 방이 있으신가요?</div>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={joinCode} 
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="참여 코드 입력 (예: AB12C)" 
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black uppercase text-center font-bold tracking-wider"
            />
            <button 
              onClick={handleJoin}
              className="bg-blue-600 text-white px-5 rounded-xl font-bold hover:bg-blue-700"
            >
              입장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}