import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { validateManifest } from '../scripts/validate-assets.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '..');
const assetRoot = path.join(repoRoot, 'public', 'assets');
const manifest = JSON.parse(
  fs.readFileSync(path.join(assetRoot, 'manifest.json'), 'utf8')
);

function cloneManifest() {
  return structuredClone(manifest);
}

function expectError(mutator, pattern) {
  const candidate = cloneManifest();
  mutator(candidate);
  const errors = validateManifest(candidate, assetRoot, { checkFiles: false });
  assert.match(errors.join('\n'), pattern);
}

test('checked-in manifest passes structural and file validation', () => {
  assert.deepEqual(validateManifest(manifest, assetRoot), []);
});

test('rejects missing required fields', () => {
  expectError(candidate => {
    delete candidate.assets[0].role;
  }, /missing required field "role"/);
});

test('rejects unsupported statuses', () => {
  expectError(candidate => {
    candidate.assets[0].status = 'almost-done';
  }, /status "almost-done" is not allowed/);
});

test('rejects origins outside normalized bounds', () => {
  expectError(candidate => {
    candidate.assets[0].origin.x = 1.1;
  }, /origin x and y must be normalized/);
});

test('rejects non-positive dimensions', () => {
  expectError(candidate => {
    candidate.assets[0].canvas.width = 0;
  }, /canvas width and height must be positive integers/);
});

test('rejects duplicate ids', () => {
  expectError(candidate => {
    candidate.assets[1].id = candidate.assets[0].id;
  }, /duplicate id/);
});

test('rejects duplicate paths', () => {
  expectError(candidate => {
    candidate.assets[1].path = candidate.assets[0].path;
  }, /duplicate path/);
});

test('requires creator and source metadata for materialized assets', () => {
  expectError(candidate => {
    candidate.assets[0].status = 'placeholder';
    candidate.assets[0].license.creator = null;
    candidate.assets[0].license.source = null;
  }, /license\.creator is required[\s\S]*license\.source is required/);
});

test('rejects unsafe or non-PNG paths', () => {
  expectError(candidate => {
    candidate.assets[0].path = '../player.svg';
  }, /safe normalized relative PNG path/);
});
