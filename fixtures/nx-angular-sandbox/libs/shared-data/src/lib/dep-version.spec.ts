import fs from 'node:fs';
import path from 'node:path';

describe('dependency versions', () => {
  it('pins rxjs to the supported ~7.8 range', () => {
    const packageJsonPath = path.join(__dirname, '../../../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
      dependencies: Record<string, string>;
    };

    expect(packageJson.dependencies['rxjs']).toMatch(/^~7\.8\./);
  });
});
