# docs/development/ — 索引（INDEX）

このフォルダの 241 件を、移動せずに分類して示す索引です（2026-11-07 新設、実測ベース）。

- **動かさない理由**: 現行コード（`public/app/`・`public/core/` 等）のコメントが、設計正典・根拠としてこのフォルダの文書をパス名で参照しています（実測 46 件・計 91 参照）。移動する場合はコード側の参照も同時に直すこと。
- **参照切れ 1 件**: `reading-japanese-plural-pronoun-number-adoption.md` は `scripts/re-phase1-regression.cjs` のコメントから参照されているが、現行ツリーに実在しない（A 群の表ではリンクなしで示した）。文書の復元か参照の修正かは別途判断。
- **分類の軸**: A = コードから参照される設計文書（現行仕様の正典級）／ B = 完了フェーズの作業記録（接頭辞シリーズ）／ C = その他の設計・仕様・監査。
- knowledge-library（構想・未設立）を作る場合は、B 群が移行の第一候補で、本索引がそのまま移行台帳になります。

## A. コードから参照される設計文書（46 件・計 91 参照）

| 文書 | 参照数 |
|---|---:|
| [verse-representation-design.md](verse-representation-design.md) | 14 |
| [flow-tree-adapter-design.md](flow-tree-adapter-design.md) | 9 |
| [flow-tree-representation-schema.md](flow-tree-representation-schema.md) | 8 |
| [neighborhood-view-design.md](neighborhood-view-design.md) | 8 |
| [flow-rendering.md](flow-rendering.md) | 3 |
| [reading-observation-information-architecture.md](reading-observation-information-architecture.md) | 3 |
| [morph-rule-engine-v1-frozen.md](morph-rule-engine-v1-frozen.md) | 2 |
| [reading-semantic.md](reading-semantic.md) | 2 |
| [relative-syntax-rule-design.md](relative-syntax-rule-design.md) | 2 |
| [semantic-completion-design.md](semantic-completion-design.md) | 2 |
| [studypanel-scope-definition.md](studypanel-scope-definition.md) | 2 |
| [syntax-completion-design.md](syntax-completion-design.md) | 2 |
| [P6-D_final_report.md](P6-D_final_report.md) | 1 |
| [P6-D_relative_connector_production_audit.md](P6-D_relative_connector_production_audit.md) | 1 |
| [P6-D_relative_connector_relationship_matrix.md](P6-D_relative_connector_relationship_matrix.md) | 1 |
| [P6-D_test_matrix.md](P6-D_test_matrix.md) | 1 |
| [P6-E_design_options.md](P6-E_design_options.md) | 1 |
| [P6-E_final_report.md](P6-E_final_report.md) | 1 |
| [P6-E_relationship_matrix.md](P6-E_relationship_matrix.md) | 1 |
| [P6-E_visual_grammar_gap_audit.md](P6-E_visual_grammar_gap_audit.md) | 1 |
| [P6-F.1_final_report.md](P6-F.1_final_report.md) | 1 |
| [P6-F.1_pp_diagonal_audit.md](P6-F.1_pp_diagonal_audit.md) | 1 |
| [P6-F.1_pp_relationship_matrix.md](P6-F.1_pp_relationship_matrix.md) | 1 |
| [P6-F.1_test_matrix.md](P6-F.1_test_matrix.md) | 1 |
| [P6-G.11.3_slot_content_implementation_report.md](P6-G.11.3_slot_content_implementation_report.md) | 1 |
| [P6-G.1_final_report.md](P6-G.1_final_report.md) | 1 |
| [P6-G.1_priority_matrix.md](P6-G.1_priority_matrix.md) | 1 |
| [P6-G.1_relationship_coverage_matrix.md](P6-G.1_relationship_coverage_matrix.md) | 1 |
| [P6-G.1_visual_grammar_gap_audit.md](P6-G.1_visual_grammar_gap_audit.md) | 1 |
| [P6-G.2_final_report.md](P6-G.2_final_report.md) | 1 |
| [P6-G.2_io_raised_platform_audit.md](P6-G.2_io_raised_platform_audit.md) | 1 |
| [P6-G.2_io_relationship_matrix.md](P6-G.2_io_relationship_matrix.md) | 1 |
| [P6-G.2_test_matrix.md](P6-G.2_test_matrix.md) | 1 |
| [alphautos-morph-rule-design.md](alphautos-morph-rule-design.md) | 1 |
| [discourse-boundary-classification.md](discourse-boundary-classification.md) | 1 |
| [morph-gap-resolution-design.md](morph-gap-resolution-design.md) | 1 |
| [morph-rule-engine-implementation-spec.md](morph-rule-engine-implementation-spec.md) | 1 |
| [reading-flow-gloss-policy.md](reading-flow-gloss-policy.md) | 1 |
| [reading-japanese-improvement-framework.md](reading-japanese-improvement-framework.md) | 1 |
| reading-japanese-plural-pronoun-number-adoption.md | 1 |
| [reflexive-morph-rule-design.md](reflexive-morph-rule-design.md) | 1 |
| [relative-morph-rule-design.md](relative-morph-rule-design.md) | 1 |
| [search-design-system.md](search-design-system.md) | 1 |
| [studypanel-layer3-audit-inventory.md](studypanel-layer3-audit-inventory.md) | 1 |
| [studypanel-layer3-information-audit.md](studypanel-layer3-information-audit.md) | 1 |
| [tis-morph-rule-design.md](tis-morph-rule-design.md) | 1 |

