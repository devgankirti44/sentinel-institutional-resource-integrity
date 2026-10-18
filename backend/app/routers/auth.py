from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from app.database import get_db
from app.models import User, UserRole, Department
import hashlib

router = APIRouter(prefix="/api/auth", tags=["Authentication & User Management"])


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


class UserRegister(BaseModel):
    username: str
    password: str
    full_name: str
    role: UserRole
    department_id: Optional[int] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    full_name: str
    role: str
    department_id: Optional[int] = None
    department_name: Optional[str] = None

    class Config:
        from_attributes = True


@router.post("/register", response_model=UserResponse)
def register_user(req: UserRegister, db: Session = Depends(get_db)):
    """Creates a new user dynamically in the database with hashed password."""
    existing = db.query(User).filter(User.username == req.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    # Fail-safe department validation: if ID is invalid or empty, default to None
    valid_dept_id = None
    if req.department_id and req.department_id > 0:
        dept = db.query(Department).filter(Department.id == req.department_id).first()
        if dept:
            valid_dept_id = dept.id

    user = User(
        username=req.username,
        password_hash=hash_password(req.password),
        full_name=req.full_name,
        role=req.role,
        department_id=valid_dept_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    dept_name = user.department.name if user.department else None

    return UserResponse(
        id=user.id,
        username=user.username,
        full_name=user.full_name,
        role=user.role.value,
        department_id=user.department_id,
        department_name=dept_name,
    )


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Verifies username and hashed password dynamically against database."""
    user = db.query(User).filter(User.username == req.username).first()
    if not user or user.password_hash != hash_password(req.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    dept_name = user.department.name if user.department else None

    return {
        "id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "role": user.role.value,
        "department_id": user.department_id,
        "department_name": dept_name,
    }


@router.get("/users", response_model=List[UserResponse])
def list_users(db: Session = Depends(get_db)):
    """Lists all registered users in the database."""
    users = db.query(User).all()
    out = []
    for u in users:
        out.append(
            UserResponse(
                id=u.id,
                username=u.username,
                full_name=u.full_name,
                role=u.role.value,
                department_id=u.department_id,
                department_name=u.department.name if u.department else None,
            )
        )
    return out