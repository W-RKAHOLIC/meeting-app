import json
import traceback
from datetime import datetime
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware

# 분리한 파일들 불러오기
from database import get_db_connection, init_db
from schemas import RoomConfigReq, ScheduleRequest
import services

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 서버 시작 시 DB 초기화
init_db()

@app.get("/")
def read_root():
    return {"message": "🚀 기능이 완벽하게 분리된 모듈형 백엔드입니다!"}

# 1. 방 생성 API
@app.post("/api/rooms")
def create_room(config: RoomConfigReq):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        room_code = services.generate_unique_room_code(cursor)
        host_token = services.generate_host_token()
        expires_at = services.calculate_expiration_date(config.endDate)
        
        # 💡 Pydantic 버전 충돌 방지: model_dump() 대신 dict() 사용
        config_json = json.dumps(config.dict()) 
        schedule_json = json.dumps({}) 
        
        cursor.execute("""
            INSERT INTO rooms (room_code, config_data, schedule_data, host_token, expires_at)
            VALUES (%s, %s, %s, %s, %s)
        """, (room_code, config_json, schedule_json, host_token, expires_at))
        
        conn.commit()
        return {"status": "success", "roomCode": room_code, "hostToken": host_token}
    except Exception as e:
        # 💡 에러 발생 시 백엔드 터미널에 상세 원인 출력
        traceback.print_exc() 
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

# 2. 방 정보 조회 API (참여자 입장 시)
@app.get("/api/rooms/{room_code}")
def get_room(room_code: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT config_data, expires_at FROM rooms WHERE room_code = %s", (room_code,))
        row = cursor.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="방을 찾을 수 없습니다. 코드를 확인해주세요.")
            
        config_data, expires_at = row
        
        # 수명 검사
        if expires_at < datetime.now():
            cursor.execute("DELETE FROM rooms WHERE room_code = %s", (room_code,))
            conn.commit()
            raise HTTPException(status_code=404, detail="일정이 종료되어 삭제된 방입니다.")
            
        config = json.loads(config_data)
        config["roomCode"] = room_code 
        return config
    finally:
        cursor.close()
        conn.close()

# 3. 투표 데이터 불러오기
@app.get("/api/rooms/{room_code}/schedule")
def get_schedule(room_code: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT schedule_data FROM rooms WHERE room_code = %s", (room_code,))
        row = cursor.fetchone()
        if row and row[0]:
            return {"cells": json.loads(row[0])}
        return {"cells": {}}
    finally:
        cursor.close()
        conn.close()

# 4. 투표 데이터 업데이트
@app.post("/api/rooms/{room_code}/schedule")
def update_schedule(room_code: str, req: ScheduleRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        schedule_json = json.dumps(req.cells)
        cursor.execute("""
            UPDATE rooms 
            SET schedule_data = %s 
            WHERE room_code = %s
        """, (schedule_json, room_code))
        conn.commit()
        return {"status": "success"}
    finally:
        cursor.close()
        conn.close()

# 5. 방 마감(삭제) API - 마스터 키 검증 로직 포함
@app.delete("/api/rooms/{room_code}")
def delete_room(room_code: str, x_host_token: str = Header(None)):
    if not x_host_token:
        raise HTTPException(status_code=401, detail="마스터 키가 전달되지 않았습니다.")
        
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT host_token FROM rooms WHERE room_code = %s", (room_code,))
        row = cursor.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="이미 삭제되었거나 없는 방입니다.")
            
        if row[0] != x_host_token:
            raise HTTPException(status_code=403, detail="방을 마감할 권한(마스터 키)이 일치하지 않습니다.")
            
        # 권한 확인 시 영구 삭제
        cursor.execute("DELETE FROM rooms WHERE room_code = %s", (room_code,))
        conn.commit()
        
        return {"status": "success", "message": "방이 성공적으로 마감되었습니다."}
    finally:
        cursor.close()
        conn.close()