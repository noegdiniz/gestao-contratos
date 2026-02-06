import os
from datetime import datetime, timedelta
from typing import Optional, Union
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from models import SessionLocal, User, Empresa, Profile
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET", "super-secret-key")
GOOGLE_CLIENT_ID = "13256348917-k29q8fpfoblkan04mfadpr8fe6vafkg6.apps.googleusercontent.com"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

def verify_google_token(token: str, dominio_permitido: Optional[str] = None):
    try:
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), GOOGLE_CLIENT_ID)
        
        # Validate domain
        domain = dominio_permitido or 'amcel.com.br'
        if domain.startswith('@'):
            domain = domain[1:]
            
        if idinfo.get('hd') != domain and not idinfo.get('email', '').endswith(f'@{domain}'):
            raise HTTPException(status_code=403, detail=f"Acesso restrito ao domínio @{domain}")
            
        return idinfo
    except ValueError:
        raise HTTPException(status_code=401, detail="Token do Google inválido")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Check if it's a company login FIRST properly
    empresa_id = payload.get("empresa_id")
    if empresa_id:
        empresa = db.query(Empresa).filter(Empresa.id == int(empresa_id)).first()
        if empresa:
            permissions = {
                "canViewDados": True,
                "canViewContratos": True,
                "canViewDocs": True,
                "canViewFuncionarios": True,
                "canEditFuncionarios": True,
                "canDeleteFuncionarios": True,
                "canCreateFuncionarios": True,
                "isEmpresa": True
            }
            return {"type": "empresa", "data": empresa, "profileStatus": "active", "permissions": permissions}
        # If has empresa_id but not found, invalid token for company
        raise credentials_exception

    # If no empresa_id, then it is a normal user
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    
    # Determine permissions and profile status
    profile_status = "active"
    permissions = {}
    
    if user.role == "admin":
        # Admins get all permissions from Profile schema
        permission_keys = [c.name for c in Profile.__table__.columns if c.name.startswith("can")]
        permissions = {key: True for key in permission_keys}
        permissions["isAdmin"] = True
    else:
        if not user.profileId:
            profile_status = "blocked"
        else:
            profile = db.query(Profile).filter(Profile.id == user.profileId).first()
            if not profile:
                profile_status = "blocked"
            else:
                permission_keys = [c.name for c in Profile.__table__.columns if c.name.startswith("can")]
                for key in permission_keys:
                    permissions[key] = getattr(profile, key, False)
        
        # Add special user-level flags
        permissions["isIntegrationApprover"] = user.isIntegrationApprover
    
    return {"type": "user", "data": user, "profileStatus": profile_status, "permissions": permissions}

def check_permission(permission_name: str):
    def permission_checker(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
        if current_user["type"] == "empresa":
            # Empresas have very limited access
            allowed_for_prestadora = [
                "can_view_dados", 
                "can_upload_docs", 
                "canEditFuncionarios", 
                "canDeleteFuncionarios",
                "canCreateFuncionarios",
                "canViewFuncionarios"
            ]
            if permission_name in allowed_for_prestadora:
                return current_user
            raise HTTPException(status_code=403, detail="Permission denied for external users")
        
        user = current_user["data"]
        if user.role == "admin":
            return current_user
        
        if not user.profileId:
            raise HTTPException(status_code=403, detail="User has no profile assigned")
            
        profile = db.query(Profile).filter(Profile.id == user.profileId).first()
        if not profile:
            raise HTTPException(status_code=403, detail="Profile not found")
            
        # Dynamically check the attribute on the profile object
        # The permission names in the DB are camelCase (e.g., canViewDocs)
        permission_attr = permission_name
        if hasattr(profile, permission_attr):
            if getattr(profile, permission_attr):
                return current_user
            
        raise HTTPException(status_code=403, detail=f"User does not have {permission_name} permission")
    return permission_checker

def check_integration_approver(current_user: dict = Depends(get_current_user)):
    if current_user["type"] == "user":
        if current_user["permissions"].get("isAdmin"):
            return current_user
        if current_user["permissions"].get("isIntegrationApprover"):
            return current_user
    raise HTTPException(status_code=403, detail="Apenas aprovadores de integração podem realizar esta ação")
