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
    expireDays: int  # 💡 [추가됨] 사용자가 선택한 방 유지 기간 (일 단위)

class ScheduleRequest(BaseModel):
    cells: Dict[str, Any]