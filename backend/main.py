import json
import traceback
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware

from database import get_db_connection, init_db
from schemas import RoomConfigReq, ScheduleRequest, UserReq
import services

app = FastAPI()

# 💡 CORS 설정 (프론트엔드-백엔드 통신 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 서버 시작 시 DB 테이블 초기화 검사
init_db()

@app.get("/")
def read_root():
    return {"message": "🚀 기능이 완벽하게 분리된 모듈형 백엔드입니다!"}

@app.post("/api/rooms")
def create_room(config: RoomConfigReq):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 🧹 [자동 청소] 새 방을 만들기 직전, 기한이 지난 유령 방들을 DB에서 소각합니다!
        cursor.execute("DELETE FROM rooms WHERE expires_at < NOW()")
        
        room_code = services.generate_unique_room_code(cursor)
        host_token = services.generate_host_token()
        
        # 💡 [유효기간] 현재 시간 + 사용자가 선택한 expireDays(일수)
        expires_at = datetime.now() + timedelta(days=config.expireDays)
        
        config_json = json.dumps(config.dict()) 
        schedule_json = json.dumps({}) 
        users_json = json.dumps({}) # 비밀번호 장부 초기화
        
        cursor.execute("""
            INSERT INTO rooms (room_code, config_data, schedule_data, users_data, host_token, expires_at)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (room_code, config_json, schedule_json, users_json, host_token, expires_at))
        
        conn.commit()
        return {"status": "success", "roomCode": room_code, "hostToken": host_token}
    except Exception as e:
        traceback.print_exc() 
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

# 💡 [로그인 검증] 방 입장 시 이름과 비밀번호를 검사하거나 새롭게 장부에 등록합니다.
@app.post("/api/rooms/{room_code}/login")
def login_user(room_code: str, user: UserReq):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT users_data FROM rooms WHERE room_code = %s", (room_code,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="방을 찾을 수 없습니다.")

        users_data = json.loads(row[0]) if row[0] else {}

        if user.name in users_data:
            # 이미 접속한 적 있는 이름이면, 비밀번호 일치 여부 확인
            if users_data[user.name] != user.password:
                raise HTTPException(status_code=401, detail="비밀번호가 일치하지 않습니다.")
        else:
            # 처음 접속하는 이름이면, 장부에 등록
            users_data[user.name] = user.password
            cursor.execute("UPDATE rooms SET users_data = %s WHERE room_code = %s", (json.dumps(users_data), room_code))
            conn.commit()

        return {"status": "success"}
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
        
        # ⏳ [지연 삭제] 유효기간이 지났는지 검사하고 지났다면 즉시 삭제
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

# 💡 [동시성 덮어쓰기 방어 & 병합] 프론트엔드가 보낸 '나의 데이터'만 핀셋으로 기존 DB에 합칩니다.
@app.post("/api/rooms/{room_code}/schedule")
def update_schedule(room_code: str, req: ScheduleRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 1. 인증 및 기존 DB 데이터 불러오기
        cursor.execute("SELECT schedule_data, users_data FROM rooms WHERE room_code = %s", (room_code,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="방을 찾을 수 없습니다.")
        
        db_schedule_json = row[0]
        users_data = json.loads(row[1]) if row[1] else {}
        user_name = req.currentUser.name
        
        # 2. 비밀번호 철통 방어
        if users_data.get(user_name) != req.currentUser.password:
            raise HTTPException(status_code=401, detail="인증 오류: 다른 사람의 데이터에 덮어쓸 수 없습니다.")

        # 3. 데이터 병합 (Merge) 시작
        db_cells = json.loads(db_schedule_json) if db_schedule_json else {}
        incoming_cells = req.cells

        # 3-1. DB에서 '현재 유저'의 기존 투표 기록만 싹 지움 (타인 데이터 보존)
        for key in list(db_cells.keys()):
            if "votes" in db_cells[key] and user_name in db_cells[key]["votes"]:
                del db_cells[key]["votes"][user_name]

        # 3-2. 방금 들어온 데이터에서 '현재 유저'의 투표와 메모만 뽑아서 DB에 추가
        for key, cell in incoming_cells.items():
            if key not in db_cells:
                db_cells[key] = {"votes": {}, "comments": []}
            if "votes" not in db_cells[key]:
                db_cells[key]["votes"] = {}
            if "comments" not in db_cells[key]:
                db_cells[key]["comments"] = []

            # 투표 병합
            if "votes" in cell and user_name in cell["votes"]:
                db_cells[key]["votes"][user_name] = cell["votes"][user_name]

            # 메모 병합
            incoming_user_comments = [c for c in cell.get("comments", []) if c.get("author") == user_name]
            other_users_comments = [c for c in db_cells[key].get("comments", []) if c.get("author") != user_name]
            db_cells[key]["comments"] = other_users_comments + incoming_user_comments

            # 비어있는 데이터 정리
            if not db_cells[key]["votes"] and not db_cells[key]["comments"]:
                del db_cells[key]

        # 4. 병합 완료된 데이터를 다시 DB에 저장
        schedule_json = json.dumps(db_cells)
        cursor.execute("""
            UPDATE rooms 
            SET schedule_data = %s 
            WHERE room_code = %s
        """, (schedule_json, room_code))
        conn.commit()
        
        # 프론트엔드가 바로 최신 화면을 그릴 수 있게 합쳐진 데이터를 돌려줌
        return {"status": "success", "merged_cells": db_cells}
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