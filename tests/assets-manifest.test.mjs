import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  MAX_PNG_BYTES,
  validateManifest
} from '../scripts/validate-assets.mjs';

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

function writePngHeader(filePath, colorType, size = 26) {
  const buffer = Buffer.alloc(size);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer);
  buffer.writeUInt32BE(1, 16);
  buffer.writeUInt32BE(1, 20);
  buffer[24] = 8;
  buffer[25] = colorType;
  fs.writeFileSync(filePath, buffer);
}

test('checked-in manifest passes structural and file validation', () => {
  assert.deepEqual(validateManifest(manifest, assetRoot), []);
});

test('representative placeholder IDs retain their stable paths', () => {
  const expected = {
    'character.player.blue': 'sprites/characters/player-blue.png',
    'enemy.bear.gray': 'sprites/enemies/bear-gray.png',
    'environment.tree.snowy-pine': 'sprites/environment/tree-snowy-pine.png',
    'environment.fence.timber': 'sprites/environment/fence-timber.png',
    'building.turret.crossbow': 'sprites/buildings/turret-crossbow.png',
    'building.furnace.camp': 'sprites/buildings/furnace-camp.png',
    'resource.meat.single': 'sprites/resources/meat-single.png',
    'resource.wood.stack': 'sprites/resources/wood-stack.png',
    'ui.icon.resource-wood': 'ui/icons/resource-wood.png',
    'ui.icon.resource-meat': 'ui/icons/resource-meat.png',
    'ui.icon.resource-money': 'ui/icons/resource-money.png'
  };
  const materialized = Object.fromEntries(
    manifest.assets
      .filter(asset => asset.status !== 'needed')
      .map(asset => [asset.id, asset.path])
  );

  assert.deepEqual(materialized, expected);
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

test('requires alpha-bearing PNGs for materialized assets', () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'whiteout-assets-'));
  try {
    writePngHeader(path.join(temporaryRoot, 'rgb.png'), 2);
    const candidate = cloneManifest();
    candidate.assets = [{
      ...candidate.assets[0],
      path: 'rgb.png',
      canvas: { width: 1, height: 1 }
    }];
    assert.match(
      validateManifest(candidate, temporaryRoot).join('\n'),
      /must contain an alpha channel/
    );
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test('rejects materialized PNGs above the prototype size limit', () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'whiteout-assets-'));
  try {
    writePngHeader(
      path.join(temporaryRoot, 'oversized.png'),
      6,
      MAX_PNG_BYTES + 1
    );
    const candidate = cloneManifest();
    candidate.assets = [{
      ...candidate.assets[0],
      path: 'oversized.png',
      canvas: { width: 1, height: 1 }
    }];
    assert.match(
      validateManifest(candidate, temporaryRoot).join('\n'),
      /maximum is/
    );
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
