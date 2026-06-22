import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ALLOWED_STATUSES = new Set([
  'needed',
  'placeholder',
  'review-ready',
  'final'
]);

const REQUIRED_ASSET_FIELDS = [
  'id',
  'role',
  'category',
  'path',
  'canvas',
  'origin',
  'status',
  'license',
  'notes'
];

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
]);

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function isNormalizedNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function readPngDimensions(filePath) {
  const header = Buffer.alloc(24);
  const handle = fs.openSync(filePath, 'r');

  try {
    const bytesRead = fs.readSync(handle, header, 0, header.length, 0);
    if (bytesRead < header.length || !header.subarray(0, 8).equals(PNG_SIGNATURE)) {
      throw new Error('file is not a valid PNG');
    }

    return {
      width: header.readUInt32BE(16),
      height: header.readUInt32BE(20)
    };
  } finally {
    fs.closeSync(handle);
  }
}

export function validateManifest(manifest, assetRoot, options = {}) {
  const errors = [];
  const checkFiles = options.checkFiles ?? true;

  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return ['manifest root must be an object'];
  }

  if (!isPositiveInteger(manifest.manifestVersion)) {
    errors.push('manifestVersion must be a positive integer');
  }
  if (!isNonEmptyString(manifest.project)) {
    errors.push('project must be a non-empty string');
  }
  if (!isNonEmptyString(manifest.basePath)) {
    errors.push('basePath must be a non-empty string');
  }
  if (!Array.isArray(manifest.assets) || manifest.assets.length === 0) {
    errors.push('assets must be a non-empty array');
    return errors;
  }

  const ids = new Set();
  const paths = new Set();

  manifest.assets.forEach((asset, index) => {
    const label = isNonEmptyString(asset?.id) ? asset.id : `assets[${index}]`;

    if (!asset || typeof asset !== 'object' || Array.isArray(asset)) {
      errors.push(`${label}: asset must be an object`);
      return;
    }

    for (const field of REQUIRED_ASSET_FIELDS) {
      if (!(field in asset)) {
        errors.push(`${label}: missing required field "${field}"`);
      }
    }

    if (!isNonEmptyString(asset.id)) {
      errors.push(`${label}: id must be a non-empty string`);
    } else if (ids.has(asset.id)) {
      errors.push(`${label}: duplicate id "${asset.id}"`);
    } else {
      ids.add(asset.id);
    }

    if (!isNonEmptyString(asset.role)) {
      errors.push(`${label}: role must be a non-empty string`);
    }
    if (!isNonEmptyString(asset.category)) {
      errors.push(`${label}: category must be a non-empty string`);
    }
    if (!isNonEmptyString(asset.notes)) {
      errors.push(`${label}: notes must be a non-empty string`);
    }

    if (!isNonEmptyString(asset.path)) {
      errors.push(`${label}: path must be a non-empty string`);
    } else {
      const normalizedPath = asset.path.replaceAll('\\', '/');
      const segments = normalizedPath.split('/');
      if (
        normalizedPath !== asset.path ||
        path.posix.isAbsolute(normalizedPath) ||
        segments.includes('..') ||
        !normalizedPath.endsWith('.png')
      ) {
        errors.push(`${label}: path must be a safe normalized relative PNG path`);
      }
      if (paths.has(normalizedPath)) {
        errors.push(`${label}: duplicate path "${normalizedPath}"`);
      } else {
        paths.add(normalizedPath);
      }
    }

    if (
      !asset.canvas ||
      !isPositiveInteger(asset.canvas.width) ||
      !isPositiveInteger(asset.canvas.height)
    ) {
      errors.push(`${label}: canvas width and height must be positive integers`);
    }

    if (
      !asset.origin ||
      !isNormalizedNumber(asset.origin.x) ||
      !isNormalizedNumber(asset.origin.y)
    ) {
      errors.push(`${label}: origin x and y must be normalized numbers from 0 to 1`);
    }

    if (!ALLOWED_STATUSES.has(asset.status)) {
      errors.push(`${label}: status "${asset.status}" is not allowed`);
    }

    if (!asset.license || typeof asset.license !== 'object') {
      errors.push(`${label}: license metadata must be an object`);
    } else {
      if (!isNonEmptyString(asset.license.type)) {
        errors.push(`${label}: license.type must be a non-empty string`);
      }

      if (asset.status !== 'needed') {
        if (!isNonEmptyString(asset.license.creator)) {
          errors.push(`${label}: license.creator is required when status is "${asset.status}"`);
        }
        if (!isNonEmptyString(asset.license.source)) {
          errors.push(`${label}: license.source is required when status is "${asset.status}"`);
        }
      }
    }

    if (checkFiles && asset.status !== 'needed' && isNonEmptyString(asset.path)) {
      const filePath = path.resolve(assetRoot, asset.path);
      if (!filePath.startsWith(`${path.resolve(assetRoot)}${path.sep}`)) {
        errors.push(`${label}: resolved path escapes the asset root`);
      } else if (!fs.existsSync(filePath)) {
        errors.push(`${label}: declared asset file does not exist at "${asset.path}"`);
      } else {
        try {
          const dimensions = readPngDimensions(filePath);
          if (
            dimensions.width !== asset.canvas?.width ||
            dimensions.height !== asset.canvas?.height
          ) {
            errors.push(
              `${label}: PNG is ${dimensions.width}x${dimensions.height}, ` +
              `manifest declares ${asset.canvas?.width}x${asset.canvas?.height}`
            );
          }
        } catch (error) {
          errors.push(`${label}: ${error.message}`);
        }
      }
    }
  });

  return errors;
}

export function loadAndValidateManifest(manifestPath) {
  const absoluteManifestPath = path.resolve(manifestPath);
  const manifest = JSON.parse(fs.readFileSync(absoluteManifestPath, 'utf8'));
  return validateManifest(manifest, path.dirname(absoluteManifestPath));
}

function runCli() {
  const scriptPath = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(scriptPath), '..');
  const manifestPath = process.argv[2] ?? path.join(repoRoot, 'public', 'assets', 'manifest.json');

  let errors;
  try {
    errors = loadAndValidateManifest(manifestPath);
  } catch (error) {
    console.error(`Asset manifest validation failed: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  if (errors.length > 0) {
    console.error(`Asset manifest validation failed with ${errors.length} error(s):`);
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  console.log(`Asset manifest valid: ${manifest.assets.length} assets checked.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli();
}
