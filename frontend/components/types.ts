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
  votes: Record<string, VoteType>; // 💡 수정됨: { "홍길동": "BEST", "김철수": "POSSIBLE" } 형태로 저장
  comments: Comment[];
}

// frontend/components/types.ts

export interface RoomConfig {
  roomCode: string;
  title: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  interval: number;
  expireDays: number; // 💡 [추가됨] 프론트엔드에도 유효기간 속성 추가
}

// (아래의 User, VoteType, Comment, CellData, Step 등은 기존 코드 유지)