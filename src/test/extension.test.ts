/**
 * Simple test suite that doesn't rely on VS Code API
 */
import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';

// Use Mocha directly instead of VS Code's test framework
describe('DotVault Extension', function() {
  it('should have a valid package.json', function() {
    const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
    assert.ok(fs.existsSync(packageJsonPath), 'package.json should exist');
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    assert.ok(packageJson.name === 'dot-vault', 'Package name should be dot-vault');
    assert.ok(packageJson.version, 'Version should be defined');
  });

  it('should define extension commands', function() {
    const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    assert.ok(packageJson.contributes && packageJson.contributes.commands, 'Commands should be defined');
    
    const commandNames = packageJson.contributes.commands.map((cmd: any) => cmd.command);
    assert.ok(commandNames.includes('envsync.login'), 'Login command should be defined');
    assert.ok(commandNames.includes('envsync.sync'), 'Sync command should be defined');
    assert.ok(commandNames.includes('envsync.restore'), 'Restore command should be defined');
    assert.ok(commandNames.includes('envsync.clear'), 'Clear command should be defined');
  });

  it('should pass a basic test', function() {
    assert.ok(true, 'Basic test passes');
  });
});
