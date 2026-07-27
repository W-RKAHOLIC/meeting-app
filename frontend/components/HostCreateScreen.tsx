// frontend/components/HostCreateScreen.tsx
'use client'

import React, { useState } from 'react';
import { RoomConfig } from './types';

export default function HostCreateScreen({ onComplete }: { onComplete: (config: RoomConfig) => void }) {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [interval, setIntervalVal] = useState(30);
  const [expireDays, setExpireDays] = useState(7); // 💡 기본 마감 기한: 7일

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startDate || !endDate) return alert('모든 필드를 입력해주세요.');
    if (new Date(startDate) > new Date(endDate)) return alert('종료 날짜가 시작 날짜보다 빠를 수 없습니다.');
    
    // 💡 expireDays가 백엔드로 전달됩니다.
    onComplete({ title, startDate, endDate, startTime, endTime, interval, expireDays });
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
        <h2 className="text-2xl font-extrabold text-gray-900 mb-6 text-center">새로운 일정 조율</h2>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-gray-700">모임 이름</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 프론트엔드 팀 회의" className="p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-sm font-bold text-gray-700">시작 날짜</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none" />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-sm font-bold text-gray-700">종료 날짜</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none" />
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-sm font-bold text-gray-700">시작 시간</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none" />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-sm font-bold text-gray-700">종료 시간</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none" />
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-sm font-bold text-gray-700">시간 간격</label>
              <select value={interval} onChange={e => setIntervalVal(Number(e.target.value))} className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none">
                <option value={30}>30분 단위</option>
                <option value={60}>1시간 단위</option>
              </select>
            </div>
            
            {/* 💡 새로 추가된 유효기간 입력 필드 */}
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-sm font-bold text-gray-700">투표 마감 기한</label>
              <select value={expireDays} onChange={e => setExpireDays(Number(e.target.value))} className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none font-bold text-blue-600">
                <option value={1}>1일 뒤 마감</option>
                <option value={3}>3일 뒤 마감</option>
                <option value={7}>7일 뒤 마감</option>
                <option value={14}>14일 뒤 마감</option>
                <option value={30}>30일 뒤 마감</option>
              </select>
            </div>
          </div>

          <button type="submit" className="mt-4 w-full bg-black text-white font-bold py-4 rounded-xl shadow-md hover:bg-gray-800 transition-colors active:scale-[0.98]">
            방 만들기
          </button>
        </form>
      </div>
    </div>
  );
}