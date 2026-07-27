// frontend/components/types.ts

export type Step = 'HOME' | 'CREATE' | 'LOGIN' | 'GRID';

export interface RoomConfig {
  roomCode?: string;
  title: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  interval: number;
  // 💡 빨간 밑줄의 원인 해결! (여기에 expireDays를 추가했습니다)
  expireDays: number; 
}

export interface User {
  name: string;
  password?: string;
}

export type VoteType = 'BEST' | 'POSSIBLE' | 'IMPOSSIBLE';

export interface Comment {
  id: string;
  text: string;
  author: string;
}

export interface CellData {
  votes: Record<string, VoteType>;
  comments: Comment[];
}