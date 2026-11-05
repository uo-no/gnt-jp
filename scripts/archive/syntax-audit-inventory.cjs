#!/usr/bin/env node
'use strict';

// Read-only inventory for batching the StudyPanel syntax-evidence audit.
// A missing required_signals gate is a REVIEW CANDIDATE, not automatically a bug:
// many types are single-cue or require contextual linguistic judgement.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const REGISTRY_PATH = path.join(ROOT, 'public/assets/data/syntax-registry.json');
const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));

function collectTypes(value, out = []) {
  if (!value || typeof value !== 'object') return out;
  if (typeof value.id === 'string' && value.detection && value.xsc) out.push(value);
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') collectTypes(child, out);
  }
  return out;
}

const types = collectTypes(registry);
const idCounts = new Map();
for (const type of types) idCounts.set(type.id, (idCounts.get(type.id) || 0) + 1);

function familyOf(id) {
  const dot = id.indexOf('.');
  return dot < 0 ? '(other)' : id.slice(0, dot);
}

const rows = types.map(type => {
  const conditions = Array.isArray(type.detection.conditions) ? type.detection.conditions : [];
  const exclusions = Array.isArray(type.detection.exclusions) ? type.detection.exclusions : [];
  const signals = Array.isArray(type.xsc.signals) ? type.xsc.signals : [];
  const conditionIds = conditions.map(c => c && c.id).filter(Boolean);
  const signalIds = signals.map(s => s && s.id).filter(Boolean);
  const required = Array.isArray(type.detection.required_signals) ? type.detection.required_signals : [];
  const requiredGroups = Array.isArray(type.detection.required_signal_groups) ? type.detection.required_signal_groups : [];
  const signalSet = new Set(signalIds);
  const conditionSet = new Set(conditionIds);
  return {
    id: type.id,
    family: familyOf(type.id),
    status: type.status || '',
    priority: type.priority ?? null,
    conditionCount: conditions.length,
    exclusionCount: exclusions.length,
    signalCount: signals.length,
    requiredSignals: required,
    requiredSignalGroups: requiredGroups,
    requiredSignalGroupMappingIssues: requiredGroups.flatMap((group, groupIndex) =>
      Array.isArray(group) ? group.filter(id => !conditionSet.has(id)).map(id => ({ groupIndex, id })) : [{ groupIndex, id: '(group is not an array)' }]),
    hasRequiredGate: required.length > 0 || requiredGroups.length > 0,
    missingRequiredSignalMappings: required.filter(id => !signalSet.has(id)),
    conditionIdsWithoutScoredSignal: [...new Set(conditionIds.filter(id => !signalSet.has(id)))],
    requiredSignalsWithoutCondition: required.filter(id => !conditionSet.has(id)),
    conditionsWithoutCheck: conditions.filter(c => !c || typeof c.check !== 'string' || !c.check.trim()).map(c => c?.id || '(missing id)'),
    exclusionsWithoutCheck: exclusions.filter(c => !c || typeof c.check !== 'string' || !c.check.trim()).map(c => c?.id || '(missing id)'),
    missingRequiredGate: conditions.length > 0 && required.length === 0 && requiredGroups.length === 0,
    duplicateId: idCounts.get(type.id) > 1
  };
});

