from sqlalchemy import Column, Integer, String, ForeignKey, Date, Time, Text
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class MeetingRoom(Base):
    __tablename__ = "meeting_rooms"
    
    id = Column(String, primary_key=True, index=True) # UUID
    title = Column(String, nullable=False)
    date_range = Column(String, nullable=False) # 예: "2023-11-01,2023-11-05"
    time_range = Column(String, nullable=False) # 예: "09:00-18:00"

    participants = relationship("Participant", back_populates="room")
    votes = relationship("TimeSlotVote", back_populates="room")
    comments = relationship("TimeSlotComment", back_populates="room")

class Participant(Base):
    __tablename__ = "participants"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    room_id = Column(String, ForeignKey("meeting_rooms.id"))
    name = Column(String, nullable=False)
    session_token = Column(String, nullable=False) # 임시 수정 권한 토큰

    room = relationship("MeetingRoom", back_populates="participants")
    votes = relationship("TimeSlotVote", back_populates="participant")
    comments = relationship("TimeSlotComment", back_populates="participant")

class TimeSlotVote(Base):
    __tablename__ = "time_slot_votes"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    participant_id = Column(Integer, ForeignKey("participants.id"))
    room_id = Column(String, ForeignKey("meeting_rooms.id"))
    date = Column(Date, nullable=False)
    time = Column(Time, nullable=False)
    weight_score = Column(Integer, nullable=False) # 3: 최선, 1: 가능, 0: 불가능

    participant = relationship("Participant", back_populates="votes")
    room = relationship("MeetingRoom", back_populates="votes")

class TimeSlotComment(Base):
    __tablename__ = "time_slot_comments"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    participant_id = Column(Integer, ForeignKey("participants.id"))
    room_id = Column(String, ForeignKey("meeting_rooms.id"))
    date = Column(Date, nullable=False)
    time = Column(Time, nullable=False)
    content = Column(Text, nullable=False)

    participant = relationship("Participant", back_populates="comments")
    room = relationship("MeetingRoom", back_populates="comments")