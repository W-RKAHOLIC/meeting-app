# backend/main.py
import json
import traceback
from datetime import datetime, timedelta # 💡 timedelta 추가
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware

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

init_db()

@app.get("/")
def read_root():
    return {"message": "🚀 기능이 완벽하게 분리된 모듈형 백엔드입니다!"}

@app.post("/api/rooms")
def create_room(config: RoomConfigReq):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 🧹 [자동 청소 마법] 새 방을 만들기 직전, 기한이 끝난 모든 방을 DB에서 소각합니다!
        cursor.execute("DELETE FROM rooms WHERE expires_at < NOW()")
        
        room_code = services.generate_unique_room_code(cursor)
        host_token = services.generate_host_token()
        
        # 💡 [만료일 설정] 현재 시간 + 사용자가 선택한 expireDays(일수)
        expires_at = datetime.now() + timedelta(days=config.expireDays)
        
        config_json = json.dumps(config.dict()) 
        schedule_json = json.dumps({}) 
        
        cursor.execute("""
            INSERT INTO rooms (room_code, config_data, schedule_data, host_token, expires_at)
            VALUES (%s, %s, %s, %s, %s)
        """, (room_code, config_json, schedule_json, host_token, expires_at))
        
        conn.commit()
        return {"status": "success", "roomCode": room_code, "hostToken": host_token}
    except Exception as e:
        traceback.print_exc() 
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

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
        
        # 기한 검사 (지연 삭제)
        if expires_at < datetime.now():
            cursor.execute("DELETE FROM rooms WHERE room_code = %s", (room_code,))
            conn.commit()
            raise HTTPException(status_code=404, detail="마감 기한이 지나 삭제된 방입니다.")
            
        config = json.loads(config_data)
        config["roomCode"] = room_code 
        return config
    finally:
        cursor.close()
        conn.close()

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
            raise HTTPException(status_code=403, detail="방을 마감할 권한이 없습니다.")
            
        cursor.execute("DELETE FROM rooms WHERE room_code = %s", (room_code,))
        conn.commit()
        
        return {"status": "success", "message": "방이 성공적으로 마감되었습니다."}
    finally:
        cursor.close()
        conn.close()