## B. 完了フェーズの作業記録 — P6 系（関係表示・スロット・同格 等）（115 件）

- [P6-A_final_report.md](P6-A_final_report.md)
- [P6-A_relationship_matrix.md](P6-A_relationship_matrix.md)
- [P6-A_sr_diagram_readiness_audit.md](P6-A_sr_diagram_readiness_audit.md)
- [P6-A_test_matrix.md](P6-A_test_matrix.md)
- [P6-B.1_antecedent_case_matrix.md](P6-B.1_antecedent_case_matrix.md)
- [P6-B.1_antecedent_source_audit.md](P6-B.1_antecedent_source_audit.md)
- [P6-B.1_final_report.md](P6-B.1_final_report.md)
- [P6-B.1_test_matrix.md](P6-B.1_test_matrix.md)
- [P6-B.2_final_report.md](P6-B.2_final_report.md)
- [P6-B.2_referent_connector_audit.md](P6-B.2_referent_connector_audit.md)
- [P6-B.2_relationship_matrix.md](P6-B.2_relationship_matrix.md)
- [P6-B.2_test_matrix.md](P6-B.2_test_matrix.md)
- [P6-B_final_report.md](P6-B_final_report.md)
- [P6-B_relative_clause_schema_audit.md](P6-B_relative_clause_schema_audit.md)
- [P6-B_relative_relationship_matrix.md](P6-B_relative_relationship_matrix.md)
- [P6-B_test_matrix.md](P6-B_test_matrix.md)
- [P6-C_final_report.md](P6-C_final_report.md)
- [P6-C_nt_wide_audit.md](P6-C_nt_wide_audit.md)
- [P6-C_relative_connector_design.md](P6-C_relative_connector_design.md)
- [P6-C_test_matrix.md](P6-C_test_matrix.md)
- [P6-D_final_report.md](P6-D_final_report.md)
- [P6-D_relative_connector_production_audit.md](P6-D_relative_connector_production_audit.md)
- [P6-D_relative_connector_relationship_matrix.md](P6-D_relative_connector_relationship_matrix.md)
- [P6-D_test_matrix.md](P6-D_test_matrix.md)
- [P6-E_design_options.md](P6-E_design_options.md)
- [P6-E_final_report.md](P6-E_final_report.md)
- [P6-E_relationship_matrix.md](P6-E_relationship_matrix.md)
- [P6-E_visual_grammar_gap_audit.md](P6-E_visual_grammar_gap_audit.md)
- [P6-F.1_final_report.md](P6-F.1_final_report.md)
- [P6-F.1_pp_diagonal_audit.md](P6-F.1_pp_diagonal_audit.md)
- [P6-F.1_pp_relationship_matrix.md](P6-F.1_pp_relationship_matrix.md)
- [P6-F.1_test_matrix.md](P6-F.1_test_matrix.md)
- [P6-G-2_final_report.md](P6-G-2_final_report.md)
- [P6-G.10.1_object2_engine_audit.md](P6-G.10.1_object2_engine_audit.md)
- [P6-G.10.1_object2_final_report.md](P6-G.10.1_object2_final_report.md)
- [P6-G.10.1_object2_relationship_matrix.md](P6-G.10.1_object2_relationship_matrix.md)
- [P6-G.10.1_object2_test_matrix.md](P6-G.10.1_object2_test_matrix.md)
- [P6-G.10.2_object2_final_report.md](P6-G.10.2_object2_final_report.md)
- [P6-G.10.2_object2_implementation_spec.md](P6-G.10.2_object2_implementation_spec.md)
- [P6-G.10.2_object2_repair_design.md](P6-G.10.2_object2_repair_design.md)
- [P6-G.10.2_object2_test_matrix.md](P6-G.10.2_object2_test_matrix.md)
- [P6-G.10.3_object2_implementation_final_report.md](P6-G.10.3_object2_implementation_final_report.md)
- [P6-G.10.4_object2_residual_audit.md](P6-G.10.4_object2_residual_audit.md)
- [P6-G.10.4_object2_residual_final_report.md](P6-G.10.4_object2_residual_final_report.md)
- [P6-G.10.4_object2_residual_relationship_matrix.md](P6-G.10.4_object2_residual_relationship_matrix.md)
- [P6-G.10.4_object2_residual_test_matrix.md](P6-G.10.4_object2_residual_test_matrix.md)
- [P6-G.10.5_group_second_clause_audit.md](P6-G.10.5_group_second_clause_audit.md)
- [P6-G.10.5_group_second_clause_final_report.md](P6-G.10.5_group_second_clause_final_report.md)
- [P6-G.10.5_group_second_clause_repair_design.md](P6-G.10.5_group_second_clause_repair_design.md)
- [P6-G.10.5_group_second_clause_test_matrix.md](P6-G.10.5_group_second_clause_test_matrix.md)
- [P6-G.10.6_group_second_clause_implementation_final_report.md](P6-G.10.6_group_second_clause_implementation_final_report.md)
- [P6-G.11.1_slot_content_audit.md](P6-G.11.1_slot_content_audit.md)
- [P6-G.11.1_slot_content_final_report.md](P6-G.11.1_slot_content_final_report.md)
- [P6-G.11.1_slot_content_relationship_matrix.md](P6-G.11.1_slot_content_relationship_matrix.md)
- [P6-G.11.1_slot_content_test_matrix.md](P6-G.11.1_slot_content_test_matrix.md)
- [P6-G.11.2_slot_content_final_report.md](P6-G.11.2_slot_content_final_report.md)
- [P6-G.11.2_slot_content_implementation_spec.md](P6-G.11.2_slot_content_implementation_spec.md)
- [P6-G.11.2_slot_content_repair_design.md](P6-G.11.2_slot_content_repair_design.md)
- [P6-G.11.2_slot_content_test_matrix.md](P6-G.11.2_slot_content_test_matrix.md)
- [P6-G.11.3_slot_content_implementation_report.md](P6-G.11.3_slot_content_implementation_report.md)
- [P6-G.11.4_final_report.md](P6-G.11.4_final_report.md)
- [P6-G.11.4_residual_decision_matrix.md](P6-G.11.4_residual_decision_matrix.md)
- [P6-G.11.4_residual_reachability_audit.md](P6-G.11.4_residual_reachability_audit.md)
- [P6-G.11.4_residual_relationship_matrix.md](P6-G.11.4_residual_relationship_matrix.md)
- [P6-G.12_final_report.md](P6-G.12_final_report.md)
- [P6-G.12_release_readiness_audit.md](P6-G.12_release_readiness_audit.md)
- [P6-G.12_release_risk_register.md](P6-G.12_release_risk_register.md)
- [P6-G.12_release_test_matrix.md](P6-G.12_release_test_matrix.md)
- [P6-G.1_final_report.md](P6-G.1_final_report.md)
- [P6-G.1_priority_matrix.md](P6-G.1_priority_matrix.md)
- [P6-G.1_relationship_coverage_matrix.md](P6-G.1_relationship_coverage_matrix.md)
- [P6-G.1_visual_grammar_gap_audit.md](P6-G.1_visual_grammar_gap_audit.md)
- [P6-G.2_final_report.md](P6-G.2_final_report.md)
- [P6-G.2_io_raised_platform_audit.md](P6-G.2_io_raised_platform_audit.md)
- [P6-G.2_io_relationship_matrix.md](P6-G.2_io_relationship_matrix.md)
- [P6-G.2_test_matrix.md](P6-G.2_test_matrix.md)
- [P6-G.4_content_clause_repair_design.md](P6-G.4_content_clause_repair_design.md)
- [P6-G.4_content_clause_root_cause_audit.md](P6-G.4_content_clause_root_cause_audit.md)
- [P6-G.4_design_final_report.md](P6-G.4_design_final_report.md)
- [P6-G.4_final_report.md](P6-G.4_final_report.md)
- [P6-G.4_implementation_final_report.md](P6-G.4_implementation_final_report.md)
- [P6-G.4_implementation_spec.md](P6-G.4_implementation_spec.md)
- [P6-G.4_implementation_test_matrix.md](P6-G.4_implementation_test_matrix.md)
- [P6-G.4_repair_design_review.md](P6-G.4_repair_design_review.md)
- [P6-G.4_test_matrix.md](P6-G.4_test_matrix.md)
- [P6-G.5_current_relationship_coverage_matrix.md](P6-G.5_current_relationship_coverage_matrix.md)
- [P6-G.5_final_report.md](P6-G.5_final_report.md)
- [P6-G.5_priority_matrix.md](P6-G.5_priority_matrix.md)
- [P6-G.5_remaining_visual_grammar_gap_audit.md](P6-G.5_remaining_visual_grammar_gap_audit.md)
- [P6-G.6.1_apposition_audit.md](P6-G.6.1_apposition_audit.md)
- [P6-G.6.1_apposition_final_report.md](P6-G.6.1_apposition_final_report.md)
- [P6-G.6.1_apposition_relationship_matrix.md](P6-G.6.1_apposition_relationship_matrix.md)
- [P6-G.6.1_apposition_test_matrix.md](P6-G.6.1_apposition_test_matrix.md)
- [P6-G.6.2_apposition_final_report.md](P6-G.6.2_apposition_final_report.md)
- [P6-G.6.2_apposition_implementation_spec.md](P6-G.6.2_apposition_implementation_spec.md)
- [P6-G.6.2_apposition_repair_design.md](P6-G.6.2_apposition_repair_design.md)
- [P6-G.6.2_apposition_test_matrix.md](P6-G.6.2_apposition_test_matrix.md)
- [P6-G.6.3_apposition_implementation_final_report.md](P6-G.6.3_apposition_implementation_final_report.md)
- [P6-G.7_final_report.md](P6-G.7_final_report.md)
- [P6-G.7_priority_matrix.md](P6-G.7_priority_matrix.md)
- [P6-G.7_relationship_coverage_matrix.md](P6-G.7_relationship_coverage_matrix.md)
- [P6-G.7_remaining_gap_audit.md](P6-G.7_remaining_gap_audit.md)
- [P6-G.8.1_nominalized_clause_audit.md](P6-G.8.1_nominalized_clause_audit.md)
- [P6-G.8.1_nominalized_clause_final_report.md](P6-G.8.1_nominalized_clause_final_report.md)
- [P6-G.8.1_nominalized_clause_relationship_matrix.md](P6-G.8.1_nominalized_clause_relationship_matrix.md)
- [P6-G.8.1_nominalized_clause_test_matrix.md](P6-G.8.1_nominalized_clause_test_matrix.md)
- [P6-G.8.2_nominalized_clause_final_report.md](P6-G.8.2_nominalized_clause_final_report.md)
- [P6-G.8.2_nominalized_clause_implementation_spec.md](P6-G.8.2_nominalized_clause_implementation_spec.md)
- [P6-G.8.2_nominalized_clause_repair_design.md](P6-G.8.2_nominalized_clause_repair_design.md)
- [P6-G.8.2_nominalized_clause_test_matrix.md](P6-G.8.2_nominalized_clause_test_matrix.md)
- [P6-G.8.3_nominalized_clause_implementation_final_report.md](P6-G.8.3_nominalized_clause_implementation_final_report.md)
- [P6-G.9_final_report.md](P6-G.9_final_report.md)
- [P6-G.9_priority_matrix.md](P6-G.9_priority_matrix.md)
- [P6-G.9_relationship_coverage_matrix.md](P6-G.9_relationship_coverage_matrix.md)
- [P6-G.9_remaining_gap_audit.md](P6-G.9_remaining_gap_audit.md)

