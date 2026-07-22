'use client';

import React, { useState, useEffect } from 'react';

type VoteType = 'BEST' | 'POSSIBLE' | 'IMPOSSIBLE';

interface Comment {
  id: string;
  text: string;
}

interface CellData {
  state: VoteType;
  comments: Comment[];
}

const DATES = ['7/20', '7/21', '7/22', '7/23'];
const TIMES = [
  '09:00', '10:00', '11:00', '12:00', '13:00', 
  '14:00', '15:00', '16:00', '17:00', '18:00'
];

export default function SchedulePage() {
  const [selectedVote, setSelectedVote] = useState<VoteType | null>(null);
  const [cells, setCells] = useState<Record<string, CellData>>({});
  const [activeCellKey, setActiveCellKey] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editInputValue, setEditInputValue] = useState('');
  
  // 💡 저장 중 상태 표시
  const [isSaving, setIsSaving] = useState(false);

  // 💡 1. 화면이 처음 켜질 때 백엔드에서 데이터 불러오기
  useEffect(() => {
    fetch('http://localhost:8000/api/schedule')
      .then(res => res.json())
      .then(data => {
        if (data.cells) setCells(data.cells);
      })
      .catch(err => console.error("데이터 불러오기 실패:", err));
  }, []);

  // 💡 2. 서버로 투표 데이터 전송하기 (저장 버튼 클릭 시)
  const handleSaveToServer = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('http://localhost:8000/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cells })
      });
      if (res.ok) {
        alert('서버에 일정이 완벽하게 저장되었습니다! 🚀');
      }
    } catch (err) {
      alert('저장 중 오류가 발생했습니다. 백엔드 서버가 켜져 있는지 확인해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  const getCellKey = (date: string, time: string) => `${date}-${time}`;

  const handleVoteToggle = (vote: VoteType) => {
    setSelectedVote(prev => prev === vote ? null : vote);
  };

  const handleCellClick = (date: string, time: string) => {
    const key = getCellKey(date, time);
    const cell = cells[key];

    if (selectedVote) {
      if (cell && cell.state === selectedVote) {
        const newCells = { ...cells };
        delete newCells[key];
        setCells(newCells);
      } else {
        setCells((prev) => ({
          ...prev,
          [key]: { state: selectedVote, comments: cell ? cell.comments : [] },
        }));
      }
    } else {
      if (cell) {
        setActiveCellKey(key);
        setEditingCommentId(null);
      }
    }
  };

  const handleAddComment = () => {
    if (!commentInput.trim() || !activeCellKey) return;
    const newComment: Comment = { id: Date.now().toString(), text: commentInput.trim() };
    setCells((prev) => ({
      ...prev,
      [activeCellKey]: {
        ...prev[activeCellKey],
        comments: [...prev[activeCellKey].comments, newComment],
      },
    }));
    setCommentInput('');
  };

  const handleDeleteComment = (commentId: string) => {
    if (!activeCellKey) return;
    setCells((prev) => ({
      ...prev,
      [activeCellKey]: {
        ...prev[activeCellKey],
        comments: prev[activeCellKey].comments.filter(c => c.id !== commentId),
      },
    }));
  };

  const startEditing = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditInputValue(comment.text);
  };

  const saveEditedComment = () => {
    if (!activeCellKey || !editingCommentId || !editInputValue.trim()) return;
    setCells((prev) => ({
      ...prev,
      [activeCellKey]: {
        ...prev[activeCellKey],
        comments: prev[activeCellKey].comments.map(c => 
          c.id === editingCommentId ? { ...c, text: editInputValue.trim() } : c
        ),
      },
    }));
    setEditingCommentId(null);
  };

  const getVoteColor = (type: VoteType) => {
    switch (type) {
      case 'BEST': return 'bg-blue-500';
      case 'POSSIBLE': return 'bg-green-500';
      case 'IMPOSSIBLE': return 'bg-red-500';
      default: return 'bg-white';
    }
  };

  const activeCellData = activeCellKey ? cells[activeCellKey] : null;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 relative overflow-hidden flex flex-col font-sans">
      
      {/* 💡 헤더에 '저장하기' 버튼 추가 */}
      <header className="bg-white px-6 py-5 shadow-sm rounded-b-2xl z-10 flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">[프로젝트 A] 전체 회의</h1>
          <p className="text-sm font-medium text-gray-500">참여자: 5명</p>
        </div>
        <button 
          onClick={handleSaveToServer}
          disabled={isSaving}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors active:scale-95 disabled:bg-blue-300"
        >
          {isSaving ? '저장 중...' : '저장하기'}
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 pb-36">
        <div className="bg-white p-4 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100">
          <div className="grid grid-cols-5 gap-1">
            <div className="h-10"></div>
            {DATES.map((date) => (
              <div key={date} className="flex items-center justify-center h-10 text-xs font-semibold text-gray-600">
                {date}
              </div>
            ))}

            {TIMES.map((time) => (
              <React.Fragment key={time}>
                <div className="flex items-center justify-center h-12 text-xs font-medium text-gray-400">
                  {time}
                </div>
                {DATES.map((date) => {
                  const key = getCellKey(date, time);
                  const cell = cells[key];
                  return (
                    <div
                      key={key}
                      onClick={() => handleCellClick(date, time)}
                      className={`h-12 rounded-lg cursor-pointer transition-colors border border-gray-50
                        ${cell ? getVoteColor(cell.state) : 'bg-gray-100 hover:bg-gray-200'}
                      `}
                    />
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </main>

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent z-20 pointer-events-none">
        <div className="pointer-events-auto">
          <p className="text-center text-xs text-gray-400 mb-2 font-medium">
            {selectedVote ? "선택된 버튼을 한 번 더 누르면 해제됩니다." : "투표할 상태를 선택해주세요."}
          </p>
          <div className="bg-white p-2 rounded-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)] flex gap-2 border border-gray-100">
            <button
              onClick={() => handleVoteToggle('BEST')}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-200
                ${selectedVote === 'BEST' ? 'bg-blue-500 text-white shadow-md shadow-blue-200' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}
              `}
            >
              최적
            </button>
            <button
              onClick={() => handleVoteToggle('POSSIBLE')}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-200
                ${selectedVote === 'POSSIBLE' ? 'bg-green-500 text-white shadow-md shadow-green-200' : 'bg-green-50 text-green-600 hover:bg-green-100'}
              `}
            >
              가능
            </button>
            <button
              onClick={() => handleVoteToggle('IMPOSSIBLE')}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-200
                ${selectedVote === 'IMPOSSIBLE' ? 'bg-red-500 text-white shadow-md shadow-red-200' : 'bg-red-50 text-red-600 hover:bg-red-100'}
              `}
            >
              불가
            </button>
          </div>
        </div>
      </div>

      <div 
        className={`absolute inset-0 bg-black/40 z-30 transition-opacity duration-300
          ${activeCellKey ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        onClick={() => setActiveCellKey(null)}
      />

      <div 
        className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-40 px-6 pt-2 pb-8 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-transform duration-300 ease-out h-[70vh]
          ${activeCellKey ? 'translate-y-0' : 'translate-y-full'}
        `}
      >
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-2 mb-4" />
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {activeCellKey && `${activeCellKey.split('-')[0]} ${activeCellKey.split('-')[1]}`} 일정
          </h2>
          <button 
            onClick={() => setActiveCellKey(null)}
            className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto mb-4 flex flex-col gap-3">
          {activeCellData?.comments.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
              아직 등록된 코멘트가 없습니다.
            </div>
          ) : (
            activeCellData?.comments.map((comment) => (
              <div key={comment.id} className="bg-gray-50 px-4 py-3 rounded-2xl text-sm flex justify-between items-center group">
                {editingCommentId === comment.id ? (
                  <div className="flex flex-1 gap-2">
                    <input
                      type="text"
                      value={editInputValue}
                      onChange={(e) => setEditInputValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEditedComment()}
                      className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <button onClick={saveEditedComment} className="text-blue-600 font-bold whitespace-nowrap px-2">저장</button>
                    <button onClick={() => setEditingCommentId(null)} className="text-gray-400 font-medium whitespace-nowrap px-2">취소</button>
                  </div>
                ) : (
                  <>
                    <div className="text-gray-700 flex-1">
                      <span className="font-bold text-gray-900 mr-2">참여자</span>
                      {comment.text}
                    </div>
                    <div className="flex gap-3 ml-2">
                      <button onClick={() => startEditing(comment)} className="text-gray-400 hover:text-blue-500 font-semibold transition-colors">수정</button>
                      <button onClick={() => handleDeleteComment(comment.id)} className="text-gray-400 hover:text-red-500 font-semibold transition-colors">삭제</button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
            placeholder="코멘트를 남겨보세요"
            className="flex-1 bg-gray-100 border-none rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
          />
          <button 
            onClick={handleAddComment}
            className="bg-gray-900 text-white px-5 py-3 rounded-xl font-semibold text-sm hover:bg-gray-800 transition-colors"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}