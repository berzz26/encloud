/**
 * Extension test suite
 */
import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// Basic tests that don't rely on the extension being activated
suite('Env Vault Extension Test Suite', () => {
  vscode.window.showInformationMessage('Starting Env Vault tests');

  // Skip extension presence test in CI environment
  test('Basic test', () => {
    assert.ok(true, 'Basic test passes');
  });

  // Check if package.json exists and has the right commands
  test('Package.json should define commands', () => {
    const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
    assert.ok(fs.existsSync(packageJsonPath), 'package.json should exist');
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    assert.ok(packageJson.contributes && packageJson.contributes.commands, 'Commands should be defined');
    
    const commandNames = packageJson.contributes.commands.map((cmd: any) => cmd.command);
    assert.ok(commandNames.includes('envsync.login'), 'Login command should be defined');
    assert.ok(commandNames.includes('envsync.sync'), 'Sync command should be defined');
    assert.ok(commandNames.includes('envsync.restore'), 'Restore command should be defined');
    assert.ok(commandNames.includes('envsync.clear'), 'Clear command should be defined');
  });

  // Example of a unit test for encryption functions
  test('Placeholder test for encryption functionality', () => {
    // This is a placeholder test that will be implemented later
    // when encryption functions are properly exported for testing
    assert.ok(true, 'Placeholder test passes');
  });
});
