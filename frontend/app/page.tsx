'use client'

import React, { useState } from 'react';
import HomeScreen from '../components/HomeScreen';
import HostCreateScreen from '../components/HostCreateScreen';
import ParticipantLoginScreen from '../components/ParticipantLoginScreen';
import DynamicTimeGrid from '../components/DynamicTimeGrid';
import { Step, RoomConfig, User } from '../components/types';

export default function ScheduleApp() {
  const [step, setStep] = useState<Step>('HOME'); // 💡 첫 화면을 HOME으로 시작!
  const [roomConfig, setRoomConfig] = useState<RoomConfig | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // --- 화면 0: 홈 화면 (주최자 vs 참여자 선택) ---
  if (step === 'HOME') {
    return <HomeScreen 
      onCreate={() => setStep('CREATE')} 
      onJoin={(code) => {
        // 💡 실제로는 여기서 백엔드에 코드를 보내 방 정보를 불러와야 합니다. (지금은 시뮬레이션)
        alert(`[백엔드 통신 시뮬레이션]\n입력하신 코드(${code})의 방 정보를 서버에서 불러옵니다!`);
        
        // 가상의 방 데이터 세팅
        setRoomConfig({
          roomCode: code,
          title: '초대받은 시뮬레이션 회의',
          startDate: '2026-07-25',
          endDate: '2026-07-28',
          startTime: '10:00',
          endTime: '15:00',
          interval: 60
        });
        setStep('LOGIN');
      }} 
    />;
  }

  // --- 화면 1: 주최자 방 생성 ---
  if (step === 'CREATE') {
    return <HostCreateScreen onComplete={(config) => {
      alert(`방이 성공적으로 생성되었습니다!\n🎉 참여 코드: [ ${config.roomCode} ]\n팀원들에게 이 코드를 공유해주세요.`);
      setRoomConfig(config);
      setStep('LOGIN');
    }} />;
  }

  // --- 화면 2: 참여자 로그인 ---
  if (step === 'LOGIN' && roomConfig) {
    return <ParticipantLoginScreen 
      roomTitle={`${roomConfig.title} (코드: ${roomConfig.roomCode})`} 
      onLogin={(user) => {
        setCurrentUser(user);
        setStep('GRID');
      }} 
    />;
  }

  // --- 화면 3: 본 투표 그리드 ---
  if (step === 'GRID' && roomConfig && currentUser) {
    return <DynamicTimeGrid config={roomConfig} currentUser={currentUser} />;
  }

  return null;
}