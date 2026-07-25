'use client'

import React, { useState } from 'react';
import HomeScreen from '../components/HomeScreen';
import HostCreateScreen from '../components/HostCreateScreen';
import ParticipantLoginScreen from '../components/ParticipantLoginScreen';
import DynamicTimeGrid from '../components/DynamicTimeGrid';
import { Step, RoomConfig, User } from '../components/types';

export default function ScheduleApp() {
  const [step, setStep] = useState<Step>('HOME');
  const [roomConfig, setRoomConfig] = useState<RoomConfig | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isHost, setIsHost] = useState(false); // 방장 여부 상태 추가

  if (step === 'HOME') {
    return <HomeScreen 
      onCreate={() => setStep('CREATE')} 
      onJoin={async (code) => {
        try {
          const res = await fetch(`172.20.10.3/rooms/${code}`);
          if (!res.ok) throw new Error('방을 찾을 수 없습니다. 코드를 확인해주세요.');
          
          const data = await res.json();
          setRoomConfig(data);
          
          // 입장 시 내 브라우저에 이 방의 마스터 키가 있는지 확인
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
        const res = await fetch('172.20.10.3/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config) // 순수 config 전달
        });
        
        if (res.ok) {
          const data = await res.json();
          const { roomCode, hostToken } = data; // 백엔드가 생성한 코드와 토큰
          
          // 방 생성 성공 시, 마스터 키를 로컬 스토리지에 저장
          localStorage.setItem(`hostToken_${roomCode}`, hostToken);
          setIsHost(true);

          alert(`방이 성공적으로 생성되었습니다!\n🎉 참여 코드: [ ${roomCode} ]\n팀원들에게 이 코드를 공유해주세요.`);
          
          setRoomConfig({ ...config, roomCode });
          setStep('LOGIN');
        } else {
          // 💡 에러 발생 시 경고창 띄우기
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
    // 투표 그리드 컴포넌트에 isHost 권한 정보를 전달
    return <DynamicTimeGrid config={roomConfig} currentUser={currentUser} isHost={isHost} />;
  }

  return null;
}