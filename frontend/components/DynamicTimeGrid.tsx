'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Trash2, Users, Share2, ChevronLeft } from 'lucide-react'; 
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

export default function DynamicTimeGrid({ config, currentUser, isHost = false, onBack }: { config: RoomConfig, currentUser: User, isHost?: boolean, onBack?: () => void }) {
  const [dates, setDates] = useState<string[]>([]);
  const [times, setTimes] = useState<string[]>([]);
  const [selectedVote, setSelectedVote] = useState<VoteType | null>(null);
  const [cells, setCells] = useState<Record<string, CellData>>({});
  const [activeCellKey, setActiveCellKey] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'MY' | 'ALL'>('MY');

  const isMouseDown = useRef(false);
  const touchStartPos = useRef<{ x: number, y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const stopDrag = () => { isMouseDown.current = false; };
    window.addEventListener('mouseup', stopDrag);
    return () => { window.removeEventListener('mouseup', stopDrag); };
  }, []);

  useEffect(() => {
    setDates(generateDates(config.startDate, config.endDate));
    setTimes(generateTimes(config.startTime, config.endTime, config.interval));

    const fetchSchedule = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/${config.roomCode}/schedule`);
        const data = await res.json();
        if (data.cells) {
          setCells(prev => {
            const newCells: Record<string, CellData> = JSON.parse(JSON.stringify(data.cells));
            const prevCells: Record<string, CellData> = JSON.parse(JSON.stringify(prev));
            
            const allKeys = new Set([...Object.keys(prevCells), ...Object.keys(newCells)]);
            allKeys.forEach(key => {
              const localCell = prevCells[key] || { votes: {}, comments: [] };
              const serverCell = newCells[key] || { votes: {}, comments: [] };
              
              const myLocalVote = localCell.votes?.[currentUser.name];
              if (myLocalVote) serverCell.votes[currentUser.name] = myLocalVote;
              else delete serverCell.votes[currentUser.name];
              
              const myLocalComments = (localCell.comments || []).filter(c => c.author === currentUser.name);
              const otherServerComments = (serverCell.comments || []).filter(c => c.author !== currentUser.name);
              serverCell.comments = [...otherServerComments, ...myLocalComments];
              
              if (Object.keys(serverCell.votes).length === 0 && serverCell.comments.length === 0) {
                delete newCells[key];
              } else {
                newCells[key] = serverCell;
              }
            });
            return newCells;
          });
        }
      } catch (err) {
        console.log("실시간 업데이트 실패");
      }
    };

    fetchSchedule();
    const intervalId = setInterval(fetchSchedule, 10000);
    return () => clearInterval(intervalId);
  }, [config.roomCode, currentUser.name]);

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/?code=${config.roomCode}`;
    const shareData = { title: config.title, text: `[${config.title}] 일정 조율에 초대합니다! 참여해주세요 🗓️`, url: shareUrl };
    if (navigator.share) { try { await navigator.share(shareData); } catch (err) { } } 
    else { navigator.clipboard.writeText(shareUrl).then(() => alert('초대 링크가 복사되었습니다!')); }
  };

  const handleSaveToServer = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/${config.roomCode}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cells: cells, currentUser: { name: currentUser.name, password: currentUser.password } })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.merged_cells) setCells(data.merged_cells);
        alert(`${currentUser.name}님의 투표가 안전하게 병합 저장되었습니다!`);
      } else {
        const errorData = await res.json();
        alert(errorData.detail || '저장에 실패했습니다.');
      }
    } catch (err) { alert('저장에 실패했습니다.'); } finally { setIsSaving(false); }
  };

  const handleCloseRoom = async () => {
    const confirmDelete = window.confirm('정말로 방을 마감하시겠습니까?');
    if (!confirmDelete) return;
    const hostToken = localStorage.getItem(`hostToken_${config.roomCode}`);
    if (!hostToken) return alert('권한이 없습니다.');
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

  const executeCellAction = (key: string) => {
    if (viewMode === 'ALL') {
      setActiveCellKey(key);
      return;
    }

    if (selectedVote) {
      setCells(prev => {
        const newCells = { ...prev };
        const cell = newCells[key] || { votes: {}, comments: [] };
        const currentMyVote = cell.votes[currentUser.name];
        
        if (currentMyVote === selectedVote) {
          const newVotes = { ...cell.votes };
          delete newVotes[currentUser.name];
          if (Object.keys(newVotes).length === 0 && cell.comments.length === 0) delete newCells[key];
          else newCells[key] = { ...cell, votes: newVotes };
        } else {
          newCells[key] = { ...cell, votes: { ...cell.votes, [currentUser.name]: selectedVote } };
        }
        return newCells;
      });
    }
  };

  const handleMouseDown = (key: string) => {
    if (viewMode === 'ALL') {
      executeCellAction(key);
      return;
    }
    if (selectedVote) {
      isMouseDown.current = true;
      executeCellAction(key);
    }
  };

  const handleMouseEnter = (key: string) => {
    if (isMouseDown.current && selectedVote && viewMode === 'MY') {
      setCells(prev => {
        const newCells = { ...prev };
        const cell = newCells[key] || { votes: {}, comments: [] };
        if (cell.votes[currentUser.name] !== selectedVote) {
          newCells[key] = { ...cell, votes: { ...cell.votes, [currentUser.name]: selectedVote } };
        }
        return newCells;
      });
    }
  };

  const applyBulkUpdate = (keysToUpdate: string[]) => {
    if (!selectedVote || viewMode === 'ALL') return;
    setCells(prev => {
      const newCells = { ...prev };
      let allAlreadySelected = true;
      for (const key of keysToUpdate) {
        if (newCells[key]?.votes?.[currentUser.name] !== selectedVote) { allAlreadySelected = false; break; }
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

  const globalMaxScore = useMemo(() => {
    let max = 0;
    Object.values(cells).forEach(cell => {
      if (!cell.votes) return;
      let score = 0;
      Object.values(cell.votes).forEach(v => {
        if (v === 'BEST') score += 1;
        else if (v === 'POSSIBLE') score += 0.5;
      });
      if (score > max) max = score;
    });
    return max;
  }, [cells]);

  const getHeatmapDisplay = (votes: Record<string, VoteType> = {}) => {
    const voters = Object.values(votes);
    if (voters.length === 0) return { bg: 'bg-white', text: '' };
    let score = 0;
    voters.forEach(v => {
      if (v === 'BEST') score += 1;
      else if (v === 'POSSIBLE') score += 0.5;
    });
    if (score === 0) return { bg: 'bg-gray-100', text: 'text-gray-400' };
    const ratio = globalMaxScore > 0 ? score / globalMaxScore : 0;
    if (ratio === 1.0) return { bg: 'bg-indigo-900 border-2 border-yellow-400 shadow-md scale-[1.02] z-10', text: 'text-yellow-400 font-black' };
    if (ratio >= 0.7) return { bg: 'bg-indigo-600', text: 'text-white' };
    if (ratio >= 0.4) return { bg: 'bg-blue-500', text: 'text-white' };
    return { bg: 'bg-sky-200', text: 'text-sky-900' };
  };

  const getVoteColor = (type: VoteType) => {
    switch (type) {
      case 'BEST': return 'bg-blue-500 border-blue-600 text-white';
      case 'POSSIBLE': return 'bg-green-500 border-green-600 text-white';
      case 'IMPOSSIBLE': return 'bg-red-500 border-red-600 text-white';
      default: return 'bg-white';
    }
  };

  const handleAddComment = () => {
    if (!commentInput.trim() || !activeCellKey) return;
    const newComment: Comment = { id: Date.now().toString(), text: commentInput.trim(), author: currentUser.name };
    setCells(prev => ({ ...prev, [activeCellKey]: { votes: prev[activeCellKey]?.votes || {}, comments: [...(prev[activeCellKey]?.comments || []), newComment] } }));
    setCommentInput('');
  };

  const handleDeleteComment = (commentId: string, author: string) => {
    if (author !== currentUser.name) return alert('본인 코멘트만 삭제 가능합니다.');
    if (!activeCellKey) return;
    setCells(prev => ({ ...prev, [activeCellKey]: { ...prev[activeCellKey], comments: prev[activeCellKey].comments.filter(c => c.id !== commentId) } }));
  };

  const participants = useMemo(() => {
    const names = new Set<string>();
    Object.values(cells).forEach(cell => {
      if (cell.votes) Object.keys(cell.votes).forEach(name => names.add(name));
      if (cell.comments) cell.comments.forEach(c => names.add(c.author));
    });
    return Array.from(names);
  }, [cells]);

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
    <div className="max-w-md mx-auto min-h-screen relative bg-white shadow-xl overflow-hidden pb-32 flex flex-col font-sans">
      <header className="bg-white px-4 py-4 shadow-sm z-10 flex flex-col border-b border-gray-100 transition-all">
        <div className="flex justify-between items-start w-full">
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              {onBack && (
                <button onClick={onBack} className="text-gray-400 hover:text-black p-1 -ml-1 rounded-lg transition-colors active:scale-95">
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}
              <h1 className="text-lg font-bold text-gray-900 truncate max-w-[150px] leading-none">{config.title}</h1>
              {isHost && <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full ml-1">방장</span>}
            </div>
            <div className="flex items-center gap-2 mt-2 pl-1">
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-md border border-gray-200">코드: <strong className="text-gray-900">{config.roomCode}</strong></span>
              <span className="text-xs text-blue-600 font-bold">{currentUser.name}님</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleShare} className="bg-blue-50 text-blue-600 border border-blue-200 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-blue-100 transition-colors">
              <Share2 className="w-4 h-4" /> 공유
            </button>
            <button onClick={handleSaveToServer} disabled={isSaving} className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold">{isSaving ? '저장...' : '저장'}</button>
          </div>
        </div>
        
        {isHost && (
          <div className="mt-3 flex justify-end">
            <button onClick={handleCloseRoom} className="text-red-500 text-xs font-bold underline hover:text-red-700">방 마감하기</button>
          </div>
        )}
        
        <div className="flex bg-gray-100 p-1 rounded-xl mt-4 border border-gray-200">
          <button onClick={() => { setViewMode('MY'); setSelectedVote(null); }} className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'MY' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>내 투표</button>
          <button onClick={() => { setViewMode('ALL'); setSelectedVote(null); }} className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'ALL' ? 'bg-blue-500 shadow text-white' : 'text-gray-500 hover:text-gray-700'}`}><Users className="w-4 h-4" /> 종합 결과</button>
        </div>

        {viewMode === 'ALL' && (
          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <div className="text-xs font-bold text-blue-600 whitespace-nowrap flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md">
              <Users className="w-3 h-3" /> 참여자 ({participants.length}명)
            </div>
            {participants.length === 0 ? (
              <span className="text-[11px] text-gray-400">아직 참여한 사람이 없습니다.</span>
            ) : (
              participants.map(p => (
                <span key={p} className="bg-gray-100 text-gray-700 text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap border border-gray-200">
                  {p}
                </span>
              ))
            )}
          </div>
        )}
      </header>

      <div className="flex-1 overflow-x-auto select-none bg-gray-50">
        <div className="flex p-4 min-w-max">
          <div className="flex flex-col mr-2">
            <div onClick={handleAllClick} className={`h-8 flex items-center justify-end text-xs font-bold text-gray-400 pr-2 rounded-md ${selectedVote && viewMode === 'MY' ? 'cursor-pointer hover:bg-gray-200 hover:text-blue-600' : ''}`}>{selectedVote && viewMode === 'MY' ? '전체선택' : ''}</div>
            {times.map((t) => (
              <div key={t} onClick={() => handleRowClick(t)} className={`h-12 mb-[2px] flex items-center justify-end text-xs font-medium text-gray-400 pr-2 rounded-md ${selectedVote && viewMode === 'MY' ? 'cursor-pointer hover:bg-gray-200 hover:text-gray-900' : ''}`}>{t}</div>
            ))}
          </div>
          {dates.map((d) => (
            <div key={d} className="flex flex-col flex-1 min-w-[70px]">
              <div onClick={() => handleColumnClick(d)} className={`h-8 flex items-center justify-center text-sm font-bold text-gray-700 rounded-md ${selectedVote && viewMode === 'MY' ? 'cursor-pointer hover:bg-gray-200 hover:text-blue-600' : ''}`}>{d}</div>
              {times.map((t) => {
                const key = getCellKey(d, t);
                const cell = cells[key];
                let cellClasses = 'w-full h-12 mb-[2px] border-[0.5px] border-gray-200 transition-all duration-200 relative cursor-pointer rounded-md mx-[1px] flex items-center justify-center';
                let textColor = '';
                let displayCount = 0;

                if (viewMode === 'MY') {
                  const myVote = cell?.votes?.[currentUser.name];
                  if (myVote) cellClasses += ` ${getVoteColor(myVote)}`;
                  else cellClasses += ' bg-white hover:bg-gray-100';
                } else {
                  const heatmap = getHeatmapDisplay(cell?.votes);
                  cellClasses += ` ${heatmap.bg}`;
                  textColor = heatmap.text;
                  displayCount = Object.keys(cell?.votes || {}).length;
                }

                return (
                  <div 
                    key={key} 
                    data-key={key}
                    onMouseDown={() => handleMouseDown(key)}
                    onMouseEnter={() => handleMouseEnter(key)}
                    // 💡 [핵심 보완] PC 마우스 단순 클릭(onClick)과 모바일 탭(onTouchEnd) 모두 완벽 작동!
                    onClick={() => executeCellAction(key)}
                    onTouchStart={(e) => {
                      const touch = e.touches[0];
                      touchStartPos.current = { x: touch.clientX, y: touch.clientY };
                    }}
                    onTouchEnd={(e) => {
                      const touch = e.changedTouches[0];
                      const moveX = Math.abs(touch.clientX - touchStartPos.current.x);
                      const moveY = Math.abs(touch.clientY - touchStartPos.current.y);
                      
                      if (moveX < 10 && moveY < 10) {
                        e.preventDefault();
                        executeCellAction(key);
                      }
                    }}
                    className={cellClasses}
                  >
                    {viewMode === 'ALL' && displayCount > 0 && <span className={`text-[12px] font-extrabold ${textColor}`}>{displayCount}명</span>}
                    {(cell?.comments && cell.comments.length > 0) && <div className="absolute top-0 right-1 text-sm z-10 drop-shadow-md">💬</div>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      
      <div className={`fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent z-30 transition-transform duration-300 max-w-md mx-auto ${viewMode === 'ALL' ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
        <div className="bg-white p-2 rounded-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)] flex gap-2 border border-gray-100">
          <button onClick={() => setSelectedVote(prev => prev === 'BEST' ? null : 'BEST')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${selectedVote === 'BEST' ? 'bg-blue-500 text-white shadow-md' : 'bg-blue-50 text-blue-600'}`}>최적</button>
          <button onClick={() => setSelectedVote(prev => prev === 'POSSIBLE' ? null : 'POSSIBLE')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${selectedVote === 'POSSIBLE' ? 'bg-green-500 text-white shadow-md' : 'bg-green-50 text-green-600'}`}>가능</button>
          <button onClick={() => setSelectedVote(prev => prev === 'IMPOSSIBLE' ? null : 'IMPOSSIBLE')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${selectedVote === 'IMPOSSIBLE' ? 'bg-red-500 text-white shadow-md' : 'bg-red-50 text-red-600'}`}>불가</button>
        </div>
      </div>
      
      <div className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 max-w-md mx-auto ${activeCellKey ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setActiveCellKey(null)} />
      <div className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 px-6 pt-3 pb-8 flex flex-col shadow-2xl transition-transform duration-300 ease-out h-[75vh] max-w-md mx-auto ${activeCellKey ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6" />
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-gray-900">{activeCellKey?.replace('-', ' ')} 상세 통계</h3>
          <button onClick={() => setActiveCellKey(null)} className="p-2 bg-gray-100 rounded-full text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-4">
          <div className="flex gap-2">
             <div className="flex-1 bg-blue-50 p-3 rounded-xl border border-blue-100"><span className="text-xs font-bold text-blue-600 block mb-1">최적 ({bestUsers.length})</span><span className="text-sm text-gray-700 leading-tight">{bestUsers.join(', ') || '-'}</span></div>
             <div className="flex-1 bg-green-50 p-3 rounded-xl border border-green-100"><span className="text-xs font-bold text-green-600 block mb-1">가능 ({possibleUsers.length})</span><span className="text-sm text-gray-700 leading-tight">{possibleUsers.join(', ') || '-'}</span></div>
             <div className="flex-1 bg-red-50 p-3 rounded-xl border border-red-100"><span className="text-xs font-bold text-red-600 block mb-1">불가 ({impossibleUsers.length})</span><span className="text-sm text-gray-700 leading-tight">{impossibleUsers.join(', ') || '-'}</span></div>
          </div>
          <div className="h-px bg-gray-100 my-2" />
          <div className="flex flex-col gap-3">
            {!activeCellData?.comments || activeCellData.comments.length === 0 ? (
              <div className="py-8 flex items-center justify-center text-sm text-gray-400 bg-gray-50 rounded-2xl">아직 작성된 메모가 없습니다.</div>
            ) : (
              activeCellData.comments.map((comment) => (
                <div key={comment.id} className="bg-gray-50 p-4 rounded-2xl text-sm flex justify-between border border-gray-100">
                  <div className="flex flex-col gap-1"><span className="font-bold text-blue-600 text-xs">{comment.author}</span><span className="text-gray-800 leading-relaxed">{comment.text}</span></div>
                  {comment.author === currentUser.name && <button onClick={() => handleDeleteComment(comment.id, comment.author)} className="text-gray-400 hover:text-red-500 ml-4"><Trash2 className="w-4 h-4" /></button>}
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