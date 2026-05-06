INSERT INTO nodes (node_id, product_id, meta, inputs, processes, outputs)
VALUES (
  'task_hinge_sim',
  'SM-F956B',
  '{"name":"힌지 구조 시뮬레이션","type":"thread","owner":"CAE 그룹","description":"폴더블 힌지 반복 Folding 내구 해석"}',
  '[{"data_id":"in_k","name":"세트 LS-DYNA K파일","format_id":"fmt_lsdyna_k","source_node":"task_cae_stiffness","is_mandatory":true,"parameters":{}}]',
  '[]',
  '[{"data_id":"out_hinge","name":"힌지 내구 수명 피드백","format_id":"fmt_strain_result","target_node":"task_hw","sla_days":7,"parameters":{}}]'
);
