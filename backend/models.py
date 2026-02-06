from sqlalchemy import *
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
import datetime
from sqlalchemy.sql import func

import os

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./gestao-contratos.db")

# Adjust for SQLAlchemy 2.0+ and Postgres vs SQLite
connect_args = {}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args=connect_args
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    openId = Column(String, unique=True, index=True, nullable=False)
    name = Column(String)
    email = Column(String)
    loginMethod = Column(String)
    role = Column(String, default="user", nullable=False)
    profileId = Column(Integer, ForeignKey("profiles.id"))
    isIntegrationApprover = Column(Boolean, default=False)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())
    updatedAt = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
    lastSignedIn = Column(DateTime(timezone=True), server_default=func.now())

class Profile(Base):
    __tablename__ = "profiles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    
    canCreateContratos = Column(Boolean, default=False)
    canEditContratos = Column(Boolean, default=False)
    canDeleteContratos = Column(Boolean, default=False)
    canViewContratos = Column(Boolean, default=False)
    
    canCreateCategorias = Column(Boolean, default=False)
    canEditCategorias = Column(Boolean, default=False)
    canDeleteCategorias = Column(Boolean, default=False)
    canViewCategorias = Column(Boolean, default=False)
    
    canApproveDocs = Column(Boolean, default=False)
    canDeleteDocs = Column(Boolean, default=False)
    canViewDocs = Column(Boolean, default=False)
    
    canCreateEmpresas = Column(Boolean, default=False)
    canEditEmpresas = Column(Boolean, default=False)
    canDeleteEmpresas = Column(Boolean, default=False)
    canViewEmpresas = Column(Boolean, default=False)
    
    canCreatePerfis = Column(Boolean, default=False)
    canEditPerfis = Column(Boolean, default=False)
    canDeletePerfis = Column(Boolean, default=False)
    canViewPerfis = Column(Boolean, default=False)
    
    canCreateUsers = Column(Boolean, default=False)
    canEditUsers = Column(Boolean, default=False)
    canDeleteUsers = Column(Boolean, default=False)
    canViewUsers = Column(Boolean, default=False)
    
    canCreateTipoProcesso = Column(Boolean, default=False)
    canEditTipoProcesso = Column(Boolean, default=False)
    canDeleteTipoProcesso = Column(Boolean, default=False)
    canViewTipoProcesso = Column(Boolean, default=False)
    
    canCreateFuncionarios = Column(Boolean, default=False)
    canEditFuncionarios = Column(Boolean, default=False)
    canDeleteFuncionarios = Column(Boolean, default=False)
    canViewFuncionarios = Column(Boolean, default=False)
    
    canViewLogs = Column(Boolean, default=False)
    canViewCubos = Column(Boolean, default=False)
    canCreateCubos = Column(Boolean, default=False)
    canEditCubos = Column(Boolean, default=False)
    canDeleteCubos = Column(Boolean, default=False)
    canApproveIntegration = Column(Boolean, default=False)
    
    # Novas Permissões para Regras de Aprovação
    canViewRegrasAprovacao = Column(Boolean, default=False)
    canCreateRegrasAprovacao = Column(Boolean, default=False)
    canEditRegrasAprovacao = Column(Boolean, default=False)
    canDeleteRegrasAprovacao = Column(Boolean, default=False)
    
    canGeneratePdfReports = Column(Boolean, default=False)

    createdAt = Column(DateTime(timezone=True), server_default=func.now())
    updatedAt = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

class Empresa(Base):
    __tablename__ = "empresas"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    loginName = Column(String, unique=True, index=True)
    cnpj = Column(String, unique=True, nullable=False)
    departamento = Column(String, nullable=False)
    chave = Column(String, unique=True, nullable=False)
    status = Column(String, default="ATIVA", nullable=False)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())
    updatedAt = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

class Subcontratada(Base):
    __tablename__ = "subcontratadas"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    cnpj = Column(String, nullable=False)
    contratoId = Column(Integer, nullable=False)
    empresaId = Column(Integer, nullable=False)
    status = Column(String, default="ATIVO", nullable=False)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())

class Contrato(Base):
    __tablename__ = "contratos"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    status = Column(String, default="ATIVO", nullable=False)
    empresaId = Column(Integer, nullable=False)
    empresaNome = Column(String, nullable=False)
    dtInicio = Column(DateTime, nullable=False)
    dtFim = Column(DateTime, nullable=False)
    categoriaId = Column(Integer, nullable=True)
    categoriaNome = Column(String, nullable=True)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())
    updatedAt = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

class TipoProcesso(Base):
    __tablename__ = "tiposProcesso"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())

class Categoria(Base):
    __tablename__ = "categorias"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    tipoProcessoId = Column(Integer, nullable=False)
    tipoProcessoNome = Column(String, nullable=False)
    documentosPedidos = Column(Text, nullable=False)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())
    updatedAt = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

class Documento(Base):
    __tablename__ = "documentos"
    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String, nullable=False)
    data = Column(String, nullable=False)
    contratoId = Column(Integer, nullable=False)
    contratoNome = Column(String, nullable=False)
    empresaId = Column(Integer, nullable=False)
    empresaNome = Column(String, nullable=False)
    categoriaId = Column(Integer, nullable=False)
    categoriaNome = Column(String, nullable=False)
    status = Column(String, default="AGUARDANDO", nullable=False)
    uploaded = Column(Boolean, default=False)
    versao = Column(String, default="1.0", nullable=False)
    email = Column(String, nullable=False)
    competencia = Column(String, nullable=False)
    reprovadoPor = Column(String)
    funcionarioId = Column(Integer)
    funcionarioNome = Column(String)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())
    updatedAt = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

