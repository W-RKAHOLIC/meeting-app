import random
import string
import secrets
from datetime import datetime, timedelta

# 기능 1: 고유 방 코드 생성 (중복 방지)
def generate_unique_room_code(cursor):
    while True:
        # 💡 ascii_UPPERCASE -> ascii_uppercase 로 오타 수정!
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        cursor.execute("SELECT 1 FROM rooms WHERE room_code = %s", (code,))
        if not cursor.fetchone():
            return code

# 기능 2: 주최자 마스터 키 발급
def generate_host_token():
    return secrets.token_hex(16)

# 기능 3: 방 자동 폭파 시간(TTL) 계산
def calculate_expiration_date(end_date_str: str, days_to_add: int = 7):
    end_date_obj = datetime.strptime(end_date_str, "%Y-%m-%d")
    return end_date_obj + timedelta(days=days_to_add)