export type Step = 'CREATE' | 'LOGIN' | 'GRID';
export type VoteType = 'BEST' | 'POSSIBLE' | 'IMPOSSIBLE';

export interface RoomConfig {
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