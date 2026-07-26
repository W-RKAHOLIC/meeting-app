'use client'

import React, { useState } from 'react';
import HomeScreen from '../components/HomeScreen';
import HostCreateScreen from '../components/HostCreateScreen';
import ParticipantLoginScreen from '../components/ParticipantLoginScreen';
import DynamicTimeGrid from '../components/DynamicTimeGrid';
import { Step, RoomConfig, User } from '../components/types';

// 💡 백엔드 라이브 서버 주소를 상수로 빼서 관리합니다.
const API_BASE_URL = 'https://meeting-app-dade.onrender.com/api/rooms';

export default function ScheduleApp() {
  const [step, setStep] = useState<Step>('HOME');
  const [roomConfig, setRoomConfig] = useState<RoomConfig | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isHost, setIsHost] = useState(false);

  if (step === 'HOME') {
    return <HomeScreen 
      onCreate={() => setStep('CREATE')} 
      onJoin={async (code) => {
        try {
          // 💡 수정됨: Render 라이브 주소 적용
          const res = await fetch(`${API_BASE_URL}/${code}`);
          if (!res.ok) throw new Error('방을 찾을 수 없습니다. 코드를 확인해주세요.');
          
          const data = await res.json();
          setRoomConfig(data);
          
          const savedToken = localStorage.getItem(`hostToken_${code}`);
          if (savedToken) setIsHost(true);
          else setIsHost(false);

          setStep('LOGIN');
        } catch (err: any) {
          alert(err.message);
        }
      }} 
    />;
  }

  if (step === 'CREATE') {
    return <HostCreateScreen onComplete={async (config) => {
      try {
        // 💡 수정됨: Render 라이브 주소 적용
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

          alert(`방이 성공적으로 생성되었습니다!\n🎉 참여 코드: [ ${roomCode} ]\n팀원들에게 이 코드를 공유해주세요.`);
          
          setRoomConfig({ ...config, roomCode });
          setStep('LOGIN');
        } else {
          const errorData = await res.json();
          alert(`방 생성 실패: ${errorData.detail}`);
        }
      } catch (err) {
        alert('백엔드 서버와 통신할 수 없습니다. 서버가 켜져 있는지 확인해주세요.');
      }
    }} />;
  }

  if (step === 'LOGIN' && roomConfig) {
    return <ParticipantLoginScreen 
      roomTitle={`${roomConfig.title} (코드: ${roomConfig.roomCode})`} 
      onLogin={(user) => {
        setCurrentUser(user);
        setStep('GRID');
      }} 
    />;
  }

  if (step === 'GRID' && roomConfig && currentUser) {
    return <DynamicTimeGrid config={roomConfig} currentUser={currentUser} isHost={isHost} />;
  }

  return null;
}