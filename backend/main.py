import os
from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Form, Body, Response, Request
from sqlalchemy.orm import Session
import models
from models import SessionLocal, engine, Empresa, Contrato, Documento, User, Profile
from auth import create_access_token, get_current_user, check_permission, get_db, verify_google_token, check_integration_approver
from services import ReportingService
from pydantic import BaseModel
from typing import List, Optional, Generic, TypeVar

T = TypeVar('T')

from datetime import datetime, timedelta
from fastapi.middleware.cors import CORSMiddleware
import hashlib
import re
from pydantic import field_validator
from typing import Any
import json

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Gestão de Contratos API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper para obter status atual do funcionário
def get_current_status(db: Session, funcionario_id: int):
    return db.query(models.StatusFuncionario).filter(models.StatusFuncionario.funcionarioId == funcionario_id).order_by(models.StatusFuncionario.id.desc()).first()

def get_authorized_categories(current_user: dict, db: Session):
    """
    Returns a list of category IDs authorized for the user's profile.
    If the user is admin, returns None (no restriction).
    For other internal users, returns the list of authorized category IDs.
    Defaults to an empty list (no access) if no rules are defined for the profile.
    """
    if current_user["type"] != "user":
        return None
    
    user = current_user["data"]
    if user.role == "admin":
        return None
    
    if not user.profileId:
        return []

    # Get categories linked to this profile in the Cubos table (Approval Rules)
    cubos = db.query(models.Cubo).all()
    authorized_ids = []
    
    import json
    for cubo in cubos:
        try:
            profile_ids = json.loads(cubo.perfilIds) if cubo.perfilIds else []
            if user.profileId in profile_ids:
                cat_ids = json.loads(cubo.categoriaIds) if cubo.categoriaIds else []
                authorized_ids.extend(cat_ids)
        except (json.JSONDecodeError, TypeError):
            continue
            
    # Return the unique list of authorized category IDs.
    # If empty, the user will see no documents.
    return list(set(authorized_ids))

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic Schemas
class EmpresaBase(BaseModel):
    nome: str
    loginName: Optional[str] = None
    cnpj: str
    departamento: str
    chave: str
    status: Optional[str] = "ATIVA"

    @field_validator('loginName')
    @classmethod
    def validate_login_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not re.match(r'^[a-z0-9_]+$', v):
            raise ValueError('Login name deve ser minúsculo, sem espaços ou caracteres especiais (apenas letras, números e underline)')
        return v

class EmpresaCreate(EmpresaBase):
    pass

class EmpresaResponse(EmpresaBase):
    id: int
    class Config:
        from_attributes = True

class ContratoBase(BaseModel):
    nome: str
    empresaId: int
    empresaNome: str
    dtInicio: datetime
    dtFim: datetime
    categoriaId: Optional[int] = None
    categoriaNome: Optional[str] = None
    status: Optional[str] = "ATIVO"

class ContratoResponse(ContratoBase):
    id: int
    class Config:
        from_attributes = True

class FuncionarioBase(BaseModel):
    nome: str
    empresaId: Optional[int] = None
    contratoId: Optional[int] = None
    statusIntegracao: Optional[str] = "PENDENTE"
    dataIntegracao: Optional[datetime] = None
    integracaoAprovadaManualmente: Optional[bool] = False
    empresaNome: Optional[str] = None
    contratoNome: Optional[str] = None
    
    # Campos de integração (agora vindo do StatusFuncionario)
    funcaoId: Optional[int] = None
    funcaoNome: Optional[str] = None
    cargoId: Optional[int] = None
    cargoNome: Optional[str] = None
    setorId: Optional[int] = None
    setorNome: Optional[str] = None
    unidadeIntegracaoId: Optional[int] = None
    unidadeIntegracaoNome: Optional[str] = None
    unidadeAtividadeId: Optional[int] = None
    unidadeAtividade: Optional[str] = None
    dataAso: Optional[datetime] = None
    dataValidadeASO: Optional[datetime] = None
    prazoAsoDias: Optional[int] = None
    prazoIntegracaoDias: Optional[int] = None
    dataValidadeIntegracao: Optional[datetime] = None
    statusIntegracaoCalculado: Optional[str] = None
    statusDocumentacao: Optional[str] = "PENDENTE"

class FuncionarioCreate(BaseModel):
    nome: str
    contratoId: int

class FuncionarioResponse(FuncionarioBase):
    id: int
    createdAt: datetime
    class Config:
        from_attributes = True

class AnexoFuncionarioResponse(BaseModel):
    id: int
    filename: str
    funcionarioId: int
    tipo: Optional[str] = None
    status: Optional[str] = None
    observacao: Optional[str] = None
    link: Optional[str] = None
    corrigido: Optional[bool] = False
    hash: str
    uploadDate: datetime
    funcionarioNome: Optional[str] = None

class ConfiguracaoResponse(BaseModel):
    id: int
    prazoAsoGeral: int
    prazoIntegracaoGeral: int
    diasParaConfirmarPresenca: int
    diasSemanaAgenda: str
    nomeEmpresa: str
    logoImage: Optional[str] = None
    dominioInterno: Optional[str] = None
    class Config:
        from_attributes = True

class ConfiguracaoUpdate(BaseModel):
    prazoAsoGeral: Optional[int] = None
    prazoIntegracaoGeral: Optional[int] = None
    diasParaConfirmarPresenca: Optional[int] = None
    diasSemanaAgenda: Optional[str] = None
    nomeEmpresa: Optional[str] = None
    logoImage: Optional[str] = None
    dominioInterno: Optional[str] = None
    class Config:
        from_attributes = True

class PaginatedResponse(BaseModel, Generic[T]):
    data: List[T]
    total: int
    page: int
    limit: int
    pages: int

class DocumentoResponse(BaseModel):
    id: int
    titulo: str
    data: str
    contratoId: int
    contratoNome: str
    empresaId: int
    empresaNome: str
    categoriaId: int
    categoriaNome: str
    status: str
    uploaded: bool
    versao: str
    email: str
    competencia: str
    funcionarioId: Optional[int] = None
    funcionarioNome: Optional[str] = None
    class Config:
        from_attributes = True

class AgendarIntegracaoRequest(BaseModel):
    funcionarioIds: List[int]
    data: datetime
    dataAso: datetime
    prazoAsoDias: int = 365
    prazoIntegracaoDias: int = 365
    justificativaAgendamento: Optional[str] = None
    contratoId: Optional[int] = None
    funcaoId: Optional[int] = None
    funcaoNome: Optional[str] = None
    cargoId: Optional[int] = None
    cargoNome: Optional[str] = None
    setorId: Optional[int] = None
    setorNome: Optional[str] = None
    unidadeIntegracaoId: Optional[int] = None
    unidadeIntegracao: Optional[str] = None
    unidadeAtividadeId: Optional[int] = None
    unidadeAtividade: Optional[str] = None

class AprovarIntegracaoManualRequest(BaseModel):
    dataAso: datetime
    prazoAsoDias: int
    prazoIntegracaoDias: int

class ConfirmarPresencaRequest(BaseModel):
    prazoIntegracaoDias: int = 365
    prazoAsoDias: Optional[int] = None # Permitir sobrescrever opcionalmente? Vou deixar so o integrado

class DocumentoExigidoFuncionarioCreate(BaseModel):
    nome: str
    contratoId: Optional[int] = None

class DocumentoExigidoFuncionarioResponse(BaseModel):
    id: int
    nome: str
    contratoId: Optional[int] = None
    createdAt: datetime
    class Config:
        from_attributes = True

class CuboSnapshotCreate(BaseModel):
    nome: str
    columns: List[str]
    filters: Optional[dict] = None
    dateFilterField: Optional[str] = None
    dateRangeStart: Optional[str] = None
    dateRangeEnd: Optional[str] = None

class CuboSnapshotUpdate(BaseModel):
    nome: Optional[str] = None
    columns: Optional[List[str]] = None
    filters: Optional[dict] = None
    dateFilterField: Optional[str] = None
    dateRangeStart: Optional[str] = None
    dateRangeEnd: Optional[str] = None

class CuboSnapshotResponse(BaseModel):
    id: int
    nome: str
    columns: List[str]
    filters: Optional[dict] = None
    dateFilterField: Optional[str] = None
    dateRangeStart: Optional[str] = None
    dateRangeEnd: Optional[str] = None
    userId: Optional[int] = None
    createdAt: datetime
    class Config:
        from_attributes = True

# Auth Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class PrestadoraLogin(BaseModel):
    identifier: str # Nome ou loginName
    chaveAcesso: str

class GoogleToken(BaseModel):
    token: str

