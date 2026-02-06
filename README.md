# GPD - Gestão de Prestadores e Documentos 🚀

![Status](https://img.shields.io/badge/Status-Em%20Produção-success?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Next.js](https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)

Uma plataforma robusta e moderna para gestão de conformidade documental, integração de terceiros e monitoramento de contratos. Desenvolvida para escalar e garantir que todos os requisitos legais e corporativos sejam atendidos com eficiência.

---

## ✨ Funcionalidades Principais

### 📋 Gestão de Documentação Acessória
- Upload de documentos com controle de **competência mensal**.
- Fluxo de aprovação manual e automática.
- Visualização de status em tempo real por contrato ou funcionário.

### 📊 Construtor de Relatórios Dinâmicos (Cubo)
- Crie relatórios personalizados arrastando e soltando colunas.
- Filtros avançados por campo (igual, contém, lista).
- Exportação instantânea para **Excel (.xlsx)** e **PDF**.
- Salvamento de "Snapshots" (configurações favoritas).

### 🤝 Integração e Terceirizados
- Agendamento de integrações para novos funcionários.
- Integração aprovada manualmente permitindo agendamento mesmo com documentos pendentes.
- Controle de expiração automática de documentos (ASO, Treinamentos, etc).

### 🔐 Segurança e Acesso
- Autenticação via **Google OAuth 2.0**.
- Sistema granular de permissões por perfil.
- Auditoria de alterações e históricos.

---

## 🛠️ Stack Tecnológica

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS (Modern Aesthetics)
- **State Management:** TanStack Query & React Context
- **Drag & Drop:** `@dnd-kit` (Premium UX)
- **Ícones:** Lucide React

### Backend
- **Framework:** FastAPI (Python 3.11)
- **Banco de Dados:** PostgreSQL (Produção) / SQLite (Desenvolvimento)
- **ORM:** SQLAlchemy 2.0
- **Migrações:** Alembic
- **Documentação:** Swagger UI Automático

---

## 🐳 Como Rodar (Docker)

O projeto está totalmente dockerizado para facilitar o deploy e desenvolvimento.

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/noegdiniz/gestao-contratos.git
    cd gestao-contratos
    ```

2.  **Configure as variáveis de ambiente:**
    Crie um arquivo `.env` na raiz com:
    ```env
    JWT_SECRET=sua_chave_secreta
    CORS_ORIGINS=http://localhost:3000
    POSTGRES_USER=user
    POSTGRES_PASSWORD=password
    POSTGRES_DB=gestao_contratos
    GOOGLE_CLIENT_ID=seu_client_id.apps.googleusercontent.com
    ```

3.  **Suba os containers:**
    ```bash
    docker-compose up --build
    ```

4.  **Acesse a aplicação:**
    - Frontend: `http://localhost:3000`
    - Backend API: `http://localhost:8000/docs`

---

## 🏗️ Arquitetura

O sistema utiliza uma arquitetura de microserviços simplificada:
- **Nginx:** Proxy reverso e roteamento.
- **Frontend App:** Interface SSR/Static otimizada.
- **Backend API:** Lógica de negócio e acesso a dados.
- **Database:** PostgreSQL persistente.

---

## 📄 Licença
Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

<p align="center">Made with ❤️ for premium management experiences</p>
