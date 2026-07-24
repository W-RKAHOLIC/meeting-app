export type Step = 'HOME' | 'CREATE' | 'LOGIN' | 'GRID'; // 💡 HOME 단계 추가
export type VoteType = 'BEST' | 'POSSIBLE' | 'IMPOSSIBLE';

export interface RoomConfig {
  roomCode: string; // 💡 방 고유 코드 추가
  title: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  interval: number;
}

export interface User {
  name: string;
  pin: string;
}

export interface Comment {
  id: string;
  text: string;
  author: string;
}

export interface CellData {
  state: VoteType | null;
  comments: Comment[];
}