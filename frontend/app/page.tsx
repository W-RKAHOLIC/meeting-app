'use client'

import React, { useState, useEffect } from 'react';
import HomeScreen from '../components/HomeScreen';
import HostCreateScreen from '../components/HostCreateScreen';
import ParticipantLoginScreen from '../components/ParticipantLoginScreen';
import DynamicTimeGrid from '../components/DynamicTimeGrid';
import { Step, RoomConfig, User } from '../components/types';

const API_BASE_URL = 'https://meeting-app-dade.onrender.com/api/rooms';

export default function ScheduleApp() {
  const [step, setStep] = useState<Step>('HOME');
  const [roomConfig, setRoomConfig] = useState<RoomConfig | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code && step === 'HOME') {
      handleJoin(code);
    }
  }, []);

  const handleJoin = async (code: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${code}`);
      if (!res.ok) throw new Error('방을 찾을 수 없습니다. 코드를 확인해주세요.');
      
      const data = await res.json();
      setRoomConfig(data);
      
      const savedToken = localStorage.getItem(`hostToken_${code}`);
      setIsHost(!!savedToken);

      window.history.pushState(null, '', `/?code=${code}`);
      setStep('LOGIN');
    } catch (err: any) {
      alert(err.message);
      window.history.replaceState(null, '', '/');
    }
  };

  if (step === 'HOME') {
    return <HomeScreen 
      onCreate={() => setStep('CREATE')} 
      onJoin={handleJoin} 
    />;
  }

  if (step === 'CREATE') {
    return <HostCreateScreen 
      onBack={() => setStep('HOME')} 
      onComplete={async (config) => {
        try {
          const res = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config) 
          });
          
          if (res.ok) {
            const data = await res.json();
            const { roomCode, hostToken } = data; 
            
            localStorage.setItem(`hostToken_${roomCode}`, hostToken);
            setIsHost(true);

            // 💡 [수정됨] 방 코드 표시 복구!
            alert(`방이 성공적으로 생성되었습니다!\n🎉 참여 코드: [ ${roomCode} ]\n팀원들에게 링크나 코드를 공유해주세요.`);
            
            setRoomConfig({ ...config, roomCode });
            window.history.pushState(null, '', `/?code=${roomCode}`);
            setStep('LOGIN');
          } else {
            const errorData = await res.json();
            alert(`방 생성 실패: ${errorData.detail}`);
          }
        } catch (err) {
          alert('백엔드 서버와 통신할 수 없습니다.');
        }
      }} 
    />;
  }

  if (step === 'LOGIN' && roomConfig) {
    return <ParticipantLoginScreen 
      roomTitle={`${roomConfig.title} (코드: ${roomConfig.roomCode})`} 
      roomCode={roomConfig.roomCode!} // 💡 [추가] 방 코드를 로그인 창으로 전달
      onBack={() => {
        window.history.replaceState(null, '', '/');
        setStep('HOME');
      }}
      onLogin={(user) => {
        setCurrentUser(user);
        setStep('GRID');
      }} 
    />;
  }

  if (step === 'GRID' && roomConfig && currentUser) {
    return <DynamicTimeGrid 
      config={roomConfig} 
      currentUser={currentUser} 
      isHost={isHost} 
      onBack={() => {
        window.history.replaceState(null, '', '/');
        setStep('HOME');
      }}
    />;
  }

  return null;
}