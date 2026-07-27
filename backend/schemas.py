# backend/schemas.py
from pydantic import BaseModel
from typing import Dict, Any

class RoomConfigReq(BaseModel):
    title: str
    startDate: str
    endDate: str
    startTime: str
    endTime: str
    interval: int
    expireDays: int

# 💡 [추가] 유저 로그인 정보 규칙
class UserReq(BaseModel):
    name: str
    password: str

class ScheduleRequest(BaseModel):
    cells: Dict[str, Any]
    currentUser: UserReq  # 💡 [추가] 투표를 저장할 때 "내가 누구인지" 증명하도록 필수화!