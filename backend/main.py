import json
import psycopg2
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any

app = FastAPI()

# 프론트엔드(Vercel)에서 클라우드 백엔드로 접근할 수 있도록 모든 문을 엽니다.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🚨 여기에 아까 메모장에 만들어둔 내 Supabase 주소를 따옴표 안에 붙여넣으세요!
# 예시: "postgresql://postgres.xxx:내비밀번호@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres"
DB_URL = postgresql://postgres:zapping1234!@db.vorafaavxcziayxapppi.supabase.co:5432/postgres

def get_db_connection():
    return psycopg2.connect(DB_URL)

# 서버 시작 시 클라우드 DB에 테이블 생성
def init_db():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS schedule_data (
                id INTEGER PRIMARY KEY,
                data TEXT
            )
        ''')
        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        print("DB 초기화 에러:", e)

init_db()

class ScheduleRequest(BaseModel):
    cells: Dict[str, Any]

@app.get("/")
def read_root():
    return {"message": "🚀 클라우드 DB와 연결된 백엔드입니다!"}

@app.get("/api/schedule")
def get_schedule():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT data FROM schedule_data WHERE id = 1")
        row = cursor.fetchone()
        cursor.close()
        conn.close()
        if row:
            return {"cells": json.loads(row[0])}
    except Exception:
        pass
    return {"cells": {}}

@app.post("/api/schedule")
def save_schedule(req: ScheduleRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    data_string = json.dumps(req.cells)
    
    cursor.execute("DELETE FROM schedule_data")
    # PostgreSQL은 문법이 살짝 달라서 ? 대신 %s 를 사용합니다.
    cursor.execute("INSERT INTO schedule_data (id, data) VALUES (1, %s)", (data_string,))
    
    conn.commit()
    cursor.close()
    conn.close()
    return {"message": "클라우드 DB 저장 성공!", "cells": req.cells}