-- =============================================
-- Seed Data: 기존 task_data.js → PostgreSQL 이관
-- =============================================

-- 기본 제품
INSERT INTO products (product_id, name) VALUES
  ('global', 'Global Template (제품 공통)');

-- Schema Registry (9개 포맷)
INSERT INTO schema_registry (format_id, name, data_class, file_types, embedded_schema, description) VALUES
  ('fmt_mcad_model',      'MCAD 모델',            'binary_link', ARRAY['.stp','.step','.igs'], '{"file_path":"string"}', '기구 설계 산출 3D 형상 데이터'),
  ('fmt_ecad_model',      'ECAD 모델',              'binary_link', ARRAY['.brd','.mcm'],         '{"file_path":"string"}', '실장솔루션 전자 CAD 설계 데이터'),
  ('fmt_lsdyna_k',        'LS-DYNA K파일',          'binary_link', ARRAY['.k','.key'],           '{"file_path":"string"}', '세트 구조강성 해석용 솔버 입력 파일'),
  ('fmt_stiffness_model', '세트 강성 모델',          'binary_link', ARRAY['.k','.key'],           NULL, '세트 전체 강성 해석 모델'),
  ('fmt_strain_result',   '변형률 결과',             'embedded',    NULL, '{"pba_strain":"number","package_strain":"number","interposer_strain":"number"}', '낙하/충격 해석 산출 PBA 변형률'),
  ('fmt_sed_result',      'SED (Strain Energy Density)', 'embedded', NULL, '{"sed_value":"number","target_criteria":"string","pass_fail":"string"}', '열충격 해석 산출 변형에너지밀도'),
  ('fmt_ballmap_stackup', '볼맵/스택업/두께 정보',    'embedded',    NULL, '{"ball_count":"number","stackup_layers":"number","total_thickness_mm":"number"}', '실장솔루션 PBA 구조 파라미터'),
  ('fmt_redesign_order',  '재설계 지시',             'embedded',    NULL, '{"target_part":"string","issue_description":"string","priority":"string"}', 'HW개발팀 설계 변경 의뢰'),
  ('fmt_cap_scenario',    'Cap 떨림 시나리오',        'embedded',    NULL, '{"cap_list":"string[]","scenario_ids":"string[]"}', 'HW개발팀 Cap 떨림 해석 의뢰 파라미터');

-- 9개 워크플로우 노드
INSERT INTO nodes (node_id, product_id, meta, inputs, processes, outputs) VALUES

-- 1. 기구 설계
('task_cad', 'global',
 '{"name":"기구 설계 팀","type":"component","owner":"기구설계 그룹","description":"제품 3D 기구물 설계"}',
 '[{"data_id":"in_redesign","name":"재설계 지시","format_id":"fmt_redesign_order","source_node":"task_hw","is_mandatory":false,"parameters":{}}]',
 '[]',
 '[{"data_id":"out_cad","name":"MCAD 모델","format_id":"fmt_mcad_model","target_node":"task_cae_stiffness","sla_days":5,"parameters":{"file_path":"\\\\NAS\\Design\\MCAD\\latest_model.stp"}}]'
),

-- 2. 실장솔루션
('task_mnt', 'global',
 '{"name":"실장솔루션 그룹","type":"component","owner":"실장솔루션 그룹","description":"ECAD (Electrical CAD) 설계"}',
 '[{"data_id":"in_redesign","name":"PBA 재설계 지시","format_id":"fmt_redesign_order","source_node":"task_hw","is_mandatory":false,"parameters":{}}]',
 '[]',
 '[{"data_id":"out_ecae","name":"ECAD 모델","format_id":"fmt_ecad_model","target_node":"task_cae_stiffness","sla_days":3,"parameters":{"file_path":"\\\\NAS\\Design\\ECAD\\latest_board.brd"}},{"data_id":"out_ballmap","name":"볼맵/스택업/두께 정보","format_id":"fmt_ballmap_stackup","target_node":["task_ai_thermal","task_ai_aponoff"],"sla_days":2,"parameters":{}}]'
),

-- 3. 세트 CAE (구조강성)
('task_cae_stiffness', 'global',
 '{"name":"세트 CAE (구조강성)","type":"core","owner":"CAE 그룹","description":"구조강성 파트 전처리 단계"}',
 '[{"data_id":"in_cad","name":"MCAD 모델","format_id":"fmt_mcad_model","source_node":"task_cad","is_mandatory":true,"parameters":{"file_path":"\\\\NAS\\Design\\MCAD\\latest_model.stp"}},{"data_id":"in_ecae","name":"ECAD 모델","format_id":"fmt_ecad_model","source_node":"task_mnt","is_mandatory":true,"parameters":{"file_path":"\\\\NAS\\Design\\ECAD\\latest_board.brd"}}]',
 '[{"step_id":"p1","name":"모델링 단순화","metrics":{}},{"step_id":"p2","name":"물성 부여","metrics":{}}]',
 '[{"data_id":"out_k","name":"세트 LS-DYNA K파일","format_id":"fmt_lsdyna_k","target_node":["task_drop_sim","task_partial_impact"],"sla_days":7,"parameters":{"file_path":"\\\\HPC\\CAE\\Solver\\model.k"}},{"data_id":"out_stiffness","name":"세트 강성 모델","format_id":"fmt_stiffness_model","target_node":["task_ai_aponoff","task_ai_cap"],"sla_days":7,"parameters":{}}]'
),

