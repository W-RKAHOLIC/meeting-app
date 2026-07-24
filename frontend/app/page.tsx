'use client'

import React, { useState } from 'react';
import HostCreateScreen from '../components/HostCreateScreen';
import ParticipantLoginScreen from '../components/ParticipantLoginScreen';
import DynamicTimeGrid from '../components/DynamicTimeGrid';
import { Step, RoomConfig, User } from '../components/types'; // 💡 수정됨

export default function ScheduleApp() {
  const [step, setStep] = useState<Step>('CREATE');
  const [roomConfig, setRoomConfig] = useState<RoomConfig | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  if (step === 'CREATE') {
    return <HostCreateScreen onComplete={(config) => {
      setRoomConfig(config);
      setStep('LOGIN');
    }} />;
  }

  if (step === 'LOGIN' && roomConfig) {
    return <ParticipantLoginScreen roomTitle={roomConfig.title} onLogin={(user) => {
      setCurrentUser(user);
      setStep('GRID');
    }} />;
  }

  if (step === 'GRID' && roomConfig && currentUser) {
    return <DynamicTimeGrid config={roomConfig} currentUser={currentUser} />;
  }

  return null;
}