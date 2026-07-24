'use client'

import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Edit2, Trash2 } from 'lucide-react';

// --- 타입 정의 (기존 로직 유지) ---
type VoteType = 'BEST' | 'POSSIBLE' | 'IMPOSSIBLE';
interface Comment { id: string; text: string; }
interface CellData { state: VoteType; comments: Comment[]; }

const DATES = ['7/20(목)', '7/21(금)', '7/22(토)', '7/23(일)'];
const TIMES = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

export default function TimeGrid() {
  // --- 상태 관리 (기존 로직 유지) ---
  const [selectedVote, setSelectedVote] = useState<VoteType | null>(null);
  const [cells, setCells] = useState<Record<string, CellData>>({});
  const [activeCellKey, setActiveCellKey] = useState<string | null>(null);
  
  // 코멘트 관련 상태
  const [commentInput, setCommentInput] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editInputValue, setEditInputValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // --- API 통신 로직 (기존 로직 완벽 이식) ---
  useEffect(() => {
    fetch('http://localhost:8000/api/schedule')
      .then(res => res.json())
      .then(data => {
        if (data.cells) setCells(data.cells);
      })
      .catch(err => console.error("데이터 불러오기 실패:", err));
  }, []);

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
      alert('저장 중 오류가 발생했습니다. 백엔드 서버를 확인해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- 셀 상호작용 및 코멘트 로직 (기존 로직 유지 + 새 UI 연동) ---
  const getCellKey = (date: string, time: string) => `${date}-${time}`;

  const handleCellClick = (date: string, time: string) => {
    const key = getCellKey(date, time);
    const cell = cells[key];

    if (selectedVote) {
      // 투표 모드일 때: 색칠하거나 지우기
      if (cell && cell.state === selectedVote) {
        const newCells = { ...cells };
        delete newCells[key];
        setCells(newCells);
      } else {
        setCells(prev => ({
          ...prev,
          [key]: { state: selectedVote, comments: cell ? cell.comments : [] },
        }));
      }
    } else {
      // 투표 툴을 선택하지 않았을 때: 코멘트 바텀 시트 열기
      setActiveCellKey(key);
      setEditingCommentId(null);
    }
  };

  const handleAddComment = () => {
    if (!commentInput.trim() || !activeCellKey) return;
    const newComment: Comment = { id: Date.now().toString(), text: commentInput.trim() };
    setCells(prev => ({
      ...prev,
      [activeCellKey]: {
        ...(prev[activeCellKey] || { state: 'POSSIBLE', comments: [] }),
        comments: [...(prev[activeCellKey]?.comments || []), newComment],
      },
    }));
    setCommentInput('');
  };

  const handleDeleteComment = (commentId: string) => {
    if (!activeCellKey) return;
    setCells(prev => ({
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
    setCells(prev => ({
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

  // 색상 맵핑 (기존 색상 테마 유지)
  const getVoteColor = (type: VoteType) => {
    switch (type) {
      case 'BEST': return 'bg-blue-500 border-blue-600 text-white';
      case 'POSSIBLE': return 'bg-green-500 border-green-600 text-white';
      case 'IMPOSSIBLE': return 'bg-red-500 border-red-600 text-white';
      default: return 'bg-gray-50';
    }
  };

  const activeCellData = activeCellKey ? cells[activeCellKey] : null;

  return (
    // 📱 모바일 앱 레이아웃 (새 UI)
    <div className="max-w-md mx-auto min-h-screen relative bg-white shadow-xl overflow-hidden pb-24 font-sans flex flex-col">
      
      {/* 헤더 및 저장 버튼 (융합) */}
      <header className="bg-white px-5 py-4 shadow-sm z-10 flex justify-between items-center border-b border-gray-100">
        <div className="flex flex-col">
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">[프로젝트 A] 회의</h1>
          <p className="text-xs text-gray-500">참여자: 5명</p>
        </div>
        <button 
          onClick={handleSaveToServer}
          disabled={isSaving}
          className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md active:scale-95 disabled:bg-gray-300 transition-transform"
        >
          {isSaving ? '저장 중...' : '저장하기'}
        </button>
      </header>

      {/* 팻 핑거(Fat Finger) 방지 스와이프 그리드 (새 UI) */}
      <div className="flex-1 overflow-x-auto select-none bg-gray-50">
        <div className="flex p-4 min-w-max">
          {/* 시간 라벨 축 */}
          <div className="flex flex-col mr-2 pt-8">
            {TIMES.map((t) => (
              <div key={t} className="h-12 flex items-center justify-end text-xs font-medium text-gray-400 pr-2">
                {t}
              </div>
            ))}
          </div>

          {/* 날짜별 셀 렌더링 */}
          {DATES.map((d) => (
            <div key={d} className="flex flex-col flex-1 min-w-[70px]">
              <div className="h-8 text-center text-sm font-bold text-gray-700">{d}</div>
              {TIMES.map((t) => {
                const key = getCellKey(d, t);
                const cell = cells[key];
                return (
                  <div 
                    key={key}
                    onClick={() => handleCellClick(d, t)}
                    className={`w-full h-12 mb-[2px] border-[0.5px] border-gray-200 transition-colors relative cursor-pointer rounded-md mx-[1px]
                      ${cell ? getVoteColor(cell.state) : 'bg-white hover:bg-gray-100'}
                    `}
                  >
                    {/* 코멘트 아이콘 표시 로직 (융합) */}
                    {cell?.comments && cell.comments.length > 0 && (
                      <MessageCircle className={`absolute top-1 right-1 w-3 h-3 ${cell ? 'text-white' : 'text-blue-500'} drop-shadow-sm`} />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 하단 고정 가중치 툴킷 (기존 기능 + 새 디자인) */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent z-10">
        <p className="text-center text-xs text-gray-500 mb-2 font-medium">
          {selectedVote ? "선택된 버튼을 한 번 더 누르면 펜이 해제됩니다." : "색칠할 투표 버튼을 누르거나 빈칸을 눌러 코멘트를 다세요."}
        </p>
        <div className="bg-white p-2 rounded-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] flex gap-2 border border-gray-100">
          <button
            onClick={() => setSelectedVote(prev => prev === 'BEST' ? null : 'BEST')}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all
              ${selectedVote === 'BEST' ? 'bg-blue-500 text-white shadow-md' : 'bg-blue-50 text-blue-600'}
            `}
          >
            최적
          </button>
          <button
            onClick={() => setSelectedVote(prev => prev === 'POSSIBLE' ? null : 'POSSIBLE')}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all
              ${selectedVote === 'POSSIBLE' ? 'bg-green-500 text-white shadow-md' : 'bg-green-50 text-green-600'}
            `}
          >
            가능
          </button>
          <button
            onClick={() => setSelectedVote(prev => prev === 'IMPOSSIBLE' ? null : 'IMPOSSIBLE')}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all
              ${selectedVote === 'IMPOSSIBLE' ? 'bg-red-500 text-white shadow-md' : 'bg-red-50 text-red-600'}
            `}
          >
            불가
          </button>
        </div>
      </div>

      {/* 모달 배경 (어두운 오버레이) */}
      <div 
        className={`absolute inset-0 bg-black/50 z-20 transition-opacity duration-300 ${activeCellKey ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setActiveCellKey(null)}
      />

      {/* 바텀 시트 코멘트 창 (기존 로직 + 새 애니메이션 UI) */}
      <div className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl z-30 px-6 pt-3 pb-8 flex flex-col shadow-2xl transition-transform duration-300 ease-out h-[65vh] max-w-md mx-auto ${activeCellKey ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6" />
        
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-xl text-gray-900">
            {activeCellKey?.replace('-', ' ')} 코멘트
          </h3>
          <button onClick={() => setActiveCellKey(null)} className="p-2 bg-gray-100 rounded-full text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 코멘트 목록 영역 */}
        <div className="flex-1 overflow-y-auto mb-4 flex flex-col gap-3 pr-2">
          {!activeCellData?.comments || activeCellData.comments.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400 bg-gray-50 rounded-2xl">
              아직 작성된 메모가 없습니다.
            </div>
          ) : (
            activeCellData.comments.map((comment) => (
              <div key={comment.id} className="bg-gray-50 p-4 rounded-2xl text-sm flex flex-col gap-2 group border border-gray-100">
                {editingCommentId === comment.id ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editInputValue}
                      onChange={(e) => setEditInputValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEditedComment()}
                      className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-black"
                      autoFocus
                    />
                    <button onClick={saveEditedComment} className="text-black font-bold px-2">저장</button>
                  </div>
                ) : (
                  <div className="flex justify-between items-start">
                    <span className="text-gray-800 leading-relaxed">{comment.text}</span>
                    <div className="flex gap-3 ml-4">
                      <button onClick={() => startEditing(comment)} className="text-gray-400 hover:text-blue-500"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteComment(comment.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* 코멘트 입력 영역 */}
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <input
            type="text"
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
            placeholder="메모를 입력하고 엔터를 치세요"
            className="flex-1 bg-gray-100 border-none rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
          <button 
            onClick={handleAddComment}
            className="bg-black text-white px-5 py-3 rounded-xl font-bold text-sm"
          >
            등록
          </button>
        </div>
      </div>
    </div>
  );
}