class Anexo(Base):
    __tablename__ = "anexos"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    documentoId = Column(Integer, nullable=False)
    data = Column(LargeBinary)
    link = Column(String, default="")
    corrigido = Column(Boolean, default=False)
    hash = Column(String, nullable=False)
    uploadDate = Column(DateTime(timezone=True), server_default=func.now())

class Aprovacao(Base):
    __tablename__ = "aprovacoes"
    id = Column(Integer, primary_key=True, index=True)
    perfilId = Column(Integer, nullable=False)
    perfilNome = Column(String, nullable=False)
    documentoId = Column(Integer, nullable=True)
    anexoFuncionarioId = Column(Integer, nullable=True)
    obs = Column(Text, default="")
    data = Column(String, nullable=False)
    status = Column(String, default="AGUARDANDO", nullable=False)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())

class Funcionario(Base):
    __tablename__ = "funcionarios"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    empresaId = Column(Integer)
    contratoId = Column(Integer)
    
    createdAt = Column(DateTime(timezone=True), server_default=func.now())

class StatusFuncionario(Base):
    __tablename__ = "statusFuncionarios"
    id = Column(Integer, primary_key=True, index=True)
    statusContratual = Column(String) # ATIVO, INATIVO
    statusIntegracao = Column(String) # PENDENTE, AGENDADA, REALIZADA, VENCIDA
    funcionarioId = Column(Integer)
    funcionarioNome = Column(String)
    
    # IDs e Nomes
    funcaoId = Column(Integer)
    funcao = Column(String)
    cargoId = Column(Integer)
    cargo = Column(String)
    setorId = Column(Integer)
    setor = Column(String)
    unidadeIntegracaoId = Column(Integer)
    unidadeIntegracao = Column(String)
    unidadeAtividadeId = Column(Integer)
    unidadeAtividade = Column(String)
    
    empresaId = Column(Integer)
    empresaNome = Column(String)
    dataIntegracao = Column(DateTime)
    dataAso = Column(DateTime)
    dataValidadeAso = Column(DateTime)
    dataValidadeIntegracao = Column(DateTime)
    prazoAsoDias = Column(Integer)
    prazoIntegracaoDias = Column(Integer)
    
    contratoId = Column(Integer)
    contratoNome = Column(String)
    versao = Column(String, default="1.0")
    data = Column(DateTime) # Data do registro (Log)
    tipo = Column(String, default="status") # agendamento, modificacao, etc
    justificativaAgendamento = Column(String, nullable=True)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())

class AnexoFuncionario(Base):
    __tablename__ = "anexosFuncionarios"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    funcionarioId = Column(Integer, nullable=False)
    tipo = Column(String) # Ex: RG, CPF, ASO
    status = Column(String, default="AGUARDANDO")
    observacao = Column(Text)
    data = Column(LargeBinary)
    link = Column(String, default="")
    corrigido = Column(Boolean, default=False)
    hash = Column(String, nullable=False)
    uploadDate = Column(DateTime(timezone=True), server_default=func.now())

class DocumentoExigidoFuncionario(Base):
    __tablename__ = "documentosExigidosFuncionario"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    contratoId = Column(Integer, nullable=True) # Se null, é obrigatório para todos (global)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())

class Funcao(Base):
    __tablename__ = "funcoes"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    active = Column(Boolean, default=True)

class Cargo(Base):
    __tablename__ = "cargos"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    active = Column(Boolean, default=True)

class Setor(Base):
    __tablename__ = "setores"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    active = Column(Boolean, default=True)

class UnidadeIntegracao(Base):
    __tablename__ = "unidadesIntegracao"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    active = Column(Boolean, default=True)

class Log(Base):
    __tablename__ = "logs"
    id = Column(Integer, primary_key=True, index=True)
    menu = Column(String, nullable=False)
    userName = Column(String, nullable=False)
    userPerfil = Column(String, nullable=False)
    action = Column(String, nullable=False)
    info = Column(Text, nullable=False)
    date = Column(DateTime(timezone=True), server_default=func.now())

class Cubo(Base):
    __tablename__ = "cubos"
    id = Column(Integer, primary_key=True, index=True)
    categoriaIds = Column(Text, nullable=False)
    categoriaNomes = Column(Text, nullable=False)
    perfilIds = Column(Text, nullable=False)
    perfilNomes = Column(Text, nullable=False)
    pastaDriver = Column(String, nullable=False)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())
    updatedAt = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

class Relatorio(Base):
    __tablename__ = "relatorios"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    data = Column(DateTime, nullable=False)
    query = Column(Text, nullable=False)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())

class Configuracao(Base):
    __tablename__ = "configuracoes"
    id = Column(Integer, primary_key=True, index=True)
    prazoAsoGeral = Column(Integer, default=365)
    prazoIntegracaoGeral = Column(Integer, default=365)
    diasParaConfirmarPresenca = Column(Integer, default=5) # X dias
    diasSemanaAgenda = Column(String, default="TER,QUI") # Lista de siglas: SEG, TER, QUA, QUI, SEX, SAB, DOM
    nomeEmpresa = Column(String, default="Gestão de Contratos")
    logoImage = Column(Text) # Base64
    dominioInterno = Column(String) # Ex: @gmail.com ou @suaempresa.com
    updatedAt = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

class CuboSnapshot(Base):
    __tablename__ = "cuboSnapshots"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    columns = Column(Text)  # JSON string of selected columns
    filters = Column(Text)  # JSON string of column filters
    dateFilterField = Column(String)  # Selected date filter field
    dateRangeStart = Column(String)  # Optional saved date range
    dateRangeEnd = Column(String)
    userId = Column(Integer)  # Who created it
    createdAt = Column(DateTime(timezone=True), server_default=func.now())
    updatedAt = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