const byFamily = new Map();
for (const row of rows) {
  if (!byFamily.has(row.family)) byFamily.set(row.family, []);
  byFamily.get(row.family).push(row);
}
const sum = list => list.reduce((n, x) => n + x, 0);
const summary = {
  registry: 'public/assets/data/syntax-registry.json',
  registryVersion: registry.meta?.version || null,
  totalTypes: rows.length,
  uniqueTypeIds: idCounts.size,
  duplicateTypeIds: [...idCounts].filter(([, count]) => count > 1).map(([id, count]) => ({ id, count })),
  typesWithConditions: sum(rows.map(r => Number(r.conditionCount > 0))),
  typesWithRequiredSignals: sum(rows.map(r => Number(r.requiredSignals.length > 0))),
  typesWithRequiredSignalGroups: sum(rows.map(r => Number(r.requiredSignalGroups.length > 0))),
  typesWithAnyRequiredGate: sum(rows.map(r => Number(r.hasRequiredGate))),
  typesWithRequiredSignalGroupMappingIssues: sum(rows.map(r => Number(r.requiredSignalGroupMappingIssues.length > 0))),
  reviewCandidatesMissingRequiredGate: sum(rows.map(r => Number(r.missingRequiredGate))),
  typesWithUnmappedConditionIds: sum(rows.map(r => Number(r.conditionIdsWithoutScoredSignal.length > 0))),
  totalUnmappedConditionIds: sum(rows.map(r => r.conditionIdsWithoutScoredSignal.length)),
  typesWithUnmappedRequiredSignals: sum(rows.map(r => Number(r.missingRequiredSignalMappings.length > 0))),
  conditionsWithoutCheck: sum(rows.map(r => r.conditionsWithoutCheck.length)),
  exclusionsWithoutCheck: sum(rows.map(r => r.exclusionsWithoutCheck.length)),
  byFamily: [...byFamily.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([family, list]) => ({
    family,
    total: list.length,
    gated: sum(list.map(r => Number(r.hasRequiredGate))),
    reviewCandidates: sum(list.map(r => Number(r.missingRequiredGate))),
    mappingIssues: sum(list.map(r => Number(r.conditionIdsWithoutScoredSignal.length > 0)))
  }))
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ summary, rows }, null, 2));
} else {
  console.log('StudyPanel syntax evidence inventory (read-only)');
  console.log('Missing required_signals is a review queue, not an automatic defect.');
  console.log('');
  console.log(`Registry types: ${summary.totalTypes}; unique IDs: ${summary.uniqueTypeIds}`);
  console.log(`Types with required_signals (AND): ${summary.typesWithRequiredSignals}`);
  console.log(`Types with required_signal_groups (OR of AND groups): ${summary.typesWithRequiredSignalGroups}`);
  console.log(`Types with either required gate: ${summary.typesWithAnyRequiredGate}`);
  console.log(`Review candidates without a required gate: ${summary.reviewCandidatesMissingRequiredGate}`);
  console.log(`Types with condition/signal mapping issues: ${summary.typesWithUnmappedConditionIds} (${summary.totalUnmappedConditionIds} unmapped condition IDs)`);
  console.log(`Required signals without a scored signal: ${summary.typesWithUnmappedRequiredSignals}`);
  console.log(`Types with required_signal_groups mapping issues: ${summary.typesWithRequiredSignalGroupMappingIssues}`);
  console.log(`Conditions without check expression: ${summary.conditionsWithoutCheck}`);
  console.log(`Exclusions without check expression: ${summary.exclusionsWithoutCheck}`);
  console.log('');
  console.log('Family | Types | Gated | Gate review queue | Mapping issues');
  console.log('--- | ---: | ---: | ---: | ---:');
  for (const family of summary.byFamily) {
    console.log(`${family.family} | ${family.total} | ${family.gated} | ${family.reviewCandidates} | ${family.mappingIssues}`);
  }
  console.log('');
  console.log('Next batch candidates (by family; inspect semantics before changing):');
  for (const [family, list] of [...byFamily.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const candidates = list.filter(row => row.missingRequiredGate);
    if (candidates.length) console.log(`- ${family} (${candidates.length}): ${candidates.map(row => row.id).join(', ')}`);
  }
  console.log('');
  if (summary.duplicateTypeIds.length) console.log('DUPLICATE TYPE IDS: ' + JSON.stringify(summary.duplicateTypeIds));
  if (summary.typesWithUnmappedConditionIds || summary.typesWithUnmappedRequiredSignals || summary.typesWithRequiredSignalGroupMappingIssues || summary.conditionsWithoutCheck || summary.exclusionsWithoutCheck) {
    console.log('Review the detailed --json output for mapping/handler issues.');
    process.exitCode = 1;
  }
}
