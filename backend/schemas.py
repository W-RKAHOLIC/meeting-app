from pydantic import BaseModel
from typing import Dict, Any

# 프론트엔드에서 넘어오는 방 생성 정보
class RoomConfigReq(BaseModel):
    title: str
    startDate: str
    endDate: str
    startTime: str
    endTime: str
    interval: int

# 프론트엔드에서 넘어오는 투표 데이터
class ScheduleRequest(BaseModel):
    cells: Dict[str, Any]