## B. 完了フェーズの作業記録 — P5 系（視覚文法・レンダラー）（16 件）

- [P5-C.1_final_report.md](P5-C.1_final_report.md)
- [P5-C.1_test_matrix.md](P5-C.1_test_matrix.md)
- [P5-C.1_visual_grammar_hardening.md](P5-C.1_visual_grammar_hardening.md)
- [P5-C_final_report.md](P5-C_final_report.md)
- [P5-C_findings.md](P5-C_findings.md)
- [P5-C_visual_grammar_audit.md](P5-C_visual_grammar_audit.md)
- [P5-C_visual_matrix.md](P5-C_visual_matrix.md)
- [P5-D.1_final_report.md](P5-D.1_final_report.md)
- [P5-D.1_sr_coverage_boundary.md](P5-D.1_sr_coverage_boundary.md)
- [P5-D.1_test_matrix.md](P5-D.1_test_matrix.md)
- [P5-D_final_report.md](P5-D_final_report.md)
- [P5-D_test_matrix.md](P5-D_test_matrix.md)
- [P5-D_visual_grammar_core.md](P5-D_visual_grammar_core.md)
- [P5-E_final_report.md](P5-E_final_report.md)
- [P5-E_renderer_coverage.md](P5-E_renderer_coverage.md)
- [P5-E_test_matrix.md](P5-E_test_matrix.md)

