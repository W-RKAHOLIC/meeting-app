'use client'

import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { RoomConfig, User, VoteType, CellData, Comment } from '../types';

function generateDates(start: string, end: string) {
  const dates = [];
  let curr = new Date(start);
  const endDate = new Date(end);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  while (curr <= endDate) {
    dates.push(`${curr.getMonth() + 1}/${curr.getDate()}(${days[curr.getDay()]})`);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

function generateTimes(start: string, end: string, interval: number) {
  const times = [];
  let [h, m] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  while (h < endH || (h === endH && m <= endM)) {
    times.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    m += interval;
    if (m >= 60) { h += 1; m -= 60; }
  }
  return times;
}

export default function DynamicTimeGrid({ config, currentUser }: { config: RoomConfig, currentUser: User }) {
  const [dates, setDates] = useState<string[]>([]);
  const [times, setTimes] = useState<string[]>([]);
  const [selectedVote, setSelectedVote] = useState<VoteType | null>(null);
  const [cells, setCells] = useState<Record<string, CellData>>({});
  const [activeCellKey, setActiveCellKey] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDates(generateDates(config.startDate, config.endDate));
    setTimes(generateTimes(config.startTime, config.endTime, config.interval));
  }, [config]);

  const handleSaveToServer = () => {
    setIsSaving(true);
    setTimeout(() => {
      alert(`[서버 저장 시뮬레이션]\n${currentUser.name}님의 투표가 저장되었습니다!`);
      setIsSaving(false);
    }, 800);
  };

  const getCellKey = (date: string, time: string) => `${date}-${time}`;

  const handleCellClick = (date: string, time: string) => {
    const key = getCellKey(date, time);
    const cell = cells[key];
    if (selectedVote) {
      if (cell && cell.state === selectedVote) {
        if (cell.comments.length > 0) setCells(prev => ({ ...prev, [key]: { ...cell, state: null } }));
        else { const newCells = { ...cells }; delete newCells[key]; setCells(newCells); }
      } else {
        setCells(prev => ({ ...prev, [key]: { state: selectedVote, comments: cell ? cell.comments : [] } }));
      }
    } else { setActiveCellKey(key); }
  };

  const handleAddComment = () => {
    if (!commentInput.trim() || !activeCellKey) return;
    const newComment: Comment = { id: Date.now().toString(), text: commentInput.trim(), author: currentUser.name };
    setCells(prev => ({ ...prev, [activeCellKey]: { state: prev[activeCellKey]?.state || null, comments: [...(prev[activeCellKey]?.comments || []), newComment] } }));
    setCommentInput('');
  };

  const handleDeleteComment = (commentId: string, author: string) => {
    if (author !== currentUser.name) return alert('본인이 작성한 코멘트만 삭제할 수 있습니다.');
    if (!activeCellKey) return;
    setCells(prev => ({ ...prev, [activeCellKey]: { ...prev[activeCellKey], comments: prev[activeCellKey].comments.filter(c => c.id !== commentId) } }));
  };

  const getVoteColor = (type: VoteType) => {
    switch (type) {
      case 'BEST': return 'bg-blue-500 border-blue-600 text-white';
      case 'POSSIBLE': return 'bg-green-500 border-green-600 text-white';
      case 'IMPOSSIBLE': return 'bg-red-500 border-red-600 text-white';
      default: return 'bg-white';
    }
  };

  const activeCellData = activeCellKey ? cells[activeCellKey] : null;

  return (
    <div className="max-w-md mx-auto min-h-screen relative bg-white shadow-xl overflow-hidden pb-24 flex flex-col font-sans">
      <header className="bg-white px-5 py-4 shadow-sm z-10 flex justify-between items-center border-b border-gray-100">
        <div className="flex flex-col">
          <h1 className="text-lg font-bold text-gray-900 truncate max-w-[200px]">{config.title}</h1>
          <p className="text-xs text-blue-600 font-bold mt-1">접속자: {currentUser.name}</p>
        </div>
        <button onClick={handleSaveToServer} disabled={isSaving} className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold active:scale-95 transition-transform">
          {isSaving ? '저장 중...' : '저장하기'}
        </button>
      </header>
      <div className="flex-1 overflow-x-auto select-none bg-gray-50">
        <div className="flex p-4 min-w-max">
          <div className="flex flex-col mr-2 pt-8">
            {times.map((t) => <div key={t} className="h-12 flex items-center justify-end text-xs font-medium text-gray-400 pr-2">{t}</div>)}
          </div>
          {dates.map((d) => (
            <div key={d} className="flex flex-col flex-1 min-w-[70px]">
              <div className="h-8 text-center text-sm font-bold text-gray-700">{d}</div>
              {times.map((t) => {
                const key = getCellKey(d, t);
                const cell = cells[key];
                return (
                  <div key={key} onClick={() => handleCellClick(d, t)} className={`w-full h-12 mb-[2px] border-[0.5px] border-gray-200 transition-colors relative cursor-pointer rounded-md mx-[1px] ${cell?.state ? getVoteColor(cell.state) : 'bg-white hover:bg-gray-100'}`}>
                    {(cell?.comments && cell.comments.length > 0) && <div className="absolute top-0 right-1 text-sm z-10 drop-shadow-md">💬</div>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent z-10">
        <div className="bg-white p-2 rounded-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] flex gap-2 border border-gray-100">
          <button onClick={() => setSelectedVote(prev => prev === 'BEST' ? null : 'BEST')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${selectedVote === 'BEST' ? 'bg-blue-500 text-white shadow-md' : 'bg-blue-50 text-blue-600'}`}>최적</button>
          <button onClick={() => setSelectedVote(prev => prev === 'POSSIBLE' ? null : 'POSSIBLE')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${selectedVote === 'POSSIBLE' ? 'bg-green-500 text-white shadow-md' : 'bg-green-50 text-green-600'}`}>가능</button>
          <button onClick={() => setSelectedVote(prev => prev === 'IMPOSSIBLE' ? null : 'IMPOSSIBLE')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${selectedVote === 'IMPOSSIBLE' ? 'bg-red-500 text-white shadow-md' : 'bg-red-50 text-red-600'}`}>불가</button>
        </div>
      </div>
      <div className={`absolute inset-0 bg-black/50 z-20 transition-opacity duration-300 ${activeCellKey ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setActiveCellKey(null)} />
      <div className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl z-30 px-6 pt-3 pb-8 flex flex-col shadow-2xl transition-transform duration-300 ease-out h-[65vh] max-w-md mx-auto ${activeCellKey ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6" />
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-xl text-gray-900">{activeCellKey?.replace('-', ' ')} 코멘트</h3>
          <button onClick={() => setActiveCellKey(null)} className="p-2 bg-gray-100 rounded-full text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto mb-4 flex flex-col gap-3 pr-2">
          {!activeCellData?.comments || activeCellData.comments.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400 bg-gray-50 rounded-2xl">아직 작성된 메모가 없습니다.</div>
          ) : (
            activeCellData.comments.map((comment) => (
              <div key={comment.id} className="bg-gray-50 p-4 rounded-2xl text-sm flex flex-col gap-2 group border border-gray-100">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-blue-600 text-xs">{comment.author}</span>
                    <span className="text-gray-800 leading-relaxed">{comment.text}</span>
                  </div>
                  {comment.author === currentUser.name && (
                    <button onClick={() => handleDeleteComment(comment.id, comment.author)} className="text-gray-400 hover:text-red-500 ml-4"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <input type="text" value={commentInput} onChange={(e) => setCommentInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddComment()} placeholder="메모를 입력하세요" className="flex-1 bg-gray-100 border-none rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          <button onClick={handleAddComment} className="bg-black text-white px-5 py-3 rounded-xl font-bold text-sm">등록</button>
        </div>
      </div>
    </div>
  );
}