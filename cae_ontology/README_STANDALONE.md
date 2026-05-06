# CAE Ontology Standalone "Hardcopy" Guide

본 가이드는 서버 환경(Node.js 등)이 구축된 곳에서 빌드된 결과물을 다른 환경으로 옮기거나, 매번 서버를 띄우지 않고 바로 실행하는 방법을 설명합니다.

## 1. 구성 요소
- `client/dist`: React 프론트엔드가 컴파일된 정적 파일들 (가장 중요)
- `server/`: API 서버 소스 (PostgreSQL 연결 필요)
- `run_app.bat`: 원클릭 실행 스크립트

## 2. 하드카피 방법 (배포용 ZIP 만들기)
다른 PC로 옮길 때는 다음 폴더와 파일만 압축해서 전달하면 됩니다:
1. `client/dist` (폴더 전체)
2. `server/` (폴더 전체 - `node_modules` 포함)
3. `run_app.bat` (파일)

## 3. 실행 방법
1. **PostgreSQL**: 실행 대상 PC에 PostgreSQL이 설치되어 있고, `cae_ontology` 데이터베이스가 생성되어 있어야 합니다.
2. **Node.js**: 실행 대상 PC에 Node.js가 설치되어 있어야 합니다.
3. **실행**: 루트 폴더의 `run_app.bat`을 더블 클릭합니다.
   - 자동으로 서버가 실행되고 브라우저에서 `http://localhost:4000`이 열립니다.

## 4. 특징
- 이제 더 이상 `npm run dev`를 두 군데서(Client, Server) 띄울 필요가 없습니다.
- `run_app.bat` 하나로 백엔드 API와 프론트엔드 UI가 통합된 상태(`PORT 4000`)로 실행됩니다.
- 프론트엔드가 빌드되어 있으므로 속도가 훨씬 빠르고 안정적입니다.