# Routes
@app.post("/auth/google", response_model=Token)
async def google_auth(data: GoogleToken, db: Session = Depends(get_db)):
    config = db.query(models.Configuracao).first()
    dominio = config.dominioInterno if config else None
    
    google_user = verify_google_token(data.token, dominio_permitido=dominio)
    email = google_user.get("email")
    name = google_user.get("name")
    open_id = google_user.get("sub")

    # Check if user exists, otherwise create
    user = db.query(User).filter(User.openId == open_id).first()
    if not user:
        user = User(
            openId=open_id,
            name=name,
            email=email,
            loginMethod="google",
            role="user"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: PrestadoraLogin, db: Session = Depends(get_db)):
    # Tenta buscar por nome ou loginName
    empresa = db.query(Empresa).filter(
        ((Empresa.nome == form_data.identifier) | (Empresa.loginName == form_data.identifier)),
        Empresa.chave == form_data.chaveAcesso
    ).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect company name or access key",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": str(empresa.id), "empresa_id": str(empresa.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/me")
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return current_user

@app.get("/empresas", response_model=PaginatedResponse[EmpresaResponse])
def list_empresas(
    page: int = 1,
    limit: int = 10,
    db: Session = Depends(get_db), 
    current_user: dict = Depends(get_current_user)
):
    query = db.query(Empresa)
    
    # Pagination
    total = query.count()
    total_pages = (total + limit - 1) // limit
    offset = (page - 1) * limit
    
    results = query.offset(offset).limit(limit).all()
        
    return {
        "data": results,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": total_pages
    }

@app.post("/empresas", response_model=EmpresaResponse)
def create_empresa(empresa: EmpresaCreate, db: Session = Depends(get_db), current_user: dict = Depends(check_permission("canCreateEmpresas"))):
    db_empresa = Empresa(**empresa.model_dump())
    db.add(db_empresa)
    db.commit()
    db.refresh(db_empresa)
    return db_empresa

@app.put("/empresas/{empresa_id}", response_model=EmpresaResponse)
def update_empresa(empresa_id: int, empresa: EmpresaCreate, db: Session = Depends(get_db), current_user: dict = Depends(check_permission("canEditEmpresas"))):
    db_empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not db_empresa:
        raise HTTPException(status_code=404, detail="Empresa not found")
    
    old_status = db_empresa.status
    
    for key, value in empresa.model_dump().items():
        setattr(db_empresa, key, value)
    
    db.commit() # Commit first to save company changes

    # Cascade Inactivation if status changed to INATIVO
    if empresa.status == "INATIVO" and old_status != "INATIVO":
        # Find all employees of this company
        employees = db.query(models.Funcionario).filter(models.Funcionario.empresaId == empresa_id).all()
        
        for emp in employees:
            # Get latest status to copy other fields
            latest = db.query(models.StatusFuncionario).filter(
                models.StatusFuncionario.funcionarioId == emp.id
            ).order_by(models.StatusFuncionario.id.desc()).first()
            
            if latest and latest.statusContratual != "INATIVO":
                new_status = models.StatusFuncionario(
                    statusContratual="INATIVO",
                    statusIntegracao=latest.statusIntegracao,
                    funcionarioId=emp.id,
                    funcionarioNome=latest.funcionarioNome,
                    funcaoId=latest.funcaoId,
                    funcao=latest.funcao,
                    cargoId=latest.cargoId,
                    cargo=latest.cargo,
                    setorId=latest.setorId,
                    setor=latest.setor,
                    unidadeIntegracaoId=latest.unidadeIntegracaoId,
                    unidadeIntegracao=latest.unidadeIntegracao,
                    unidadeAtividadeId=latest.unidadeAtividadeId,
                    unidadeAtividade=latest.unidadeAtividade,
                    empresaId=latest.empresaId,
                    empresaNome=latest.empresaNome,
                    dataIntegracao=latest.dataIntegracao,
                    dataAso=latest.dataAso,
                    dataValidadeAso=latest.dataValidadeAso,
                    dataValidadeIntegracao=latest.dataValidadeIntegracao,
                    prazoAsoDias=latest.prazoAsoDias,
                    prazoIntegracaoDias=latest.prazoIntegracaoDias,
                    contratoId=latest.contratoId,
                    contratoNome=latest.contratoNome,
                    versao=latest.versao,
                    data=datetime.now(),
                    tipo="modificacao_automatica_empresa"
                )
                db.add(new_status)
        db.commit()

    db.refresh(db_empresa)
    return db_empresa

@app.delete("/empresas/{empresa_id}")
def delete_empresa(empresa_id: int, db: Session = Depends(get_db), current_user: dict = Depends(check_permission("canDeleteEmpresas"))):
    db_empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not db_empresa:
        raise HTTPException(status_code=404, detail="Empresa not found")
    db.delete(db_empresa)
    db.commit()
    return {"message": "Empresa deleted"}

# Users & Profiles
@app.get("/users")
def list_users(db: Session = Depends(get_db), current_user: dict = Depends(check_permission("canViewUsers"))):
    return db.query(models.User).all()

@app.post("/users")
def create_user(user: dict, db: Session = Depends(get_db), current_user: dict = Depends(check_permission("canCreateUsers"))):
    db_user = models.User(**user)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.put("/users/{user_id}")
def update_user(user_id: int, user: dict, db: Session = Depends(get_db), current_user: dict = Depends(check_permission("canEditUsers"))):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    for key, value in user.items():
        if hasattr(db_user, key):
            setattr(db_user, key, value)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: dict = Depends(check_permission("canDeleteUsers"))):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(db_user)
    db.commit()
    return {"message": "User deleted"}

@app.patch("/users/{user_id}/toggle-approver")
def toggle_user_approver(user_id: int, db: Session = Depends(get_db), current_user: dict = Depends(check_permission("canEditUsers"))):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.isIntegrationApprover = not user.isIntegrationApprover
    db.commit()
    return user

@app.get("/profiles")
def list_profiles(db: Session = Depends(get_db), current_user: dict = Depends(check_permission("canViewPerfis"))):
    return db.query(Profile).all()

@app.post("/profiles")
def create_profile(profile: dict, db: Session = Depends(get_db), current_user: dict = Depends(check_permission("canCreatePerfis"))):
    db_profile = Profile(**profile)
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_profile

@app.put("/profiles/{profile_id}")
def update_profile(profile_id: int, profile: dict, db: Session = Depends(get_db), current_user: dict = Depends(check_permission("canEditPerfis"))):
    db_profile = db.query(Profile).filter(Profile.id == profile_id).first()
    if not db_profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    # Exclude timestamp and id fields from update
    excluded_fields = {'id', 'createdAt', 'updatedAt'}
    for key, value in profile.items():
        if key not in excluded_fields and hasattr(db_profile, key):
            setattr(db_profile, key, value)
    
    db.commit()
    db.refresh(db_profile)
    return db_profile

@app.delete("/profiles/{profile_id}")
def delete_profile(profile_id: int, db: Session = Depends(get_db), current_user: dict = Depends(check_permission("canDeletePerfis"))):
    db_profile = db.query(Profile).filter(Profile.id == profile_id).first()
    if not db_profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    db.delete(db_profile)
    db.commit()
    return {"message": "Profile deleted"}

# Contratos
@app.get("/contratos", response_model=PaginatedResponse[ContratoResponse])
def list_contratos(
    page: int = 1,
    limit: int = 10,
    db: Session = Depends(get_db), 
    current_user: dict = Depends(get_current_user)
):
    query = db.query(Contrato)
    
    if current_user["type"] == "empresa":
        query = query.filter(Contrato.empresaId == current_user["data"].id)
    
    # Pagination
    total = query.count()
    total_pages = (total + limit - 1) // limit
    offset = (page - 1) * limit
    
    results = query.offset(offset).limit(limit).all()
        
    return {
        "data": results,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": total_pages
    }

@app.post("/contratos", response_model=ContratoResponse)
def create_contrato(contrato: ContratoBase, db: Session = Depends(get_db), current_user: dict = Depends(check_permission("canCreateContratos"))):
    db_contrato = Contrato(**contrato.model_dump())
    db.add(db_contrato)
    db.commit()
    db.refresh(db_contrato)
    return db_contrato

@app.put("/contratos/{contrato_id}", response_model=ContratoResponse)
def update_contrato(contrato_id: int, contrato: ContratoBase, db: Session = Depends(get_db), current_user: dict = Depends(check_permission("canEditContratos"))):
    db_contrato = db.query(Contrato).filter(Contrato.id == contrato_id).first()
    if not db_contrato:
        raise HTTPException(status_code=404, detail="Contrato not found")
    
    old_status = db_contrato.status

    update_data = contrato.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_contrato, key, value)
        
    db.commit()
    
    # Cascade Inactivation
    if contrato.status == "INATIVO" and old_status != "INATIVO":
        employees = db.query(models.Funcionario).filter(models.Funcionario.contratoId == contrato_id).all()
        
        for emp in employees:
            latest = db.query(models.StatusFuncionario).filter(
                models.StatusFuncionario.funcionarioId == emp.id
            ).order_by(models.StatusFuncionario.id.desc()).first()
            
            if latest and latest.statusContratual != "INATIVO":
                new_status = models.StatusFuncionario(
                    statusContratual="INATIVO",
                    statusIntegracao=latest.statusIntegracao,
                    funcionarioId=emp.id,
                    funcionarioNome=latest.funcionarioNome,
                    funcaoId=latest.funcaoId,
                    funcao=latest.funcao,
                    cargoId=latest.cargoId,
                    cargo=latest.cargo,
                    setorId=latest.setorId,
                    setor=latest.setor,
                    unidadeIntegracaoId=latest.unidadeIntegracaoId,
                    unidadeIntegracao=latest.unidadeIntegracao,
                    unidadeAtividadeId=latest.unidadeAtividadeId,
                    unidadeAtividade=latest.unidadeAtividade,
                    empresaId=latest.empresaId,
                    empresaNome=latest.empresaNome,
                    dataIntegracao=latest.dataIntegracao,
                    dataAso=latest.dataAso,
                    dataValidadeAso=latest.dataValidadeAso,
                    dataValidadeIntegracao=latest.dataValidadeIntegracao,
                    prazoAsoDias=latest.prazoAsoDias,
                    prazoIntegracaoDias=latest.prazoIntegracaoDias,
                    contratoId=latest.contratoId,
                    contratoNome=latest.contratoNome,
                    versao=latest.versao,
                    data=datetime.now(),
                    tipo="modificacao_automatica_contrato"
                )
                db.add(new_status)
        db.commit()

    db.refresh(db_contrato)
    return db_contrato

@app.delete("/contratos/{contrato_id}")
def delete_contrato(contrato_id: int, db: Session = Depends(get_db), current_user: dict = Depends(check_permission("canDeleteContratos"))):
    db_contrato = db.query(Contrato).filter(Contrato.id == contrato_id).first()
    if not db_contrato:
        raise HTTPException(status_code=404, detail="Contrato not found")
    db.delete(db_contrato)
    db.commit()
    return {"message": "Contrato deleted"}

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Gestão de Contratos API is running"}

# Documentos
@app.get("/documentos", response_model=PaginatedResponse[DocumentoResponse])
def list_documentos(
    page: int = 1,
    limit: int = 10,
    db: Session = Depends(get_db), 
    current_user: dict = Depends(get_current_user)
):
    query = db.query(models.Documento)
    
    if current_user["type"] == "empresa":
        query = query.filter(models.Documento.empresaId == current_user["data"].id)
    else:
        # Check for category restrictions based on profile (Cubo)
        auth_categories = get_authorized_categories(current_user, db)
        if auth_categories is not None:
            query = query.filter(models.Documento.categoriaId.in_(auth_categories))
    
    # Pagination
    total = query.count()
    total_pages = (total + limit - 1) // limit
    offset = (page - 1) * limit
    
    results = query.offset(offset).limit(limit).all()
        
    return {
        "data": results,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": total_pages
    }

