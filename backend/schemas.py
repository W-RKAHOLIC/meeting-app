from pydantic import BaseModel
from typing import List, Optional
from datetime import date, time

# 투표 데이터 검증
class VoteCreate(BaseModel):
    date: date
    time: time
    weight_score: int

class CommentCreate(BaseModel):
    date: date
    time: time
    content: str

# 프론트엔드 응답용 방 전체 정보 스키마
class MeetingRoomResponse(BaseModel):
    id: str
    title: str
    date_range: str
    time_range: str
    # 참여자, 투표, 코멘트 등 중첩 데이터는 필요에 따라 추가 확장
    
    class Config:
        orm_mode = True