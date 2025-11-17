const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const moduleRoot = path.join(projectRoot, 'node_modules', 'expo-module-scripts');
const baseJsonPath = path.join(moduleRoot, 'tsconfig.base.json');
const shimPath = path.join(moduleRoot, 'tsconfig.base');

function ensureExpoTsconfigShim() {
  if (!fs.existsSync(baseJsonPath)) {
    console.warn('[postinstall] expo-module-scripts is not installed; skipping TS config shim.');
    return;
  }

  try {
    if (!fs.existsSync(moduleRoot)) {
      fs.mkdirSync(moduleRoot, { recursive: true });
    }

    const sourceContents = fs.readFileSync(baseJsonPath, 'utf8');
    const shimExists = fs.existsSync(shimPath);
    const shimContents = shimExists ? fs.readFileSync(shimPath, 'utf8') : '';

    if (!shimExists || shimContents !== sourceContents) {
      fs.writeFileSync(shimPath, sourceContents, 'utf8');
      console.log('[postinstall] Created expo-module-scripts/tsconfig.base shim for TypeScript.');
    }
  } catch (error) {
    console.warn('[postinstall] Failed to create tsconfig.base shim:', error);
  }
}

ensureExpoTsconfigShim();
