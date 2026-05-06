-- =============================================
-- CAE Ontology Management System — DDL
-- =============================================

-- 1. 포맷 레지스트리 (전사 공유 I/O 데이터 사전)
CREATE TABLE schema_registry (
  format_id       VARCHAR(64) PRIMARY KEY,
  name            VARCHAR(128) NOT NULL,
  data_class      VARCHAR(16) NOT NULL CHECK (data_class IN ('binary_link', 'embedded')),
  file_types      TEXT[],
  embedded_schema JSONB,
  description     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 제품 목록
CREATE TABLE products (
  product_id  VARCHAR(64) PRIMARY KEY,
  name        VARCHAR(128) NOT NULL,
  status      VARCHAR(16) DEFAULT 'active',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 워크플로우 노드 (부서별 JSON 저장)
CREATE TABLE nodes (
  id           SERIAL,
  node_id      VARCHAR(64) NOT NULL,
  product_id   VARCHAR(64) NOT NULL DEFAULT 'global',
  meta         JSONB NOT NULL,
  inputs       JSONB NOT NULL DEFAULT '[]',
  processes    JSONB NOT NULL DEFAULT '[]',
  outputs      JSONB NOT NULL DEFAULT '[]',
  version      INTEGER NOT NULL DEFAULT 1,
  created_by   VARCHAR(128),
  updated_by   VARCHAR(128),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (id),
  UNIQUE (node_id, product_id),
  FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
);

-- 4. 변경 이력 감사 로그
CREATE TABLE audit_log (
  id           SERIAL PRIMARY KEY,
  node_id      VARCHAR(64),
  product_id   VARCHAR(64),
  action       VARCHAR(16) NOT NULL,
  changed_by   VARCHAR(128),
  prev_data    JSONB,
  new_data     JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_nodes_product ON nodes(product_id);
CREATE INDEX idx_nodes_meta_type ON nodes USING GIN ((meta->'type'));
CREATE INDEX idx_audit_node ON audit_log(node_id, product_id);