-- 4. 낙하 시뮬레이션
('task_drop_sim', 'global',
 '{"name":"낙하 시뮬레이션","type":"thread","owner":"CAE 그룹","description":"구조강성 파트 LS-DYNA 연산"}',
 '[{"data_id":"in_k","name":"세트 LS-DYNA K파일","format_id":"fmt_lsdyna_k","source_node":"task_cae_stiffness","is_mandatory":true,"parameters":{"file_path":"\\\\HPC\\CAE\\Solver\\model.k"}}]',
 '[]',
 '[{"data_id":"out_strain","name":"자유낙하 변형률","format_id":"fmt_strain_result","target_node":"task_hw","sla_days":5,"parameters":{}}]'
),

-- 5. 부분 충격(외충) 시뮬레이션
('task_partial_impact', 'global',
 '{"name":"부분 충격(외충) 시뮬레이션","type":"thread","owner":"CAE 그룹","description":"구조강성 파트: 볼/실린더 타격 해석"}',
 '[{"data_id":"in_k","name":"세트 LS-DYNA K파일","format_id":"fmt_lsdyna_k","source_node":"task_cae_stiffness","is_mandatory":true,"parameters":{"file_path":"\\\\HPC\\CAE\\Solver\\model.k"}}]',
 '[]',
 '[{"data_id":"out_strain","name":"볼/실린더 타격 변형률","format_id":"fmt_strain_result","target_node":"task_hw","sla_days":5,"parameters":{}}]'
),

-- 6. PBA 열충격 시뮬레이션
('task_ai_thermal', 'global',
 '{"name":"PBA 열충격 시뮬레이션","type":"thread","owner":"디지털트윈 AI 파트","description":"디지털트윈 AI 파트: 열응력"}',
 '[{"data_id":"in_ballmap","name":"볼맵/스택업/두께","format_id":"fmt_ballmap_stackup","source_node":"task_mnt","is_mandatory":true,"parameters":{}}]',
 '[]',
 '[{"data_id":"out_sed","name":"SED 피드백","format_id":"fmt_sed_result","target_node":"task_hw","sla_days":3,"parameters":{}}]'
),

-- 7. AP on/off 시뮬레이션
('task_ai_aponoff', 'global',
 '{"name":"AP on/off 시뮬레이션","type":"thread","owner":"디지털트윈 AI 파트","description":"디지털트윈 AI 파트: 발열/구조 융합 해석"}',
 '[{"data_id":"in_stiffness","name":"세트 강성 모델","format_id":"fmt_stiffness_model","source_node":"task_cae_stiffness","is_mandatory":true,"parameters":{}},{"data_id":"in_ballmap","name":"볼맵/스택업/두께","format_id":"fmt_ballmap_stackup","source_node":"task_mnt","is_mandatory":true,"parameters":{}}]',
 '[]',
 '[{"data_id":"out_ap","name":"AP 동작 변형 피드백","format_id":"fmt_strain_result","target_node":"task_hw","sla_days":3,"parameters":{}}]'
),

-- 8. Cap 떨림 시뮬레이션
('task_ai_cap', 'global',
 '{"name":"Cap 떨림 시뮬레이션","type":"thread","owner":"디지털트윈 AI 파트","description":"디지털트윈 AI 파트: Acoustic Noise"}',
 '[{"data_id":"in_stiffness","name":"세트 강성 모델","format_id":"fmt_stiffness_model","source_node":"task_cae_stiffness","is_mandatory":true,"parameters":{}},{"data_id":"in_cap_scenario","name":"Cap 정보 및 시나리오","format_id":"fmt_cap_scenario","source_node":"task_hw","is_mandatory":true,"parameters":{}}]',
 '[]',
 '[{"data_id":"out_cap","name":"떨림 개선방안 피드백","format_id":"fmt_cap_scenario","target_node":"task_hw","sla_days":5,"parameters":{}}]'
),

-- 9. HW 개발 팀
('task_hw', 'global',
 '{"name":"HW 개발 팀","type":"insight","owner":"HW 개발 그룹","description":"해석 검증 및 보강/수정 지시"}',
 '[{"data_id":"in_drop","name":"자유낙하 변형률","format_id":"fmt_strain_result","source_node":"task_drop_sim","is_mandatory":true,"parameters":{}},{"data_id":"in_impact","name":"볼/실린더 타격 변형률","format_id":"fmt_strain_result","source_node":"task_partial_impact","is_mandatory":true,"parameters":{}},{"data_id":"in_sed","name":"SED 피드백","format_id":"fmt_sed_result","source_node":"task_ai_thermal","is_mandatory":true,"parameters":{}},{"data_id":"in_ap","name":"AP 동작 변형 피드백","format_id":"fmt_strain_result","source_node":"task_ai_aponoff","is_mandatory":true,"parameters":{}},{"data_id":"in_cap","name":"떨림 개선방안 피드백","format_id":"fmt_cap_scenario","source_node":"task_ai_cap","is_mandatory":true,"parameters":{}}]',
 '[{"step_id":"p1","name":"결과 병합 위험도 평가","metrics":{}}]',
 '[{"data_id":"out_redesign_cad","name":"기구 재설계 지시","format_id":"fmt_redesign_order","target_node":"task_cad","sla_days":1,"parameters":{}},{"data_id":"out_redesign_mnt","name":"PBA 재설계 지시","format_id":"fmt_redesign_order","target_node":"task_mnt","sla_days":1,"parameters":{}},{"data_id":"out_cap_req","name":"Cap 정보 및 시나리오 의뢰","format_id":"fmt_cap_scenario","target_node":"task_ai_cap","sla_days":1,"parameters":{}}]'
);
