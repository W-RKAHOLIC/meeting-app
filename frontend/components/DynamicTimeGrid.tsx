'use client'

import React, { useState, useEffect } from 'react';
import { X, Trash2, Users } from 'lucide-react';
import { RoomConfig, User, VoteType, CellData, Comment } from './types';

const API_BASE_URL = 'https://meeting-app-dade.onrender.com/api/rooms';

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

export default function DynamicTimeGrid({ config, currentUser, isHost = false }: { config: RoomConfig, currentUser: User, isHost?: boolean }) {
  const [dates, setDates] = useState<string[]>([]);
  const [times, setTimes] = useState<string[]>([]);
  const [selectedVote, setSelectedVote] = useState<VoteType | null>(null);
  const [cells, setCells] = useState<Record<string, CellData>>({});
  const [activeCellKey, setActiveCellKey] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // 💡 모드 전환 상태 추가 (내 투표 vs 종합 결과)
  const [viewMode, setViewMode] = useState<'MY' | 'ALL'>('MY');

  useEffect(() => {
    setDates(generateDates(config.startDate, config.endDate));
    setTimes(generateTimes(config.startTime, config.endTime, config.interval));

    fetch(`${API_BASE_URL}/${config.roomCode}/schedule`)
      .then(res => res.json())
      .then(data => {
        if (data.cells) {
          // 구버전(state) 데이터 마이그레이션 방어 코드
          const validCells: Record<string, CellData> = {};
          Object.keys(data.cells).forEach(key => {
            const cell = data.cells[key];
            validCells[key] = {
              votes: cell.votes || (cell.state ? { '이전데이터': cell.state } : {}),
              comments: cell.comments || []
            };
          });
          setCells(validCells);
        }
      })
      .catch(err => console.error("데이터 로드 실패:", err));
  }, [config]);

  // 💡 동시성 문제를 해결한 안전한 병합 저장 로직
  const handleSaveToServer = async () => {
    setIsSaving(true);
    try {
      // 1. 저장 직전에 서버에서 다른 팀원들이 누적한 최신 데이터를 다시 불러옴
      const fetchRes = await fetch(`${API_BASE_URL}/${config.roomCode}/schedule`);
      const dbData = await fetchRes.json();
      const latestCells: Record<string, CellData> = dbData.cells || {};

      // 2. 최신 데이터에 '나의 투표'만 덮어쓰기 (다른 사람 데이터 보존)
      const mergedCells = { ...latestCells };

      // 내 투표 기록을 최신 데이터에서 전부 제거 후
      Object.keys(mergedCells).forEach(key => {
        if (mergedCells[key].votes) delete mergedCells[key].votes[currentUser.name];
      });

      // 내 화면에 있는 내 투표를 덮어씌움
      Object.keys(cells).forEach(key => {
        const myVote = cells[key]?.votes?.[currentUser.name];
        if (myVote) {
          if (!mergedCells[key]) mergedCells[key] = { votes: {}, comments: [] };
          if (!mergedCells[key].votes) mergedCells[key].votes = {};
          mergedCells[key].votes[currentUser.name] = myVote;
        }
        // 메모는 단순 복사 (고도화 시 중복 방지 로직 필요)
        if (cells[key]?.comments?.length > 0) {
          if (!mergedCells[key]) mergedCells[key] = { votes: {}, comments: [] };
          mergedCells[key].comments = cells[key].comments;
        }
      });

      // 3. 병합된 결과를 서버로 슛!
      const res = await fetch(`${API_BASE_URL}/${config.roomCode}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cells: mergedCells })
      });
      if (res.ok) {
        setCells(mergedCells);
        alert(`${currentUser.name}님의 투표가 서버에 저장되었습니다!`);
      }
    } catch (err) {
      alert('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseRoom = async () => {
    const confirmDelete = window.confirm('정말로 방을 마감(삭제)하시겠습니까?\n투표된 모든 데이터가 영구적으로 삭제됩니다.');
    if (!confirmDelete) return;
    const hostToken = localStorage.getItem(`hostToken_${config.roomCode}`);
    if (!hostToken) return alert('방장 권한이 없습니다.');
    try {
      const res = await fetch(`${API_BASE_URL}/${config.roomCode}`, {
        method: 'DELETE',
        headers: { 'X-Host-Token': hostToken }
      });
      if (res.ok) {
        alert('방이 마감되었습니다.');
        localStorage.removeItem(`hostToken_${config.roomCode}`);
        window.location.href = '/'; 
      }
    } catch (err) { alert('오류가 발생했습니다.'); }
  };

  const getCellKey = (date: string, time: string) => `${date}-${time}`;

  // 💡 투표 로직 (내 투표만 조작)
  const handleCellClick = (date: string, time: string) => {
    const key = getCellKey(date, time);
    const cell = cells[key] || { votes: {}, comments: [] };
    
    // 종합 결과 모드에서는 투표 조작 불가 (모달만 띄움)
    if (viewMode === 'ALL') {
      setActiveCellKey(key);
      return;
    }

    if (selectedVote) {
      const currentMyVote = cell.votes[currentUser.name];
      const newCells = { ...cells };
      
      if (currentMyVote === selectedVote) { // 취소
        const newVotes = { ...cell.votes };
        delete newVotes[currentUser.name];
        if (Object.keys(newVotes).length === 0 && cell.comments.length === 0) delete newCells[key];
        else newCells[key] = { ...cell, votes: newVotes };
      } else { // 칠하기
        newCells[key] = { ...cell, votes: { ...cell.votes, [currentUser.name]: selectedVote } };
      }
      setCells(newCells);
    } else { setActiveCellKey(key); }
  };

  const applyBulkUpdate = (keysToUpdate: string[]) => {
    if (!selectedVote || viewMode === 'ALL') return;

    setCells(prev => {
      const newCells = { ...prev };
      let allAlreadySelected = true;
      
      for (const key of keysToUpdate) {
        if (newCells[key]?.votes?.[currentUser.name] !== selectedVote) {
          allAlreadySelected = false; break;
        }
      }

      keysToUpdate.forEach(key => {
        const cell = newCells[key] || { votes: {}, comments: [] };
        if (allAlreadySelected) {
          const newVotes = { ...cell.votes };
          delete newVotes[currentUser.name];
          if (Object.keys(newVotes).length === 0 && cell.comments.length === 0) delete newCells[key];
          else newCells[key] = { ...cell, votes: newVotes };
        } else {
          newCells[key] = { ...cell, votes: { ...cell.votes, [currentUser.name]: selectedVote } };
        }
      });
      return newCells;
    });
  };

  const handleColumnClick = (date: string) => applyBulkUpdate(times.map(t => getCellKey(date, t)));
  const handleRowClick = (time: string) => applyBulkUpdate(dates.map(d => getCellKey(d, time)));
  const handleAllClick = () => applyBulkUpdate(dates.flatMap(d => times.map(t => getCellKey(d, t))));

  // 💡 히트맵 컬러 계산 로직
  const getHeatmapStyle = (votes: Record<string, VoteType> = {}) => {
    const voters = Object.values(votes);
    if (voters.length === 0) return { backgroundColor: 'white' };

    let score = 0;
    voters.forEach(v => {
      if (v === 'BEST') score += 1;
      else if (v === 'POSSIBLE') score += 0.5;
    });

    const maxScore = voters.length; 
    if (maxScore === 0) return { backgroundColor: '#f3f4f6' }; 
    
    const ratio = score / maxScore;
    if (ratio === 0) return { backgroundColor: '#fee2e2' }; // 모두 불가일 때 옅은 빨강

    // 파란색 농도 조절 (0.2 ~ 1.0)
    const alpha = 0.2 + (ratio * 0.8);
    return { backgroundColor: `rgba(59, 130, 246, ${alpha})` }; 
  };

  const getVoteColor = (type: VoteType) => {
    switch (type) {
      case 'BEST': return 'bg-blue-500 border-blue-600 text-white';
      case 'POSSIBLE': return 'bg-green-500 border-green-600 text-white';
      case 'IMPOSSIBLE': return 'bg-red-500 border-red-600 text-white';
      default: return 'bg-white';
    }
  };

  const handleAddComment = () => { /* 이전과 동일 생략 없이 작성됨 */
    if (!commentInput.trim() || !activeCellKey) return;
    const newComment: Comment = { id: Date.now().toString(), text: commentInput.trim(), author: currentUser.name };
    setCells(prev => ({ ...prev, [activeCellKey]: { votes: prev[activeCellKey]?.votes || {}, comments: [...(prev[activeCellKey]?.comments || []), newComment] } }));
    setCommentInput('');
  };

  const handleDeleteComment = (commentId: string, author: string) => { /* 동일 */
    if (author !== currentUser.name) return alert('본인 코멘트만 삭제 가능합니다.');
    if (!activeCellKey) return;
    setCells(prev => ({ ...prev, [activeCellKey]: { ...prev[activeCellKey], comments: prev[activeCellKey].comments.filter(c => c.id !== commentId) } }));
  };

  // 상세 모달에 띄울 투표 통계 데이터 계산
  const activeCellData = activeCellKey ? cells[activeCellKey] : null;
  const bestUsers: string[] = [], possibleUsers: string[] = [], impossibleUsers: string[] = [];
  if (activeCellData?.votes) {
    Object.entries(activeCellData.votes).forEach(([user, vote]) => {
      if (vote === 'BEST') bestUsers.push(user);
      else if (vote === 'POSSIBLE') possibleUsers.push(user);
      else if (vote === 'IMPOSSIBLE') impossibleUsers.push(user);
    });
  }

  return (
    <div className="max-w-md mx-auto min-h-screen relative bg-white shadow-xl overflow-hidden pb-24 flex flex-col font-sans">
      
      <header className="bg-white px-5 py-4 shadow-sm z-10 flex flex-col border-b border-gray-100">
        <div className="flex justify-between items-start w-full">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900 truncate max-w-[180px]">{config.title}</h1>
              {isHost && <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">방장</span>}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-md border border-gray-200">코드: <strong className="text-gray-900">{config.roomCode}</strong></span>
              <span className="text-xs text-blue-600 font-bold">{currentUser.name}님</span>
            </div>
          </div>
          <div className="flex gap-2">
            {isHost && <button onClick={handleCloseRoom} className="bg-red-50 text-red-600 border border-red-200 px-3 py-2 rounded-lg text-sm font-bold">마감</button>}
            <button onClick={handleSaveToServer} disabled={isSaving} className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold">{isSaving ? '저장...' : '저장'}</button>
          </div>
        </div>
        
        {/* 💡 투표 모드 토글 스위치 */}
        <div className="flex bg-gray-100 p-1 rounded-xl mt-4 border border-gray-200">
          <button onClick={() => { setViewMode('MY'); setSelectedVote(null); }} className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'MY' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>
            내 투표
          </button>
          <button onClick={() => { setViewMode('ALL'); setSelectedVote(null); }} className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'ALL' ? 'bg-blue-500 shadow text-white' : 'text-gray-500 hover:text-gray-700'}`}>
            <Users className="w-4 h-4" /> 종합 결과
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-x-auto select-none bg-gray-50">
        <div className="flex p-4 min-w-max">
          <div className="flex flex-col mr-2">
            <div onClick={handleAllClick} className={`h-8 flex items-center justify-end text-xs font-bold text-gray-400 pr-2 rounded-md ${selectedVote && viewMode === 'MY' ? 'cursor-pointer hover:bg-gray-200 hover:text-blue-600' : ''}`}>
              {selectedVote && viewMode === 'MY' ? '전체선택' : ''}
            </div>
            {times.map((t) => (
              <div key={t} onClick={() => handleRowClick(t)} className={`h-12 mb-[2px] flex items-center justify-end text-xs font-medium text-gray-400 pr-2 rounded-md ${selectedVote && viewMode === 'MY' ? 'cursor-pointer hover:bg-gray-200 hover:text-gray-900' : ''}`}>
                {t}
              </div>
            ))}
          </div>
          {dates.map((d) => (
            <div key={d} className="flex flex-col flex-1 min-w-[70px]">
              <div onClick={() => handleColumnClick(d)} className={`h-8 flex items-center justify-center text-sm font-bold text-gray-700 rounded-md ${selectedVote && viewMode === 'MY' ? 'cursor-pointer hover:bg-gray-200 hover:text-blue-600' : ''}`}>
                {d}
              </div>
              {times.map((t) => {
                const key = getCellKey(d, t);
                const cell = cells[key];
                
                // 💡 모드에 따른 셀 렌더링 동적 처리
                let cellClasses = 'w-full h-12 mb-[2px] border-[0.5px] border-gray-200 transition-colors relative cursor-pointer rounded-md mx-[1px] flex items-center justify-center';
                let cellStyle: React.CSSProperties = {};
                let displayCount = 0;

                if (viewMode === 'MY') {
                  const myVote = cell?.votes?.[currentUser.name];
                  if (myVote) cellClasses += ` ${getVoteColor(myVote)}`;
                  else cellClasses += ' bg-white hover:bg-gray-100';
                } else {
                  // ALL 모드 (히트맵)
                  cellStyle = getHeatmapStyle(cell?.votes);
                  displayCount = Object.keys(cell?.votes || {}).length;
                }

                return (
                  <div key={key} onClick={() => handleCellClick(d, t)} className={cellClasses} style={cellStyle}>
                    {viewMode === 'ALL' && displayCount > 0 && <span className="text-[10px] font-bold text-white/90 drop-shadow-sm">{displayCount}명</span>}
                    {(cell?.comments && cell.comments.length > 0) && <div className="absolute top-0 right-1 text-sm z-10 drop-shadow-md">💬</div>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      
      {/* 하단 투표 버튼 (ALL 모드일 땐 숨김 처리하여 헷갈림 방지) */}
      <div className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent z-10 transition-transform duration-300 ${viewMode === 'ALL' ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
        <div className="bg-white p-2 rounded-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] flex gap-2 border border-gray-100">
          <button onClick={() => setSelectedVote(prev => prev === 'BEST' ? null : 'BEST')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${selectedVote === 'BEST' ? 'bg-blue-500 text-white shadow-md' : 'bg-blue-50 text-blue-600'}`}>최적</button>
          <button onClick={() => setSelectedVote(prev => prev === 'POSSIBLE' ? null : 'POSSIBLE')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${selectedVote === 'POSSIBLE' ? 'bg-green-500 text-white shadow-md' : 'bg-green-50 text-green-600'}`}>가능</button>
          <button onClick={() => setSelectedVote(prev => prev === 'IMPOSSIBLE' ? null : 'IMPOSSIBLE')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${selectedVote === 'IMPOSSIBLE' ? 'bg-red-500 text-white shadow-md' : 'bg-red-50 text-red-600'}`}>불가</button>
        </div>
      </div>
      
      {/* 💡 상세 정보 모달 */}
      <div className={`absolute inset-0 bg-black/50 z-20 transition-opacity duration-300 ${activeCellKey ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setActiveCellKey(null)} />
      <div className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl z-30 px-6 pt-3 pb-8 flex flex-col shadow-2xl transition-transform duration-300 ease-out h-[75vh] max-w-md mx-auto ${activeCellKey ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6" />
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-gray-900">{activeCellKey?.replace('-', ' ')} 상세 통계</h3>
          <button onClick={() => setActiveCellKey(null)} className="p-2 bg-gray-100 rounded-full text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-4">
          {/* 💡 투표한 사람 목록 UI 추가 */}
          <div className="flex gap-2">
             <div className="flex-1 bg-blue-50 p-3 rounded-xl border border-blue-100">
               <span className="text-xs font-bold text-blue-600 block mb-1">최적 ({bestUsers.length})</span>
               <span className="text-sm text-gray-700 leading-tight">{bestUsers.join(', ') || '-'}</span>
             </div>
             <div className="flex-1 bg-green-50 p-3 rounded-xl border border-green-100">
               <span className="text-xs font-bold text-green-600 block mb-1">가능 ({possibleUsers.length})</span>
               <span className="text-sm text-gray-700 leading-tight">{possibleUsers.join(', ') || '-'}</span>
             </div>
             <div className="flex-1 bg-red-50 p-3 rounded-xl border border-red-100">
               <span className="text-xs font-bold text-red-600 block mb-1">불가 ({impossibleUsers.length})</span>
               <span className="text-sm text-gray-700 leading-tight">{impossibleUsers.join(', ') || '-'}</span>
             </div>
          </div>

          <div className="h-px bg-gray-100 my-2" />

          {/* 메모 영역 */}
          <div className="flex flex-col gap-3">
            {!activeCellData?.comments || activeCellData.comments.length === 0 ? (
              <div className="py-8 flex items-center justify-center text-sm text-gray-400 bg-gray-50 rounded-2xl">아직 작성된 메모가 없습니다.</div>
            ) : (
              activeCellData.comments.map((comment) => (
                <div key={comment.id} className="bg-gray-50 p-4 rounded-2xl text-sm flex justify-between border border-gray-100">
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-blue-600 text-xs">{comment.author}</span>
                    <span className="text-gray-800 leading-relaxed">{comment.text}</span>
                  </div>
                  {comment.author === currentUser.name && (
                    <button onClick={() => handleDeleteComment(comment.id, comment.author)} className="text-gray-400 hover:text-red-500 ml-4"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="flex gap-2 pt-4 border-t border-gray-100 mt-2">
          <input type="text" value={commentInput} onChange={(e) => setCommentInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddComment()} placeholder="메모를 입력하세요" className="flex-1 bg-gray-100 border-none rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          <button onClick={handleAddComment} className="bg-black text-white px-5 py-3 rounded-xl font-bold text-sm">등록</button>
        </div>
      </div>
    </div>
  );
}