import psycopg2

# 선생님의 Supabase 주소
DB_URL = "postgresql://postgres:zapping1234!@db.vorafaavxcziayxapppi.supabase.co:5432/postgres"

def get_db_connection():
    return psycopg2.connect(DB_URL)

def init_db():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # 다중 방 관리를 위한 테이블 생성
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS rooms (
                room_code VARCHAR(6) PRIMARY KEY,
                config_data TEXT,
                schedule_data TEXT,
                host_token VARCHAR(64),
                expires_at TIMESTAMP
            )
        ''')
        conn.commit()
        cursor.close()
        conn.close()
        print("✅ DB 테이블 초기화 완료!")
    except Exception as e:
        print("❌ DB 초기화 에러:", e)