## B. 完了フェーズの作業記録 — P40 系（9 件）

- [P40-C5_final_report.md](P40-C5_final_report.md)
- [P40-C_final_report.md](P40-C_final_report.md)
- [P40-E_final_report.md](P40-E_final_report.md)
- [P40-F_final_report.md](P40-F_final_report.md)
- [P40-G_final_report.md](P40-G_final_report.md)
- [P40-H_final_report.md](P40-H_final_report.md)
- [P40-I2_final_report.md](P40-I2_final_report.md)
- [P40-I_final_report.md](P40-I_final_report.md)
- [P40-J_final_report.md](P40-J_final_report.md)

## B. 完了フェーズの作業記録 — C-17 系（構造図・視覚設計）（7 件）

- [C-17-S2A_visual_design_freeze.md](C-17-S2A_visual_design_freeze.md)
- [C-17-S2C_design_decisions.md](C-17-S2C_design_decisions.md)
- [C-17-S2D_visual_grammar_redesign.md](C-17-S2D_visual_grammar_redesign.md)
- [C-17-S4_final_report.md](C-17-S4_final_report.md)
- [C-17-S5A_design_report.md](C-17-S5A_design_report.md)
- [C-17-S5B_qa_report.md](C-17-S5B_qa_report.md)
- [C-17-structural-diagram-split-design.md](C-17-structural-diagram-split-design.md)

