/**
 * Extension test suite
 */
import * as assert from 'assert';
import * as vscode from 'vscode';

// Import the extension for testing
// import * as extension from '../extension';

suite('Env Vault Extension Test Suite', () => {
  vscode.window.showInformationMessage('Starting Env Vault tests');

  test('Extension should be present', () => {
    assert.ok(vscode.extensions.getExtension('AumTamboli.env-vault'));
  });

  test('Commands should be registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('envsync.login'));
    assert.ok(commands.includes('envsync.sync'));
    assert.ok(commands.includes('envsync.restore'));
    assert.ok(commands.includes('envsync.clear'));
    assert.ok(commands.includes('supabase-github.logout'));
  });

  // Example of a unit test for encryption functions
  test('Placeholder test for encryption functionality', () => {
    // This is a placeholder test that will be implemented later
    // when encryption functions are properly exported for testing
    assert.ok(true, 'Placeholder test passes');
  });
});