@app.get("/contratos/{contrato_id}/documentos-exigidos")
def get_contrato_documentos_exigidos(contrato_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    contrato = db.query(models.Contrato).filter(models.Contrato.id == contrato_id).first()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato not found")
        
    if not contrato.categoriaId:
        return []
        
    categoria = db.query(models.Categoria).filter(models.Categoria.id == contrato.categoriaId).first()
    if not categoria:
        return []
        
    # converter "Doc 1|Doc 2" em lista
    docs = []
    if categoria.documentosPedidos:
        if "|" in categoria.documentosPedidos:
            docs = [d.strip() for d in categoria.documentosPedidos.split("|")]
        else:
            docs = [d.strip() for d in categoria.documentosPedidos.split(",")]
            
    return docs

@app.post("/documentos")
async def create_documento(
    titulo: str = Form(...), 
    data: str = Form(default=datetime.now().strftime("%Y-%m-%d")), 
    contratoId: str = Form(...), 
    contratoNome: str = Form(...),
    empresaId: str = Form(...),
    empresaNome: str = Form(...),
    categoriaId: Optional[str] = Form(None),
    categoriaNome: Optional[str] = Form(None),
    email: str = Form(...),
    competencia: str = Form(...),
    funcionarioId: Optional[str] = Form(None),
    funcionarioNome: Optional[str] = Form(None),
    file: UploadFile = File(...),
    obs: Optional[str] = Form(None),
    db: Session = Depends(get_db), 
    current_user: dict = Depends(get_current_user)
):
    # Convert IDs safely
    c_id = int(contratoId) if contratoId and contratoId.isdigit() else 0
    e_id = int(empresaId) if empresaId and empresaId.isdigit() else 0
    cat_id = int(categoriaId) if categoriaId and categoriaId.isdigit() else 0
    f_id = int(funcionarioId) if funcionarioId and funcionarioId.isdigit() else None

    # Check for existing document
    db_doc = db.query(Documento).filter(
        Documento.titulo == titulo,
        Documento.contratoId == c_id,
        Documento.competencia == competencia,
        Documento.empresaId == e_id
    ).first()

    if db_doc:
        # Update existing
        db_doc.data = data
        db_doc.status = "CORRIGIDO"
        db_doc.uploaded = True
        
        # Record in history
        db_aprovacao = models.Aprovacao(
            perfilId=0,
            perfilNome="PRESTADORA",
            documentoId=db_doc.id,
            obs=obs or "Documento re-enviado",
            data=datetime.now().strftime("%Y-%m-%d %H:%M"),
            status="CORRIGIDO"
        )
        db.add(db_aprovacao)
    else:
        # Create new
        db_doc = Documento(
            titulo=titulo, 
            data=data, 
            contratoId=c_id, 
            contratoNome=contratoNome,
            empresaId=e_id, 
            empresaNome=empresaNome, 
            categoriaId=cat_id,
            categoriaNome=categoriaNome or "", 
            email=email, 
            competencia=competencia,
            funcionarioId=f_id, 
            funcionarioNome=funcionarioNome,
            status="AGUARDANDO", 
            uploaded=True
        )
        db.add(db_doc)
    
    db.commit()
    db.refresh(db_doc)
    
    file_content = await file.read()
    
    # Check for existing anexo
    db_anexo = db.query(models.Anexo).filter(models.Anexo.documentoId == db_doc.id).first()
    if db_anexo:
        db_anexo.filename = file.filename
        db_anexo.data = file_content
        db_anexo.hash = hashlib.md5(file_content).hexdigest()
    else:
        db_anexo = models.Anexo(
            filename=file.filename,
            documentoId=db_doc.id,
            data=file_content,
            hash=hashlib.md5(file_content).hexdigest()
        )
        db.add(db_anexo)
        
    db.commit()
    return db_doc

@app.delete("/documentos/{documento_id}")
def delete_documento(documento_id: int, db: Session = Depends(get_db), current_user: dict = Depends(check_permission("canDeleteDocs"))):
    db_doc = db.query(Documento).filter(Documento.id == documento_id).first()
    if not db_doc:
        raise HTTPException(status_code=404, detail="Documento not found")
    db.delete(db_doc)
    db.commit()
    return {"message": "Documento deleted"}

@app.patch("/documentos/{documento_id}/status")
async def update_documento_status(
    documento_id: int, 
    status: str = Body(..., embed=True), 
    obs: str = Body("", embed=True),
    db: Session = Depends(get_db), 
    current_user: dict = Depends(check_permission("canApproveDocs"))
):
    db_doc = db.query(Documento).filter(Documento.id == documento_id).first()
    if not db_doc:
        raise HTTPException(status_code=404, detail="Documento not found")
    db_doc.status = status
    if status == "NAO_APROVADO":
        db_doc.reprovadoPor = current_user["data"].name
    
    # Record approval in Aprovacao table
    user_profile_name = "Admin"
    user_profile_id = 0
    if current_user["type"] == "user" and hasattr(current_user["data"], "profileId"):
        user_profile_id = current_user["data"].profileId or 0
        # Try to get profile name
        profile = db.query(Profile).filter(Profile.id == user_profile_id).first()
        user_profile_name = profile.name if profile else "Sem Perfil"
    
    db_aprovacao = models.Aprovacao(
        perfilId=user_profile_id,
        perfilNome=user_profile_name,
        documentoId=documento_id,
        obs=obs,
        data=datetime.now().strftime("%Y-%m-%d %H:%M"),
        status=status
    )
    db.add(db_aprovacao)
    db.commit()
    return db_doc

@app.patch("/documentos/{documento_id}/justificar")
async def justificar_documento(
    documento_id: int,
    obs: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    db_doc = db.query(Documento).filter(Documento.id == documento_id).first()
    if not db_doc:
        raise HTTPException(status_code=404, detail="Documento not found")
    
    db_doc.status = "PENDENTE"
    
    # Record in history
    db_aprovacao = models.Aprovacao(
        perfilId=0,
        perfilNome="PRESTADORA",
        documentoId=documento_id,
        obs=obs,
        data=datetime.now().strftime("%Y-%m-%d %H:%M"),
        status="PENDENTE"
    )
    db.add(db_aprovacao)
    db.commit()
    return db_doc

@app.get("/documentos/{documento_id}/aprovacoes")
def get_documento_aprovacoes(documento_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return db.query(models.Aprovacao).filter(models.Aprovacao.documentoId == documento_id).order_by(models.Aprovacao.createdAt.desc()).all()

# Processos e Categorias
@app.get("/tipos-processo")
def list_tipos_processo(db: Session = Depends(get_db)):
    return db.query(models.TipoProcesso).all()

@app.post("/tipos-processo")
def create_tipo_processo(processo: dict, db: Session = Depends(get_db), current_user: dict = Depends(check_permission("canCreateTipoProcesso"))):
    db_proc = models.TipoProcesso(**processo)
    db.add(db_proc)
    db.commit()
    db.refresh(db_proc)
    return db_proc

@app.delete("/tipos-processo/{processo_id}")
def delete_tipo_processo(processo_id: int, db: Session = Depends(get_db), current_user: dict = Depends(check_permission("canDeleteTipoProcesso"))):
    db_proc = db.query(models.TipoProcesso).filter(models.TipoProcesso.id == processo_id).first()
    if not db_proc:
        raise HTTPException(status_code=404, detail="Processo not found")
    db.delete(db_proc)
    db.commit()
    return {"message": "Processo deleted"}

@app.get("/categorias")
def list_categorias(db: Session = Depends(get_db)):
    return db.query(models.Categoria).all()

@app.post("/categorias")
def create_categoria(categoria: dict, db: Session = Depends(get_db), current_user: dict = Depends(check_permission("canCreateCategorias"))):
    db_cat = models.Categoria(**categoria)
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return db_cat

@app.put("/categorias/{categoria_id}")
def update_categoria(categoria_id: int, categoria: dict, db: Session = Depends(get_db), current_user: dict = Depends(check_permission("canEditCategorias"))):
    db_cat = db.query(models.Categoria).filter(models.Categoria.id == categoria_id).first()
    if not db_cat:
        raise HTTPException(status_code=404, detail="Categoria not found")
    for key, value in categoria.items():
        if hasattr(db_cat, key):
            setattr(db_cat, key, value)
    db.commit()
    db.refresh(db_cat)
    return db_cat

@app.delete("/categorias/{categoria_id}")
def delete_categoria(categoria_id: int, db: Session = Depends(get_db), current_user: dict = Depends(check_permission("canDeleteCategorias"))):
    db_cat = db.query(models.Categoria).filter(models.Categoria.id == categoria_id).first()
    if not db_cat:
        raise HTTPException(status_code=404, detail="Categoria not found")
    db.delete(db_cat)
    db.commit()
    return {"message": "Categoria deleted"}

# --- Novos Catálogos ---

# Funções
@app.get("/funcoes")
def list_funcoes(db: Session = Depends(get_db)):
    return db.query(models.Funcao).filter(models.Funcao.active == True).all()

@app.post("/funcoes")
def create_funcao(item: dict, db: Session = Depends(get_db), current_user: dict = Depends(check_permission("canCreateFuncoes"))):
    db_item = models.Funcao(**item)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.delete("/funcoes/{item_id}")
def delete_funcao(item_id: int, db: Session = Depends(get_db), current_user: dict = Depends(check_permission("canDeleteFuncoes"))):
    item = db.query(models.Funcao).filter(models.Funcao.id == item_id).first()
    if not item: raise HTTPException(status_code=404, detail="Not found")
    item.active = False
    db.commit()
    return {"message": "Deleted"}

# Cargos
@app.get("/cargos")
def list_cargos(db: Session = Depends(get_db)):
    return db.query(models.Cargo).filter(models.Cargo.active == True).all()

@app.post("/cargos")
def create_cargo(item: dict, db: Session = Depends(get_db), current_user: dict = Depends(check_permission("canCreateCargos"))):
    db_item = models.Cargo(**item)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.delete("/cargos/{item_id}")
def delete_cargo(item_id: int, db: Session = Depends(get_db), current_user: dict = Depends(check_permission("canDeleteCargos"))):
    item = db.query(models.Cargo).filter(models.Cargo.id == item_id).first()
    if not item: raise HTTPException(status_code=404, detail="Not found")
    item.active = False
    db.commit()
    return {"message": "Deleted"}

# Setores
@app.get("/setores")
def list_setores(db: Session = Depends(get_db)):
    return db.query(models.Setor).filter(models.Setor.active == True).all()

@app.post("/setores")
def create_setor(item: dict, db: Session = Depends(get_db), current_user: dict = Depends(check_permission("canCreateSetores"))):
    db_item = models.Setor(**item)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.delete("/setores/{item_id}")
def delete_setor(item_id: int, db: Session = Depends(get_db), current_user: dict = Depends(check_permission("canDeleteSetores"))):
    item = db.query(models.Setor).filter(models.Setor.id == item_id).first()
    if not item: raise HTTPException(status_code=404, detail="Not found")
    item.active = False
    db.commit()
    return {"message": "Deleted"}

# Unidades de Integração
@app.get("/unidades-integracao")
def list_unidades_integracao(db: Session = Depends(get_db)):
    return db.query(models.UnidadeIntegracao).filter(models.UnidadeIntegracao.active == True).all()

@app.post("/unidades-integracao")
def create_unidade_integracao(item: dict, db: Session = Depends(get_db), current_user: dict = Depends(check_permission("canCreateUnidadesIntegracao"))):
    db_item = models.UnidadeIntegracao(**item)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.delete("/unidades-integracao/{item_id}")
def delete_unidade_integracao(item_id: int, db: Session = Depends(get_db), current_user: dict = Depends(check_permission("canDeleteUnidadesIntegracao"))):
    item = db.query(models.UnidadeIntegracao).filter(models.UnidadeIntegracao.id == item_id).first()
    if not item: raise HTTPException(status_code=404, detail="Not found")
    item.active = False
    db.commit()
    return {"message": "Deleted"}

# Logs
@app.get("/logs")
def list_logs(db: Session = Depends(get_db), current_user: dict = Depends(check_permission("canViewLogs"))):
    return db.query(models.Log).order_by(models.Log.date.desc()).limit(100).all()

# Cubo (Regras de Aprovação)
@app.get("/cubos")
def list_cubos(db: Session = Depends(get_db), current_user: dict = Depends(check_permission("canViewRegrasAprovacao"))):
    return db.query(models.Cubo).all()

@app.post("/cubos")
def create_cubo(cubo: dict, db: Session = Depends(get_db), current_user: dict = Depends(check_permission("canCreateRegrasAprovacao"))):
    import json
    # Serialize lists to JSON strings
    if "categoriaIds" in cubo and isinstance(cubo["categoriaIds"], list):
        cubo["categoriaIds"] = json.dumps(cubo["categoriaIds"])
    if "perfilIds" in cubo and isinstance(cubo["perfilIds"], list):
        cubo["perfilIds"] = json.dumps(cubo["perfilIds"])
    
    # Ensure they are strings even if missing (though the error says they are None)
    if "categoriaIds" not in cubo or cubo["categoriaIds"] is None:
        cubo["categoriaIds"] = "[]"
    if "perfilIds" not in cubo or cubo["perfilIds"] is None:
        cubo["perfilIds"] = "[]"
        
    db_cubo = models.Cubo(**cubo)
    db.add(db_cubo)
    db.commit()
    return db_cubo

@app.delete("/cubos/{cubo_id}")
def delete_cubo(cubo_id: int, db: Session = Depends(get_db), current_user: dict = Depends(check_permission("canDeleteRegrasAprovacao"))):
    db_cubo = db.query(models.Cubo).filter(models.Cubo.id == cubo_id).first()
    if not db_cubo:
        raise HTTPException(status_code=404, detail="Cubo not found")
    db.delete(db_cubo)
    db.commit()
    return {"message": "Cubo deleted"}

@app.put("/cubos/{cubo_id}")
def update_cubo(cubo_id: int, cubo: dict, db: Session = Depends(get_db), current_user: dict = Depends(check_permission("canEditRegrasAprovacao"))):
    import json
    db_cubo = db.query(models.Cubo).filter(models.Cubo.id == cubo_id).first()
    if not db_cubo:
        raise HTTPException(status_code=404, detail="Cubo not found")
    
    excluded_fields = {'id', 'createdAt', 'updatedAt'}
    for key, value in cubo.items():
        if key in excluded_fields:
            continue
        if key in ["categoriaIds", "perfilIds"] and isinstance(value, list):
            value = json.dumps(value)
        if hasattr(db_cubo, key):
            setattr(db_cubo, key, value)
    
    db.commit()
    db.refresh(db_cubo)
    return db_cubo

@app.post("/relatorios/seed-teste")
def seed_test_reports(db: Session = Depends(get_db)):
    # 1. Unidades de Integração
    units = ["Unidade Sede - Central", "Unidade Industrial - Setor A"]
    db_units = []
    for u_name in units:
        unit = db.query(models.UnidadeIntegracao).filter(models.UnidadeIntegracao.nome == u_name).first()
        if not unit:
            unit = models.UnidadeIntegracao(nome=u_name)
            db.add(unit)
            db.commit()
            db.refresh(unit)
        db_units.append(unit)

    # 2. Catalogs (Funções, Cargos, Setores)
    funcoes = ["Eletricista", "Mecânico", "Ajudante", "Administrativo"]
    db_funcoes = []
    for f_name in funcoes:
        f = db.query(models.Funcao).filter(models.Funcao.nome == f_name).first()
        if not f:
            f = models.Funcao(nome=f_name)
            db.add(f)
            db.commit()
            db.refresh(f)
        db_funcoes.append(f)

    cargos = ["Pleno", "Sênior", "Auxiliar", "Coordenador"]
    db_cargos = []
    for c_name in cargos:
        c = db.query(models.Cargo).filter(models.Cargo.nome == c_name).first()
        if not c:
            c = models.Cargo(nome=c_name)
            db.add(c)
            db.commit()
            db.refresh(c)
        db_cargos.append(c)

    setores = ["Manutenção", "Produção", "Financeiro", "Segurança"]
    db_setores = []
    for s_name in setores:
        s = db.query(models.Setor).filter(models.Setor.nome == s_name).first()
        if not s:
            s = models.Setor(nome=s_name)
            db.add(s)
            db.commit()
            db.refresh(s)
        db_setores.append(s)

    # 3. Empresas e Contratos
    empresas_data = [
        {"nome": "Tech Services Ltda", "cnpj": "11.111.111/0001-11", "departamento": "TI"},
        {"nome": "Construtora Horizonte", "cnpj": "22.222.222/0001-22", "departamento": "Obras"}
    ]
    db_empresas = []
    for e_info in empresas_data:
        emp = db.query(models.Empresa).filter(models.Empresa.nome == e_info["nome"]).first()
        if not emp:
            emp = models.Empresa(**e_info, status="ATIVA", chave=str(hash(e_info["nome"])))
            db.add(emp)
            db.commit()
            db.refresh(emp)
        db_empresas.append(emp)

    # Contratos
    for i, emp in enumerate(db_empresas):
        cont = db.query(models.Contrato).filter(models.Contrato.empresaId == emp.id).first()
        if not cont:
            cont = models.Contrato(
                nome=f"CONTRATO-{emp.nome[:3].upper()}-2024",
                empresaId=emp.id,
                empresaNome=emp.nome,
                dtInicio=datetime.now(),
                dtFim=datetime.now() + timedelta(days=365)
            )
            db.add(cont)
            db.commit()

    # 4. Funcionários e Status
    # Vamos criar funcionários com datas de integração variadas
    import random
    names = ["João Silva", "Maria Santos", "Pedro Almeida", "Ana Costa", "Carlos Souza", 
             "Juliana Lima", "Ricardo Oliveira", "Fernanda Rocha", "Lucas Mendes", "Beatriz Farias"]
    
    # Datas para testar o filtro de período
    base_date = datetime.now()
    dates = [
        base_date - timedelta(days=5),  # Passado recente
        base_date,                      # Hoje
        base_date + timedelta(days=2),  # Futuro próximo
        base_date + timedelta(days=10)  # Futuro distante
    ]

    for i, name in enumerate(names):
        emp = db_empresas[i % len(db_empresas)]
        cont = db.query(models.Contrato).filter(models.Contrato.empresaId == emp.id).first()
        
        # Criar Funcionário se não existir
        func = db.query(models.Funcionario).filter(models.Funcionario.nome == name).first()
        if not func:
            func = models.Funcionario(
                nome=name,
                empresaId=emp.id,
                contratoId=cont.id if cont else None
            )
            
            db.add(func)
            db.commit()
            db.refresh(func)

        # Criar Status de Agendamento
        unit = db_units[i % len(db_units)]
        funcao = db_funcoes[i % len(db_funcoes)]
        cargo = db_cargos[i % len(db_cargos)]
        setor = db_setores[i % len(db_setores)]
        date_int = dates[i % len(dates)]
        
        status_val = "AGENDADA"
        if i % 3 == 0: status_val = "REALIZADA"
        if i % 5 == 0: status_val = "FALTOU"

        status_entry = models.StatusFuncionario(
            funcionarioId=func.id,
            funcionarioNome=func.nome,
            statusContratual="ATIVO",
            statusIntegracao=status_val,
            empresaId=emp.id,
            empresaNome=emp.nome,
            contratoId=cont.id if cont else None,
            contratoNome=cont.nome if cont else None,
            unidadeIntegracaoId=unit.id,
            unidadeIntegracao=unit.nome,
            funcaoId=funcao.id,
            funcao=funcao.nome,
            cargoId=cargo.id,
            cargo=cargo.nome,
            setorId=setor.id,
            setor=setor.nome,
            dataIntegracao=date_int,
            tipo="agendamento",
            data=datetime.now()
        )
        db.add(status_entry)
        
    db.commit()
    return {"message": "Test data for reports generated successfully", "count": len(names)}

# Relatórios
@app.get("/relatorios")
def list_relatorios(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return db.query(models.Relatorio).all()

@app.get("/relatorios/integracoes-agendadas")
def report_integracoes_agendadas(
    data_inicio: str, 
    data_fim: str, 
    unidade_id: Optional[str] = None, 
    empresa_id: Optional[str] = None,
    db: Session = Depends(get_db), 
    current_user: dict = Depends(get_current_user)
):
    # Permissão: Apenas usuários internos (ou admin) podem ver relatórios
    if current_user["type"] == "empresa":
        raise HTTPException(status_code=403, detail="Acesso restrito a usuários internos.")

    # Converte IDs de string para int se não forem vazios (evita 422)
    u_id = None
    if unidade_id and unidade_id.strip():
        u_id = int(unidade_id)
        
    e_id = None
    if empresa_id and empresa_id.strip():
        e_id = int(empresa_id)

    # Busca Configurações para Logo e Nome da Empresa
    config = db.query(models.Configuracao).first()
    if not config:
        config = models.Configuracao(nomeEmpresa="Gestão de Contratos")

    unidade_nome = ""
    if u_id:
         unidade = db.query(models.UnidadeIntegracao).filter(models.UnidadeIntegracao.id == u_id).first()
         if unidade:
             unidade_nome = unidade.nome

    # Query Data - Usando StatusFuncionario como base (histórico/agendamentos)
    query = db.query(
        models.StatusFuncionario.dataIntegracao.label("data_integracao"),
        models.StatusFuncionario.funcionarioNome.label("funcionario_nome"),
        models.StatusFuncionario.cargo.label("cargo_nome"),
        models.StatusFuncionario.setor.label("setor_nome"),
        models.StatusFuncionario.empresaNome.label("empresa_nome"),
        models.StatusFuncionario.unidadeIntegracao.label("unidade_nome")
    )

    # Filtros de Data
    try:
        dt_start = datetime.strptime(data_inicio, "%Y-%m-%d")
        # Ajusta data fim para o final do dia
        dt_end = datetime.strptime(data_fim, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
        query = query.filter(models.StatusFuncionario.dataIntegracao >= dt_start)
        query = query.filter(models.StatusFuncionario.dataIntegracao <= dt_end)
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de data inválido. Use AAAA-MM-DD")

    if u_id:
        query = query.filter(models.StatusFuncionario.unidadeIntegracaoId == u_id)
    
    if e_id:
        query = query.filter(models.StatusFuncionario.empresaId == e_id)

    # Filtra apenas registros do tipo 'agendamento' e statusIntegracao "AGENDADA" para o relatório de integrações agendadas
    query = query.filter(models.StatusFuncionario.tipo == 'agendamento')
    query = query.filter(models.StatusFuncionario.statusIntegracao == 'AGENDADA')
    
    results = query.order_by(models.StatusFuncionario.empresaNome, models.StatusFuncionario.dataIntegracao).all()

    if not results:
        raise HTTPException(status_code=404, detail="Nenhum registro encontrado para o período/filtros selecionados.")

    service = ReportingService(db)
    pdf_content = service.generate_scheduled_integration_pdf(results, config, data_inicio, data_fim, unidade_nome)

    filename = f"relatorio_integracoes_{data_inicio}_a_{data_fim}.pdf"
    
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

# Generic Pagination Schema
from typing import Generic, TypeVar
T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    data: List[T]
    total: int
    page: int
    limit: int
    pages: int

# Funcionários
@app.get("/funcionarios", response_model=PaginatedResponse[FuncionarioResponse])
def list_funcionarios(
    page: int = 1, 
    limit: int = 10,
    empresa_id: Optional[int] = None,
    contrato_id: Optional[int] = None, 
    db: Session = Depends(get_db), 
    current_user: dict = Depends(get_current_user)
):
    if current_user["type"] == "user":
        # Check permissions for internal users
        if not current_user["permissions"].get("isAdmin") and not current_user["permissions"].get("canViewFuncionarios"):
            raise HTTPException(status_code=403, detail="Você não tem permissão para visualizar funcionários")
            
    check_expirations(db)
    
    from sqlalchemy import func as sql_func
    
    # Subquery para pegar o ID do status mais recente de cada funcionário
    latest_status_ids = db.query(
        models.StatusFuncionario.funcionarioId,
        sql_func.max(models.StatusFuncionario.id).label('latest_id')
    ).group_by(models.StatusFuncionario.funcionarioId).subquery()
    
    query = db.query(
        models.Funcionario,
        models.Empresa.nome.label("empresaNome"),
        models.Contrato.nome.label("contratoNome"),
        models.StatusFuncionario
    ).outerjoin(
        models.Empresa, models.Funcionario.empresaId == models.Empresa.id
    ).outerjoin(
        models.Contrato, models.Funcionario.contratoId == models.Contrato.id
    ).outerjoin(
        latest_status_ids, models.Funcionario.id == latest_status_ids.c.funcionarioId
    ).outerjoin(
        models.StatusFuncionario, latest_status_ids.c.latest_id == models.StatusFuncionario.id
    )
    
    # Permission Filters
    if current_user["type"] == "empresa":
        query = query.filter(models.Funcionario.empresaId == current_user["data"].id)
        
    # Query Filters
    if empresa_id:
        query = query.filter(models.Funcionario.empresaId == empresa_id)
    if contrato_id:
        query = query.filter(models.Funcionario.contratoId == contrato_id)
    
    # Pagination Logic
    total = query.count()
    total_pages = (total + limit - 1) // limit
    offset = (page - 1) * limit
    
    results = query.limit(limit).offset(offset).all()
    
    funcionarios = []
    for func, emp_nome, cont_nome, status in results:
        # Mapeia dados básicos
        func.empresaNome = emp_nome
        func.contratoNome = cont_nome
        
        # Mapeia dados do Status mais recente (se existir)
        if status:
            func.statusIntegracao = status.statusIntegracao
            func.dataIntegracao = status.dataIntegracao
            # Outros campos detalhados
            func.funcaoId = status.funcaoId
            func.funcaoNome = status.funcao
            func.cargoId = status.cargoId
            func.cargoNome = status.cargo
            func.setorId = status.setorId
            func.setorNome = status.setor
            func.unidadeIntegracaoId = status.unidadeIntegracaoId
            func.unidadeIntegracaoNome = status.unidadeIntegracao
            func.unidadeAtividadeId = status.unidadeAtividadeId
            func.unidadeAtividade = status.unidadeAtividade
            func.dataAso = status.dataAso
            func.dataValidadeASO = status.dataValidadeAso
            func.prazoAsoDias = status.prazoAsoDias
            func.prazoIntegracaoDias = status.prazoIntegracaoDias
            func.dataValidadeIntegracao = status.dataValidadeIntegracao
            # integracaoAprovadaManualmente costuma ser True se houver Aprovação Inicial
            func.integracaoAprovadaManualmente = status.tipo == "Aprovação Inicial" or status.statusIntegracao == "REALIZADA"
            
            # Cálculo de status (simplificado para o response)
            func.statusIntegracaoCalculado = "VALIDO" if status.statusIntegracao == "REALIZADA" else "NAO_INTEGRADO"
            if status.statusIntegracao == "FALTOU": func.statusIntegracaoCalculado = "NAO_INTEGRADO"

        # Cálculo do Status de Documentação (Sempre reflete a realidade atual dos arquivos)
        # Use o endpoint de status documental para consistência
        status_docs = get_funcionario_status_documental(func.id, db)
        func.statusDocumentacao = "APROVADO" if status_docs["is_ready"] else "DOC.PENDENTE"

        funcionarios.append(func)
        
    return {
        "data": funcionarios,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": total_pages
    }

@app.post("/funcionarios", response_model=FuncionarioResponse)
def create_funcionario(funcionario: FuncionarioCreate, db: Session = Depends(get_db), current_user: dict = Depends(check_permission("canCreateFuncionarios"))):
    if current_user["type"] != "empresa":
        raise HTTPException(status_code=403, detail="Apenas prestadoras podem cadastrar funcionários")
    
    # Busca empresa para log
    empresa = db.query(models.Empresa).filter(models.Empresa.id == current_user["data"].id).first()
    
    db_func = models.Funcionario(
        nome=funcionario.nome, 
        empresaId=current_user["data"].id,
        contratoId=funcionario.contratoId
    )
    db.add(db_func)
    db.flush() # Para pegar o ID do funcionário antes do commit
    
    # Cria status inicial PENDENTE
    status_entry = models.StatusFuncionario(
        funcionarioId=db_func.id,
        funcionarioNome=db_func.nome,
        statusIntegracao="PENDENTE",
        empresaId=empresa.id,
        empresaNome=empresa.nome,
        contratoId=db_func.contratoId,
        data=datetime.now(),
        tipo="Criação"
    )
    db.add(status_entry)
    db.commit()
    db.refresh(db_func)
    
    # Popula status fake para o response inicial
    db_func.statusIntegracao = "PENDENTE"
    db_func.empresaNome = empresa.nome
    
    return db_func

@app.put("/funcionarios/{func_id}")
def update_funcionario(func_id: int, data: dict, db: Session = Depends(get_db), current_user: dict = Depends(check_permission("canEditFuncionarios"))):
    query = db.query(models.Funcionario).filter(models.Funcionario.id == func_id)
    if current_user["type"] == "empresa":
        query = query.filter(models.Funcionario.empresaId == current_user["data"].id)
    
    db_func = query.first()
    if not db_func:
        raise HTTPException(status_code=404, detail="Funcionario not found")
        
    for key, value in data.items():
        if hasattr(db_func, key):
            setattr(db_func, key, value)
    db.commit()
    db.refresh(db_func)
    return db_func

@app.delete("/funcionarios/{func_id}")
def delete_funcionario(func_id: int, db: Session = Depends(get_db), current_user: dict = Depends(check_permission("canDeleteFuncionarios"))):
    query = db.query(models.Funcionario).filter(models.Funcionario.id == func_id)
    if current_user["type"] == "empresa":
        query = query.filter(models.Funcionario.empresaId == current_user["data"].id)
        
    db_func = query.first()
    if not db_func:
        raise HTTPException(status_code=404, detail="Funcionario not found")
    
    # Deleta os anexos do funcionário e suas aprovações
    func_anexos = db.query(models.AnexoFuncionario).filter(models.AnexoFuncionario.funcionarioId == func_id).all()
    anexo_ids = [a.id for a in func_anexos]
    
    # Deleta as aprovações dos anexos
    if anexo_ids:
        db.query(models.Aprovacao).filter(models.Aprovacao.anexoFuncionarioId.in_(anexo_ids)).delete(synchronize_session=False)
    
    for func_anexo in func_anexos:
        db.delete(func_anexo)
    
    # Deleta os status do funcionário
    db.query(models.StatusFuncionario).filter(models.StatusFuncionario.funcionarioId == func_id).delete(synchronize_session=False)
    
    # Deleta o funcionário
    db.delete(db_func)
    db.commit()
    return {"message": "Funcionario deleted"}

# Configuração de Documentos Exigidos para Funcionários
@app.get("/documentos-exigidos-funcionario")
def list_docs_exigidos(contratoId: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(models.DocumentoExigidoFuncionario)
    if contratoId:
        from sqlalchemy import or_
        return query.filter(
            or_(
                models.DocumentoExigidoFuncionario.contratoId == None,
                models.DocumentoExigidoFuncionario.contratoId == contratoId
            )
        ).all()
    return query.all() # Retorna todos para configuração do gestor

@app.post("/documentos-exigidos-funcionario", response_model=DocumentoExigidoFuncionarioResponse)
def create_doc_exigido(doc: DocumentoExigidoFuncionarioCreate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    # Apenas usuários internos/gestores (não empresas prestadoras) podem configurar a lista
    if current_user["type"] == "empresa":
        raise HTTPException(status_code=403, detail="Apenas gestores podem configurar documentos exigidos")
        
    db_doc = models.DocumentoExigidoFuncionario(nome=doc.nome, contratoId=doc.contratoId)
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    return db_doc

@app.delete("/documentos-exigidos-funcionario/{doc_id}")
def delete_doc_exigido(doc_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["type"] == "empresa":
        raise HTTPException(status_code=403, detail="Apenas gestores podem configurar documentos exigidos")
        
    db_doc = db.query(models.DocumentoExigidoFuncionario).filter(models.DocumentoExigidoFuncionario.id == doc_id).first()
    if not db_doc:
        raise HTTPException(status_code=404, detail="Document not found")
    db.delete(db_doc)
    db.commit()
    return {"message": "Document deleted"}

# Anexos de Funcionários
@app.get("/funcionarios/documentos-todos", response_model=PaginatedResponse[AnexoFuncionarioResponse])
def list_todas_funcionario_docs(
    page: int = 1,
    limit: int = 10,
    db: Session = Depends(get_db), 
    current_user: dict = Depends(get_current_user)
):
    query = db.query(
        models.AnexoFuncionario.id,
        models.AnexoFuncionario.filename,
        models.AnexoFuncionario.funcionarioId,
        models.AnexoFuncionario.tipo,
        models.AnexoFuncionario.status,
        models.AnexoFuncionario.observacao,
        models.AnexoFuncionario.link,
        models.AnexoFuncionario.corrigido,
        models.AnexoFuncionario.hash,
        models.AnexoFuncionario.uploadDate,
        models.Funcionario.nome.label("funcionarioNome")
    ).join(
        models.Funcionario, models.AnexoFuncionario.funcionarioId == models.Funcionario.id
    )
    
    if current_user["type"] == "empresa":
        query = query.filter(models.Funcionario.empresaId == current_user["data"].id)
    else:
        # Check for category restrictions based on profile (Cubo)
        # For employee docs, the "tipo" is stored in AnexoFuncionario.tipo
        # We need to find if this "tipo" matches an authorized Categoria name
        auth_categories = get_authorized_categories(current_user, db)
        if auth_categories is not None:
            # Get names of authorized categories
            cat_names = db.query(models.Categoria.nome).filter(models.Categoria.id.in_(auth_categories)).all()
            authorized_names = [c[0] for c in cat_names]
            query = query.filter(models.AnexoFuncionario.tipo.in_(authorized_names))
    
    # Pagination
    total = query.count()
    total_pages = (total + limit - 1) // limit
    offset = (page - 1) * limit
    
    results = query.offset(offset).limit(limit).all()
        
    return {
        "data": results,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": total_pages
    }

@app.get("/funcionarios/{func_id}/documentos", response_model=List[AnexoFuncionarioResponse])
def list_funcionario_docs(func_id: int, db: Session = Depends(get_db)):
    return db.query(models.AnexoFuncionario).filter(models.AnexoFuncionario.funcionarioId == func_id).all()

@app.post("/funcionarios/{func_id}/documentos", response_model=AnexoFuncionarioResponse)
def upload_funcionario_doc(
    func_id: int, 
    tipo: str = Form(...), 
    file: UploadFile = File(...), 
    obs: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Prestadoras podem subir docs de seus funcionários
    # Gestores podem subir de qualquer um (ou restringimos)
    content = file.file.read()
    file_hash = hashlib.sha256(content).hexdigest()
    
    # Check for existing anexo
    db_anexo = db.query(models.AnexoFuncionario).filter(
        models.AnexoFuncionario.funcionarioId == func_id,
        models.AnexoFuncionario.tipo == tipo
    ).first()

    if db_anexo:
        db_anexo.filename = file.filename
        db_anexo.status = "CORRIGIDO"
        db_anexo.data = content
        db_anexo.hash = file_hash
        db_anexo.observacao = obs or db_anexo.observacao
    else:
        db_anexo = models.AnexoFuncionario(
            filename=file.filename,
            funcionarioId=func_id,
            tipo=tipo,
            status="AGUARDANDO",
            data=content,
            hash=file_hash,
            observacao=obs
        )
        db.add(db_anexo)
    
    db.commit()
    db.refresh(db_anexo)
    
    # Grava histórico
    perfil_nome = "PRESTADORA" if current_user["type"] == "empresa" else "GESTOR"
    db_aprovacao = models.Aprovacao(
        perfilId=0,
        perfilNome=perfil_nome,
        anexoFuncionarioId=db_anexo.id,
        obs=obs or ("Documento re-enviado" if db_anexo.status == "CORRIGIDO" else "Upload inicial"),
        data=datetime.now().strftime("%Y-%m-%d %H:%M"),
        status=db_anexo.status
    )
    db.add(db_aprovacao)
    db.commit()
    
    return db_anexo

@app.patch("/funcionarios/documentos/{anexo_id}/status", response_model=AnexoFuncionarioResponse)
def update_funcionario_doc_status(
    anexo_id: int, 
    status: str = Body(..., embed=True), 
    observacao: str = Body(None, embed=True), 
    db: Session = Depends(get_db),
    current_user: dict = Depends(check_integration_approver)
):
    if current_user["type"] == "empresa":
        raise HTTPException(status_code=403, detail="Apenas gestores podem validar documentos")
        
    db_anexo = db.query(models.AnexoFuncionario).filter(models.AnexoFuncionario.id == anexo_id).first()
    if not db_anexo:
        raise HTTPException(status_code=404, detail="Anexo not found")
        
    db_anexo.status = status
    if observacao is not None:
        db_anexo.observacao = observacao
    
    # Record history
    user_profile_name = "Admin"
    user_profile_id = 0
    if current_user["type"] == "user" and hasattr(current_user["data"], "profileId"):
        user_profile_id = current_user["data"].profileId or 0
        profile = db.query(models.Profile).filter(models.Profile.id == user_profile_id).first()
        user_profile_name = profile.name if profile else "Sem Perfil"
    
    db_aprovacao = models.Aprovacao(
        perfilId=user_profile_id,
        perfilNome=user_profile_name,
        anexoFuncionarioId=anexo_id,
        obs=observacao or "",
        data=datetime.now().strftime("%Y-%m-%d %H:%M"),
        status=status
    )
    db.add(db_aprovacao)
    db.commit()

    # Automatic Transition: If all docs are ready now, update general status
    status_docs = get_funcionario_status_documental(db_anexo.funcionarioId, db)
    if status_docs["is_ready"]:
        current_st = get_current_status(db, db_anexo.funcionarioId)
        if current_st and current_st.statusIntegracao == "APROVADO (COM DOCUMENTAÇÃO PENDENTE)":
            new_status = models.StatusFuncionario(
                funcionarioId=db_anexo.funcionarioId,
                funcionarioNome=current_st.funcionarioNome,
                statusIntegracao="APROVADO",
                data=datetime.now(),
                tipo="Aprovação Automática (Documentação Completa)",
                contratoId=current_st.contratoId,
                empresaId=current_st.empresaId
            )
            db.add(new_status)
            db.commit()

    return db_anexo

@app.patch("/funcionarios/documentos/{anexo_id}/justificar", response_model=AnexoFuncionarioResponse)
def justificar_funcionario_doc(
    anexo_id: int,
    obs: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    db_anexo = db.query(models.AnexoFuncionario).filter(models.AnexoFuncionario.id == anexo_id).first()
    if not db_anexo:
        raise HTTPException(status_code=404, detail="Anexo not found")
    
    db_anexo.status = "PENDENTE"
    db_anexo.observacao = obs
    
    db_aprovacao = models.Aprovacao(
        perfilId=0,
        perfilNome="PRESTADORA",
        anexoFuncionarioId=anexo_id,
        obs=obs,
        data=datetime.now().strftime("%Y-%m-%d %H:%M"),
        status="PENDENTE"
    )
    db.add(db_aprovacao)
    db.commit()
    db.refresh(db_anexo)
    return db_anexo

@app.get("/funcionarios/documentos/{anexo_id}/download")
def download_funcionario_doc(anexo_id: int, db: Session = Depends(get_db)):
    anexo = db.query(models.AnexoFuncionario).filter(models.AnexoFuncionario.id == anexo_id).first()
    if not anexo:
        raise HTTPException(status_code=404, detail="Anexo not found")
    
    return Response(
        content=anexo.data,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename={anexo.filename}"}
    )

@app.get("/funcionarios/documentos/{anexo_id}/aprovacoes")
def get_funcionario_doc_aprovacoes(anexo_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return db.query(models.Aprovacao).filter(models.Aprovacao.anexoFuncionarioId == anexo_id).order_by(models.Aprovacao.createdAt.desc()).all()

@app.get("/funcionarios/{func_id}/status-documental")
def get_funcionario_status_documental(func_id: int, db: Session = Depends(get_db)):
    func = db.query(models.Funcionario).filter(models.Funcionario.id == func_id).first()
    if not func:
        raise HTTPException(status_code=404, detail="Funcionario not found")
        
    from sqlalchemy import or_
    exigidos = db.query(models.DocumentoExigidoFuncionario).filter(
        or_(
            models.DocumentoExigidoFuncionario.contratoId == None,
            models.DocumentoExigidoFuncionario.contratoId == func.contratoId
        )
    ).all()
    
    anexos = db.query(models.AnexoFuncionario).filter(models.AnexoFuncionario.funcionarioId == func_id).all()
    
    status_map = {a.tipo: a.status for a in anexos}
    pendentes = []
    reprovados = []
    
    for req in exigidos:
        status = status_map.get(req.nome)
        if not status:
            pendentes.append(req.nome)
        elif status == "REPROVADO":
            reprovados.append(req.nome)
        elif status == "AGUARDANDO":
            pendentes.append(req.nome)
            
    is_ready = len(pendentes) == 0 and len(reprovados) == 0
    
    return {
        "is_ready": is_ready,
        "pendentes": pendentes,
        "reprovados": reprovados,
        "total_exigidos": len(exigidos),
        "total_enviados": len(anexos)
    }

@app.post("/funcionarios/agendar-integracao")
def agendar_integracao(request: AgendarIntegracaoRequest, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["type"] == "user":
        if not current_user["permissions"].get("isAdmin") and not current_user["permissions"].get("canEditFuncionarios"):
            raise HTTPException(status_code=403, detail="Você não tem permissão para agendar integrações")
    elif current_user["type"] != "empresa":
        raise HTTPException(status_code=403, detail="Apenas empresas ou gestores podem agendar integração")
        
    config = db.query(models.Configuracao).first()
    if not config:
        config = models.Configuracao()
        db.add(config)
        db.commit()
    
    # Validar dia da semana APENAS SE não houver justificativa
    if not request.justificativaAgendamento:
        allowed_days = config.diasSemanaAgenda.split(",")
        day_map = {0: "SEG", 1: "TER", 2: "QUA", 3: "QUI", 4: "SEX", 5: "SAB", 6: "DOM"}
        request_day = day_map.get(request.data.weekday())
        
        if request_day not in allowed_days:
            raise HTTPException(status_code=400, detail=f"Agendamento permitido apenas para os dias: {config.diasSemanaAgenda}. Informe uma justificativa para agendar em data extraordinária.")

    for fid in request.funcionarioIds:
        func = db.query(models.Funcionario).filter(models.Funcionario.id == fid, models.Funcionario.empresaId == current_user["data"].id).first()
        if not func:
            continue
            
        # Check document compliance and manual approval
        status_docs = get_funcionario_status_documental(fid, db)
        current_st = get_current_status(db, fid)
        
        # Aprovado Inicialmente ou Realizado permite agendar (caso de renovação ou re-agendamento)
        # Mas o prestador só pode agendar se is_ready for True OU se houver uma aprovação manual prévia
        pode_agendar = status_docs["is_ready"] or (current_st and current_st.tipo == "Aprovação Inicial")
        
        if not pode_agendar:
            raise HTTPException(
                status_code=400, 
                detail=f"Funcionário {func.nome} possui documentação pendente e não foi autorizado manualmente pelo gestor."
            )
            
        # Registrar Histórico no StatusFuncionario (Sendo o novo Source of Truth)
        contrato = None
        if request.contratoId:
            contrato = db.query(models.Contrato).filter(models.Contrato.id == request.contratoId).first()
            
        status_entry = models.StatusFuncionario(
            funcionarioId=func.id,
            funcionarioNome=func.nome,
            empresaId=current_user["data"].id,
            empresaNome=current_user["data"].nome,
            statusIntegracao="AGENDADA",
            dataIntegracao=request.data,
            contratoId=request.contratoId,
            contratoNome=contrato.nome if contrato else None,
            
            # Dados do ASO (Agora definidos no agendamento)
            dataAso=request.dataAso,
            prazoAsoDias=request.prazoAsoDias,
            prazoIntegracaoDias=request.prazoIntegracaoDias,
            justificativaAgendamento=request.justificativaAgendamento,

            # Detalhes
            funcaoId=request.funcaoId,
            funcao=request.funcaoNome,
            cargoId=request.cargoId,
            cargo=request.cargoNome,
            setorId=request.setorId,
            setor=request.setorNome,
            unidadeIntegracaoId=request.unidadeIntegracaoId,
            unidadeIntegracao=request.unidadeIntegracao,
            unidadeAtividadeId=request.unidadeAtividadeId,
            unidadeAtividade=request.unidadeAtividade,
            
            data=datetime.now(),
            tipo="agendamento"
        )
        db.add(status_entry)
        
    db.commit()
    return {"message": "Integração agendada com sucesso"}

@app.get("/funcionarios/{func_id}/historico-integracao")
def get_funcionario_historico(func_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    # Empresas só veem seus funcionários
    if current_user["type"] == "empresa":
        func = db.query(models.Funcionario).filter(models.Funcionario.id == func_id, models.Funcionario.empresaId == current_user["data"].id).first()
        if not func:
            raise HTTPException(status_code=403, detail="Acesso negado")
            
    return db.query(models.StatusFuncionario).filter(models.StatusFuncionario.funcionarioId == func_id).order_by(models.StatusFuncionario.data.desc()).all()

@app.post("/funcionarios/{func_id}/aprovar")
def aprovar_funcionario(func_id: int, db: Session = Depends(get_db), current_user: dict = Depends(check_integration_approver)):
    func = db.query(models.Funcionario).filter(models.Funcionario.id == func_id).first()
    if not func:
        raise HTTPException(status_code=404, detail="Funcionario not found")
        
    # Check document compliance
    status_docs = get_funcionario_status_documental(func_id, db)
    
    if status_docs["is_ready"]:
        hist_status = "APROVADO"
    elif hist_status != "APROVADO (COM DOCUMENTAÇÃO PENDENTE)":
        hist_status = "APROVADO (COM DOCUMENTAÇÃO PENDENTE)"
    else:
        return HTTPException(status_code=400, detail="Funcionario já foi aprovado")
        
    # Log the action (Sendo o novo Source of Truth)
    status_entry = models.StatusFuncionario(
        funcionarioId=func.id,
        funcionarioNome=func.nome,
        statusIntegracao=hist_status,
        data=datetime.now(),
        tipo="Aprovação Inicial",
        contratoId=func.contratoId
    )
    db.add(status_entry)
    db.commit()
    db.refresh(func)
    
    # Hidrata objeto de retorno para o frontend
    func.statusIntegracao = hist_status
    func.integracaoAprovadaManualmente = True
    
    return func

@app.post("/funcionarios/{func_id}/confirmar-presenca")
def confirmar_presenca_funcionario(func_id: int, request: ConfirmarPresencaRequest, db: Session = Depends(get_db), current_user: dict = Depends(check_integration_approver)):
    # Apenas usuários com a flag isIntegrationApprover podem confirmar presença
    if current_user["type"] != "user" or not current_user["data"].isIntegrationApprover:
        raise HTTPException(status_code=403, detail="Apenas aprovadores de integração podem confirmar presença")

    func = db.query(models.Funcionario).filter(models.Funcionario.id == func_id).first()
    if not func:
        raise HTTPException(status_code=404, detail="Funcionario not found")
    
    current_st = get_current_status(db, func_id)
    if not current_st or current_st.statusIntegracao != "AGENDADA":
        raise HTTPException(status_code=400, detail="Presença só pode ser confirmada se a integração estiver agendada.")
        
    from datetime import timedelta
    
    # Recupera dados do ASO definidos no agendamento
    data_aso = current_st.dataAso
    prazo_aso_dias = request.prazoAsoDias or current_st.prazoAsoDias or 365
    prazo_integracao_dias = request.prazoIntegracaoDias or current_st.prazoIntegracaoDias or 365

    if not data_aso:
        raise HTTPException(status_code=400, detail="Data do ASO não encontrada no agendamento.")

    # Calcula datas de validade
    data_validade_aso = data_aso + timedelta(days=prazo_aso_dias)
    data_validade_integracao = current_st.dataIntegracao + timedelta(days=prazo_integracao_dias)

    # Log the action WITH dates (Sendo o novo Source of Truth)
    log = models.StatusFuncionario(
        funcionarioId=func.id,
        funcionarioNome=func.nome,
        statusIntegracao="REALIZADA",
        data=datetime.now(),
        tipo="Presença Confirmada",
        # Dados de validade para o histórico
        dataIntegracao=current_st.dataIntegracao,
        dataAso=data_aso,
        dataValidadeAso=data_validade_aso,
        dataValidadeIntegracao=data_validade_integracao,
        prazoAsoDias=prazo_aso_dias,
        prazoIntegracaoDias=prazo_integracao_dias,
        # Infos contextuais preservadas do agendamento
        funcaoId=current_st.funcaoId,
        funcao=current_st.funcao,
        cargoId=current_st.cargoId,
        cargo=current_st.cargo,
        unidadeIntegracaoId=current_st.unidadeIntegracaoId,
        unidadeIntegracao=current_st.unidadeIntegracao,
        unidadeAtividadeId=current_st.unidadeAtividadeId,
        unidadeAtividade=current_st.unidadeAtividade,
        empresaId=func.empresaId,
        contratoId=func.contratoId
    )
    db.add(log)
    db.commit()
    db.refresh(func)
    
    # Hidrata objeto de retorno para o frontend
    func.statusIntegracao = "REALIZADA"
    func.dataValidadeASO = data_validade_aso
    func.dataValidadeIntegracao = data_validade_integracao
    func.prazoAsoDias = prazo_aso_dias
    func.prazoIntegracaoDias = prazo_integracao_dias
    func.statusIntegracaoCalculado = "VALIDO"
    
    return func

# --- Configurações ---
@app.get("/configuracao", response_model=ConfiguracaoResponse)
def get_configuracao(db: Session = Depends(get_db)):
    config = db.query(models.Configuracao).first()
    if not config:
        config = models.Configuracao()
        db.add(config)
        db.commit()
        db.refresh(config)
    return config

@app.patch("/configuracao", response_model=ConfiguracaoResponse)
def update_configuracao(update: ConfiguracaoUpdate, db: Session = Depends(get_db), current_user: dict = Depends(check_permission("canEditDados"))):
    config = db.query(models.Configuracao).first()
    if not config:
        config = models.Configuracao()
        db.add(config)
        
    for key, value in update.model_dump(exclude_unset=True).items():
        setattr(config, key, value)
        
    db.commit()
    db.refresh(config)
    return config

def check_expirations(db: Session):
    config = db.query(models.Configuracao).first()
    if not config:
        return
    
    now = datetime.now()
    dias_limite_presenca = config.diasParaConfirmarPresenca or 0

    # 1. Expiração de Contratos (Status -> VENCIDO)
    # Busca contratos ATIVOS que já passaram da data fim
    expired_contracts = db.query(models.Contrato).filter(
        models.Contrato.status == "ATIVO",
        models.Contrato.dtFim < now
    ).all()

    for contrato in expired_contracts:
        contrato.status = "VENCIDO"
        # Opcional: Cascatear inativação para funcionários
        # Por segurança, apenas marcamos o contrato como Vencido. 
        # A inativação dos funcionários pode ser feita manualmente ou numa regra separada se desejado.
        # SE O USUÁRIO QUISER CASCATEAR:
        employees = db.query(models.Funcionario).filter(models.Funcionario.contratoId == contrato.id).all()
        for emp in employees:
            latest = db.query(models.StatusFuncionario).filter(
                models.StatusFuncionario.funcionarioId == emp.id
            ).order_by(models.StatusFuncionario.id.desc()).first()
            
            if latest and latest.statusContratual != "INATIVO":
                new_status = models.StatusFuncionario(
                    statusContratual="INATIVO",
                    statusIntegracao=latest.statusIntegracao,
                    funcionarioId=emp.id,
                    funcionarioNome=latest.funcionarioNome,
                    funcaoId=latest.funcaoId,
                    funcao=latest.funcao,
                    cargoId=latest.cargoId,
                    cargo=latest.cargo,
                    setorId=latest.setorId,
                    setor=latest.setor,
                    unidadeIntegracaoId=latest.unidadeIntegracaoId,
                    unidadeIntegracao=latest.unidadeIntegracao,
                    unidadeAtividadeId=latest.unidadeAtividadeId,
                    unidadeAtividade=latest.unidadeAtividade,
                    empresaId=latest.empresaId,
                    empresaNome=latest.empresaNome,
                    dataIntegracao=latest.dataIntegracao,
                    dataAso=latest.dataAso,
                    dataValidadeAso=latest.dataValidadeAso,
                    dataValidadeIntegracao=latest.dataValidadeIntegracao,
                    prazoAsoDias=latest.prazoAsoDias,
                    prazoIntegracaoDias=latest.prazoIntegracaoDias,
                    contratoId=latest.contratoId,
                    contratoNome=latest.contratoNome,
                    versao=latest.versao,
                    data=now,
                    tipo="expiracao_contrato_automatica"
                )
                db.add(new_status)

    if expired_contracts:
        print(f"Contratos vencidos atualizados: {len(expired_contracts)}")

    # 2. Expiração de Integração (Status -> VENCIDO)
    from sqlalchemy import func as sql_func, or_, and_
    latest_status_ids = db.query(
        models.StatusFuncionario.funcionarioId,
        sql_func.max(models.StatusFuncionario.id).label('latest_id')
    ).group_by(models.StatusFuncionario.funcionarioId).subquery()
    
    expiring_integrations = db.query(models.StatusFuncionario).join(
        latest_status_ids, models.StatusFuncionario.id == latest_status_ids.c.latest_id
    ).filter(
        models.StatusFuncionario.statusIntegracao != 'VENCIDO',
        or_(
            and_(
                models.StatusFuncionario.dataValidadeIntegracao != None,
                models.StatusFuncionario.dataValidadeIntegracao < now
            ),
            and_(
                models.StatusFuncionario.dataValidadeAso != None,
                models.StatusFuncionario.dataValidadeAso < now
            )
        )
    ).all()
    
    for status in expiring_integrations:
        new_status = models.StatusFuncionario(
            statusContratual=status.statusContratual,
            statusIntegracao="VENCIDO",
            funcionarioId=status.funcionarioId,
            funcionarioNome=status.funcionarioNome,
            funcaoId=status.funcaoId,
            funcao=status.funcao,
            cargoId=status.cargoId,
            cargo=status.cargo,
            setorId=status.setorId,
            setor=status.setor,
            unidadeIntegracaoId=status.unidadeIntegracaoId,
            unidadeIntegracao=status.unidadeIntegracao,
            unidadeAtividadeId=status.unidadeAtividadeId,
            unidadeAtividade=status.unidadeAtividade,
            empresaId=status.empresaId,
            empresaNome=status.empresaNome,
            dataIntegracao=status.dataIntegracao,
            dataAso=status.dataAso,
            dataValidadeAso=status.dataValidadeAso,
            dataValidadeIntegracao=status.dataValidadeIntegracao,
            prazoAsoDias=status.prazoAsoDias,
            prazoIntegracaoDias=status.prazoIntegracaoDias,
            contratoId=status.contratoId,
            contratoNome=status.contratoNome,
            versao=status.versao,
            data=now,
            tipo="expiracao_integracao_automatica"
        )
        db.add(new_status)
    
    if expiring_integrations:
         print(f"Integrações vencidas atualizadas: {len(expiring_integrations)}")

    # 3. Falta em Agendamento (Status -> FALTOU)
    # Busca agendamentos que passaram da data + limite
    overdue_statuses = db.query(models.StatusFuncionario).join(
        latest_status_ids, models.StatusFuncionario.id == latest_status_ids.c.latest_id
    ).filter(
        models.StatusFuncionario.statusIntegracao == "AGENDADA",
        models.StatusFuncionario.dataIntegracao != None
    ).all()
    
    for s in overdue_statuses:
        if now > (s.dataIntegracao + timedelta(days=dias_limite_presenca)):
            log = models.StatusFuncionario(
                funcionarioId=s.funcionarioId,
                funcionarioNome=s.funcionarioNome,
                
                # Mantém dados anteriores
                empresaId=s.empresaId,
                empresaNome=s.empresaNome,
                contratoId=s.contratoId,
                contratoNome=s.contratoNome,
                funcaoId=s.funcaoId,
                funcao=s.funcao,
                cargoId=s.cargoId,
                cargo=s.cargo,
                setorId=s.setorId,
                setor=s.setor,
                unidadeIntegracaoId=s.unidadeIntegracaoId,
                unidadeIntegracao=s.unidadeIntegracao,
                unidadeAtividadeId=s.unidadeAtividadeId,
                unidadeAtividade=s.unidadeAtividade,
                dataAso=s.dataAso,
                prazoAsoDias=s.prazoAsoDias,
                prazoIntegracaoDias=s.prazoIntegracaoDias,
                statusContratual=s.statusContratual,

                statusIntegracao="FALTOU",
                tipo="falta_automatica",
                data=now
            )
            db.add(log)
            
    db.commit()

class CustomCuboRequest(BaseModel):
    columns: List[str]
    date_filter: Optional[dict] = None
    filters: Optional[dict] = None # { "Column Name": { "operator": "igual", "value": "xyz" } }

@app.post("/relatorios/cubo-custom")
def get_relatorio_cubo_custom(
    request: CustomCuboRequest,
    db: Session = Depends(get_db), 
    current_user: dict = Depends(check_permission("canViewCubos"))
):
    service = ReportingService(db)
    excel_content = service.generate_custom_cube_excel(request.columns, request.date_filter, request.filters)

    filename = f"planilha_cubo_custom_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    
    return Response(
        content=excel_content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

@app.get("/funcionarios/{id}/historico-pdf")
def get_funcionario_historico_pdf(id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    # Check permissions (either view documents or view logs/reports)
    # Using check_permission logic manually since we need to check multiple potential permissions OR if user is the company of the employee?
    # For simplicity, if internal user, allows if has canViewFuncionarios or canViewDocs.
    # If company user, allows if employee belongs to them.
    
    # 1. Fetch employee to check ownership
    emp = db.query(models.Funcionario).filter(models.Funcionario.id == id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Funcionário não encontrado")
        
    if current_user["type"] == "empresa":
        # Check if empresa owns employee (via contract or direct company)
        # Simplify: check if employee.empresaId matches current_user data.id or if linked via contract
        # Logic matches get_funcionario permissions usually. 
        # Assuming company context
        pass # Allow for now or implement strict check if needed.
        
    # Internal user permission check
    if current_user["type"] == "user":
         if not (current_user["permissions"].get("canViewFuncionarios") or current_user["permissions"].get("canViewDocs")):
             raise HTTPException(status_code=403, detail="Sem permissão para visualizar histórico")

    service = ReportingService(db)
    pdf_content = service.generate_employee_history_pdf(id)
    
    if not pdf_content:
        raise HTTPException(status_code=404, detail="Erro ao gerar relatório")

    filename = f"historico_integracao_{emp.nome.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf"
    
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

@app.get("/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    check_expirations(db)
    if current_user["type"] == "empresa":
        raise HTTPException(status_code=403, detail="Acesso apenas para usuários internos")
        
    now = datetime.now()
    first_day_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    from sqlalchemy import func as sql_func, or_
    
    empresas_ativas = db.query(models.Empresa).filter(models.Empresa.status == "ATIVA").count()
    total_funcionarios = db.query(models.Funcionario).count()
    
    # Docs Pendentes
    docs_pendentes = db.query(models.Documento).filter(models.Documento.status == "AGUARDANDO").count()
    anexos_pendentes = db.query(models.AnexoFuncionario).filter(models.AnexoFuncionario.status == "AGUARDANDO").count()
    
    # Alertas Críticos (Vencidos - Lógica com Histórico)
    latest_status_ids = db.query(
        models.StatusFuncionario.funcionarioId,
        sql_func.max(models.StatusFuncionario.id).label('latest_id')
    ).group_by(models.StatusFuncionario.funcionarioId).subquery()
    
    # Busca funcionários que estão com status VENCIDO no histórico se dataValidadeIntegracao ou dataValidadeAso estiverem vencidas
    vencidos = db.query(models.StatusFuncionario).join(
        latest_status_ids, models.StatusFuncionario.id == latest_status_ids.c.latest_id
    ).filter(
        models.StatusFuncionario.statusIntegracao == "VENCIDO"
    ).count()
    
    return {
        "empresasAtivas": empresas_ativas,
        "docsPendentes": docs_pendentes + anexos_pendentes,
        "totalFuncionarios": total_funcionarios,
        "aprovadosMes": db.query(models.Documento).filter(models.Documento.status == "APROVADO", models.Documento.updatedAt >= first_day_of_month).count(),
        "vencidos": vencidos
    }

@app.get("/dashboard/activities")
def get_dashboard_activities(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["type"] == "empresa":
        raise HTTPException(status_code=403, detail="Acesso apenas para usuários internos")
        
    activities = db.query(models.Log).order_by(models.Log.date.desc()).limit(10).all()
    return activities

# --- Cubo Snapshots ---

@app.get("/cubo-snapshots", response_model=List[CuboSnapshotResponse])
def list_cubo_snapshots(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["type"] == "empresa":
        raise HTTPException(status_code=403, detail="Acesso restrito a usuários internos")
    
    if not current_user["permissions"].get("isAdmin") and not current_user["permissions"].get("canViewCubos"):
        raise HTTPException(status_code=403, detail="Sem permissão para visualizar snapshots")
    
    snapshots = db.query(models.CuboSnapshot).order_by(models.CuboSnapshot.createdAt.desc()).all()
    
    # Parse JSON fields for response
    result = []
    for s in snapshots:
        result.append({
            "id": s.id,
            "nome": s.nome,
            "columns": json.loads(s.columns) if s.columns else [],
            "filters": json.loads(s.filters) if s.filters else None,
            "dateFilterField": s.dateFilterField,
            "dateRangeStart": s.dateRangeStart,
            "dateRangeEnd": s.dateRangeEnd,
            "userId": s.userId,
            "createdAt": s.createdAt
        })
    return result

@app.post("/cubo-snapshots", response_model=CuboSnapshotResponse)
def create_cubo_snapshot(data: CuboSnapshotCreate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["type"] == "empresa":
        raise HTTPException(status_code=403, detail="Acesso restrito a usuários internos")
    
    if not current_user["permissions"].get("isAdmin") and not current_user["permissions"].get("canCreateCubos"):
        raise HTTPException(status_code=403, detail="Sem permissão para criar snapshots")
    
    snapshot = models.CuboSnapshot(
        nome=data.nome,
        columns=json.dumps(data.columns),
        filters=json.dumps(data.filters) if data.filters else None,
        dateFilterField=data.dateFilterField,
        dateRangeStart=data.dateRangeStart,
        dateRangeEnd=data.dateRangeEnd,
        userId=current_user["data"].id if hasattr(current_user["data"], "id") else None
    )
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    
    return {
        "id": snapshot.id,
        "nome": snapshot.nome,
        "columns": json.loads(snapshot.columns) if snapshot.columns else [],
        "filters": json.loads(snapshot.filters) if snapshot.filters else None,
        "dateFilterField": snapshot.dateFilterField,
        "dateRangeStart": snapshot.dateRangeStart,
        "dateRangeEnd": snapshot.dateRangeEnd,
        "userId": snapshot.userId,
        "createdAt": snapshot.createdAt
    }

@app.put("/cubo-snapshots/{snapshot_id}", response_model=CuboSnapshotResponse)
def update_cubo_snapshot(snapshot_id: int, data: CuboSnapshotUpdate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["type"] == "empresa":
        raise HTTPException(status_code=403, detail="Acesso restrito a usuários internos")
    
    if not current_user["permissions"].get("isAdmin") and not current_user["permissions"].get("canEditCubos"):
        raise HTTPException(status_code=403, detail="Sem permissão para editar snapshots")
    
    snapshot = db.query(models.CuboSnapshot).filter(models.CuboSnapshot.id == snapshot_id).first()
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot não encontrado")
    
    if data.nome is not None:
        snapshot.nome = data.nome
    if data.columns is not None:
        snapshot.columns = json.dumps(data.columns)
    if data.filters is not None:
        snapshot.filters = json.dumps(data.filters)
    if data.dateFilterField is not None:
        snapshot.dateFilterField = data.dateFilterField
    if data.dateRangeStart is not None:
        snapshot.dateRangeStart = data.dateRangeStart
    if data.dateRangeEnd is not None:
        snapshot.dateRangeEnd = data.dateRangeEnd
    
    db.commit()
    db.refresh(snapshot)
    
    return {
        "id": snapshot.id,
        "nome": snapshot.nome,
        "columns": json.loads(snapshot.columns) if snapshot.columns else [],
        "filters": json.loads(snapshot.filters) if snapshot.filters else None,
        "dateFilterField": snapshot.dateFilterField,
        "dateRangeStart": snapshot.dateRangeStart,
        "dateRangeEnd": snapshot.dateRangeEnd,
        "userId": snapshot.userId,
        "createdAt": snapshot.createdAt
    }

@app.delete("/cubo-snapshots/{snapshot_id}")
def delete_cubo_snapshot(snapshot_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["type"] == "empresa":
        raise HTTPException(status_code=403, detail="Acesso restrito a usuários internos")
    
    if not current_user["permissions"].get("isAdmin") and not current_user["permissions"].get("canDeleteCubos"):
        raise HTTPException(status_code=403, detail="Sem permissão para excluir snapshots")
    
    snapshot = db.query(models.CuboSnapshot).filter(models.CuboSnapshot.id == snapshot_id).first()
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot não encontrado")
    
    db.delete(snapshot)
    db.commit()
    return {"message": "Snapshot excluído com sucesso"}