## B. 完了フェーズの作業記録 — SF 系（構造フロー）（18 件）

- [SF-1-structure-audit.md](SF-1-structure-audit.md)
- [SF-10-relation-display-design.md](SF-10-relation-display-design.md)
- [SF-11-relation-transport-implementation.md](SF-11-relation-transport-implementation.md)
- [SF-12-relation-visual-refinement.md](SF-12-relation-visual-refinement.md)
- [SF-13-frame-connector-design-audit.md](SF-13-frame-connector-design-audit.md)
- [SF-14-frame-connector-implementation-structure.md](SF-14-frame-connector-implementation-structure.md)
- [SF-15-structure-flow-layout-redesign.md](SF-15-structure-flow-layout-redesign.md)
- [SF-16-structure-flow-layout-implementation.md](SF-16-structure-flow-layout-implementation.md)
- [SF-17-structure-flow-2row-layout-design.md](SF-17-structure-flow-2row-layout-design.md)
- [SF-18-structure-flow-2row-implementation.md](SF-18-structure-flow-2row-implementation.md)
- [SF-19-structure-flow-vertical-implementation.md](SF-19-structure-flow-vertical-implementation.md)
- [SF-2-john-6-37-structure.md](SF-2-john-6-37-structure.md)
- [SF-20-structure-flow-baseline-freeze.md](SF-20-structure-flow-baseline-freeze.md)
- [SF-27-long-branch-summary.md](SF-27-long-branch-summary.md)
- [SF-29-first-layer-robust-layout.md](SF-29-first-layer-robust-layout.md)
- [SF-3-structure-flow-design.md](SF-3-structure-flow-design.md)
- [SF-8-relation-flow-audit.md](SF-8-relation-flow-audit.md)
- [SF-9-relation-data-audit.md](SF-9-relation-data-audit.md)

