'use client'

import React, { useState } from 'react';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { RoomConfig } from './types'; // 💡 수정됨

export default function HostCreateScreen({ onComplete }: { onComplete: (config: RoomConfig) => void }) {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [interval, setInterval] = useState(30);

  const handleSubmit = () => {
    if (!title || !startDate || !endDate) return alert('모든 항목을 입력해주세요!');
    if (new Date(startDate) > new Date(endDate)) return alert('종료일이 시작일보다 빠를 수 없습니다.');
    onComplete({ title, startDate, endDate, startTime, endTime, interval });
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col p-6">
      <div className="mt-10 mb-8">
        <h1 className="text-2xl font-bold text-gray-900">새로운 모임 만들기</h1>
        <p className="text-gray-500 mt-2">팀원들과 일정을 조율할 방을 생성합니다.</p>
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-5">
        <div>
          <label className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-2"><Calendar className="w-4 h-4"/> 모임 이름</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="예: [프로젝트 A] 킥오프 미팅" className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 outline-none focus:border-black transition-all" />
        </div>
        <div>
          <label className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-2"><Calendar className="w-4 h-4"/> 날짜 범위</label>
          <div className="flex gap-2 items-center">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="flex-1 bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm" />
            <span className="text-gray-400">~</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="flex-1 bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm" />
          </div>
        </div>
        <div>
          <label className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-2"><Clock className="w-4 h-4"/> 시간 범위 및 단위</label>
          <div className="flex gap-2 items-center mb-2">
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="flex-1 bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm" />
            <span className="text-gray-400">~</span>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="flex-1 bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm" />
          </div>
          <select value={interval} onChange={e => setInterval(Number(e.target.value))} className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm outline-none">
            <option value={30}>30분 단위</option>
            <option value={60}>1시간 단위</option>
          </select>
        </div>
        <button onClick={handleSubmit} className="mt-4 w-full bg-black text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors">
          방 생성하기 <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}