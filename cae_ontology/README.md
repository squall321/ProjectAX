# CAE Ontology Management System

> 엔지니어링 워크플로우를 온톨로지 기반 지식 그래프로 관리하는 Full-Stack 시스템

## Tech Stack
- **Backend**: Node.js + Express + PostgreSQL (JSONB)
- **Frontend**: React 18 (Vite) + Socket.io
- **Deploy**: Docker Compose

## Project Structure
```
cae-ontology/
├── server/                 # Express Backend
│   ├── src/
│   │   ├── index.js        # Entry point
│   │   ├── db.js           # PostgreSQL connection pool
│   │   ├── routes/
│   │   │   ├── registry.js # /api/registry
│   │   │   ├── nodes.js    # /api/nodes CRUD
│   │   │   ├── products.js # /api/products
│   │   │   └── ontology.js # /api/ontology (compile + validate)
│   │   └── services/
│   │       ├── ontologyBuilder.js  # Edge auto-generation
│   │       └── validator.js        # Schema validation
│   └── package.json
├── client/                 # React Frontend (Phase 2)
├── db/
│   ├── init.sql            # DDL (테이블 생성)
│   └── seed.sql            # 초기 데이터 (기존 9개 노드)
├── docker-compose.yml
├── .gitignore
└── README.md
```

## Quick Start
```bash
docker compose up -d          # PostgreSQL 기동
cd server && npm install      # 의존성 설치
npm run dev                   # API 서버 (localhost:4000)
```