## C. その他の設計・仕様・監査（76 件）

Reading Japanese の方針・設計、discourse、daily-verse、検索、StudyPanel の範囲定義など、シリーズ接頭辞を持たない文書群。現行仕様として生きているものと完了記録が混在するため、個別の判断なしに archive へ移さないこと。

- [alphautos-morph-rule-design.md](alphautos-morph-rule-design.md)
- [bible-data-japanese-policy.md](bible-data-japanese-policy.md)
- [church-calendar-season-resolver.md](church-calendar-season-resolver.md)
- [context-layer.md](context-layer.md)
- [daily-verse-first100.md](daily-verse-first100.md)
- [daily-verse-schema.md](daily-verse-schema.md)
- [daily-verse-selection-policy.md](daily-verse-selection-policy.md)
- [daily-verse-slots.md](daily-verse-slots.md)
- [daily-verse-year-plan.md](daily-verse-year-plan.md)
- [demonstrative-morph-rule-design.md](demonstrative-morph-rule-design.md)
- [design-qa-process.md](design-qa-process.md)
- [discourse-analysis-design.md](discourse-analysis-design.md)
- [discourse-boundary-classification.md](discourse-boundary-classification.md)
- [discourse-connection-representation-audit.md](discourse-connection-representation-audit.md)
- [discourse-feature-closure-audit.md](discourse-feature-closure-audit.md)
- [discourse-nested-unit-ux-audit.md](discourse-nested-unit-ux-audit.md)
- [discourse-semantic-relation-audit.md](discourse-semantic-relation-audit.md)
- [discourse-unit-representation-audit.md](discourse-unit-representation-audit.md)
- [discourse-unit-representation-schema.md](discourse-unit-representation-schema.md)
- [discovery-theme-resolver.md](discovery-theme-resolver.md)
- [discovery-themes-spec.md](discovery-themes-spec.md)
- [display-label.md](display-label.md)
- [display-policy-design.md](display-policy-design.md)
- [external-bible-view-spec.md](external-bible-view-spec.md)
- [flow-rendering.md](flow-rendering.md)
- [flow-tree-adapter-design.md](flow-tree-adapter-design.md)
- [flow-tree-representation-schema.md](flow-tree-representation-schema.md)
- [interrogative-relative-morph-rule-design.md](interrogative-relative-morph-rule-design.md)
- [morph-gap-resolution-design.md](morph-gap-resolution-design.md)
- [morph-rule-engine-design.md](morph-rule-engine-design.md)
- [morph-rule-engine-implementation-spec.md](morph-rule-engine-implementation-spec.md)
- [morph-rule-engine-v1-frozen.md](morph-rule-engine-v1-frozen.md)
- [neighborhood-view-design.md](neighborhood-view-design.md)
- [phase-N-ux-audit-freeze.md](phase-N-ux-audit-freeze.md)
- [phrase-reading.md](phrase-reading.md)
- [phrase-rendering.md](phrase-rendering.md)
- [presentation-policy.md](presentation-policy.md)
- [reading-flow-gloss-policy.md](reading-flow-gloss-policy.md)
- [reading-hint-candidate-selection-rules.md](reading-hint-candidate-selection-rules.md)
- [reading-hint-data-model-design.md](reading-hint-data-model-design.md)
- [reading-hint-editorial-specification.md](reading-hint-editorial-specification.md)
- [reading-hint-unit-trigger-design.md](reading-hint-unit-trigger-design.md)
- [reading-japanese-adoption-decision-framework.md](reading-japanese-adoption-decision-framework.md)
- [reading-japanese-baseline.md](reading-japanese-baseline.md)
- [reading-japanese-builder-adoption-integration-freeze.md](reading-japanese-builder-adoption-integration-freeze.md)
- [reading-japanese-builder-design.md](reading-japanese-builder-design.md)
- [reading-japanese-data-layer-boundary-freeze.md](reading-japanese-data-layer-boundary-freeze.md)
- [reading-japanese-data-role-migration-freeze.md](reading-japanese-data-role-migration-freeze.md)
- [reading-japanese-editorial-review-framework.md](reading-japanese-editorial-review-framework.md)
- [reading-japanese-improvement-framework.md](reading-japanese-improvement-framework.md)
- [reading-japanese-policy.md](reading-japanese-policy.md)
- [reading-japanese-quality-v1.md](reading-japanese-quality-v1.md)
- [reading-lexicon.md](reading-lexicon.md)
- [reading-observation-information-architecture.md](reading-observation-information-architecture.md)
- [reading-policy.md](reading-policy.md)
- [reading-semantic.md](reading-semantic.md)
- [reading-word-separation-design.md](reading-word-separation-design.md)
- [reflexive-morph-rule-design.md](reflexive-morph-rule-design.md)
- [relative-morph-rule-design.md](relative-morph-rule-design.md)
- [relative-syntax-rule-design.md](relative-syntax-rule-design.md)
- [search-corpus-presentation-spec.md](search-corpus-presentation-spec.md)
- [search-design-system.md](search-design-system.md)
- [semantic-completion-design.md](semantic-completion-design.md)
- [semantic-domain.md](semantic-domain.md)
- [studypanel-layer3-audit-inventory.md](studypanel-layer3-audit-inventory.md)
- [studypanel-layer3-display-contract.md](studypanel-layer3-display-contract.md)
- [studypanel-layer3-implementation-gap-audit.md](studypanel-layer3-implementation-gap-audit.md)
- [studypanel-layer3-information-audit.md](studypanel-layer3-information-audit.md)
- [studypanel-scope-definition.md](studypanel-scope-definition.md)
- [syntax-completion-design.md](syntax-completion-design.md)
- [syntax-evidence-audit-batching.md](syntax-evidence-audit-batching.md)
- [syntax-gap-boundary-freeze.md](syntax-gap-boundary-freeze.md)
- [syntax-gap-resolution-design.md](syntax-gap-resolution-design.md)
- [tis-morph-rule-design.md](tis-morph-rule-design.md)
- [todays-discovery-selection-spec.md](todays-discovery-selection-spec.md)
- [verse-representation-design.md](verse-representation-design.md)
