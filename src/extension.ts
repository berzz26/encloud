import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as auth from './auth';
import { runSetupWizard } from './setupWizard';
import { 
  PasswordSetup, 
  EnvFileQuickPickItem, 
  PasswordRequiredError, 
  InvalidPasswordError,
  EncryptionError,
  DecryptionError
} from './types';

/**
 * URI handler for OAuth callbacks
 */
class EnvVaultUriHandler implements vscode.UriHandler {
  /**
   * Handle the URI callback from OAuth authentication
   * @param uri The URI containing OAuth tokens
   */
  async handleUri(uri: vscode.Uri): Promise<void> {
    await auth.handleDeepLink(uri);
  }
}

/**
 * Derive an encryption key from a password and salt using PBKDF2
 * @param password The user's password
 * @param salt The salt for key derivation
 * @returns Promise resolving to the derived key
 */
async function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 100000, 32, 'sha256', (err, key) => {
      if (err) reject(new EncryptionError(`Key derivation failed: ${err.message}`));
      else resolve(key);
    });
  });
}

/**
 * Hash a password with salt using PBKDF2 for verification
 * @param password The user's password
 * @param salt The salt for password hashing
 * @returns Promise resolving to the password hash as a hex string
 */
async function hashPassword(password: string, salt: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, key) => {
      if (err) reject(new EncryptionError(`Password hashing failed: ${err.message}`));
      else resolve(key.toString('hex'));
    });
  });
}

/**
 * Prompt the user to set up a new encryption password
 * @returns Promise resolving to the password setup data
 * @throws Error if the user cancels the password setup
 */
async function setupPassword(): Promise<PasswordSetup> {
  const password = await vscode.window.showInputBox({
    prompt: 'Set up a password to encrypt your .env files (min. 8 characters)',
    password: true,
    validateInput: text => text.length < 8 ? 'Password must be at least 8 characters' : null
  });
  
  if (!password) {
    throw new PasswordRequiredError('Password is required for setup');
  }
  
  const salt = crypto.randomBytes(16);
  const verificationHash = await hashPassword(password, salt);
  
  return {
    password,
    salt: salt.toString('hex'),
    verificationHash
  };
}

/**
 * Prompt the user to enter their encryption password
 * @returns Promise resolving to the entered password
 */
async function requestPassword(): Promise<string | undefined> {
  return vscode.window.showInputBox({
    prompt: 'Enter your password to access .env files',
    password: true
  });
}

/**
 * Get the derived encryption key for a user
 * @param userId The user's ID
 * @param context The extension context
 * @returns Promise resolving to the derived encryption key
 * @throws Error if password validation fails
 */
async function getDerivedKey(userId: string): Promise<Buffer> {
  try {
    const { data, error } = await auth.supabase
      .from('users')
      .select('salt, verification_hash')
      .eq('user_id', userId)
      .single();

    if (error) {
      throw new Error(`Failed to retrieve user data: ${error.message}`);
    }

    let password: string | undefined;
    let salt: string;

    if (!data?.salt) {
      // First-time setup
      const setup = await setupPassword();
      
      const { error: upsertError } = await auth.supabase.from('users').upsert([{
        user_id: userId,
        salt: setup.salt,
        verification_hash: setup.verificationHash
      }]);
      
      if (upsertError) {
        throw new Error(`Failed to save user data: ${upsertError.message}`);
      }
      
      password = setup.password;
      salt = setup.salt;
    } else {
      // Existing user, verify password
      password = await requestPassword();
      if (!password) {
        throw new PasswordRequiredError();
      }

      salt = data.salt;
      const hash = await hashPassword(password, Buffer.from(salt, 'hex'));
      
      if (hash !== data.verification_hash) {
        throw new InvalidPasswordError();
      }
    }

    return deriveKey(password, Buffer.from(salt, 'hex'));
  } catch (error) {
    if (error instanceof PasswordRequiredError || error instanceof InvalidPasswordError) {
      throw error;
    }
    throw new Error(`Failed to get encryption key: ${(error as Error).message}`);
  }
}

/**
 * Encrypt text with the derived key
 * @param text The text to encrypt
 * @param key The encryption key
 * @returns The encrypted text as a string (IV:encrypted)
 */
function encrypt(text: string, key: Buffer): string {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    throw new EncryptionError(`Encryption failed: ${(error as Error).message}`);
  }
}

/**
 * Decrypt text with the derived key
 * @param payload The encrypted payload (IV:encrypted)
 * @param key The encryption key
 * @returns The decrypted text
 */
function decrypt(payload: string, key: Buffer): string {
  try {
    const [ivHex, encryptedHex] = payload.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    throw new DecryptionError(`Decryption failed: ${(error as Error).message}`);
  }
}

/**
 * Sync .env files to Supabase
 * @param context The extension context
 */
async function syncEnvFiles(): Promise<void> {
  try {
    const user = await auth.getCurrentUser();
    if (!user) {
      vscode.window.showErrorMessage('Not logged in. Please run "EnvVault: Login" first.');
      return;
    }

    const derivedKey = await getDerivedKey(user.id);
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders) {
      vscode.window.showErrorMessage('No workspace is open.');
      return;
    }

    // Find all .env files in the workspace
    const envFiles: vscode.Uri[] = [];
    for (const folder of workspaceFolders) {
      const pattern = new vscode.RelativePattern(folder, '**/.env*');
      const files = await vscode.workspace.findFiles(pattern);
      envFiles.push(...files);
    }

    if (envFiles.length === 0) {
      vscode.window.showInformationMessage('No .env files found to sync.');
      return;
    }

    // Create quick pick items for selection
    const items: EnvFileQuickPickItem[] = [
      { 
        label: "Sync all .env files", 
        description: `(${envFiles.length} files)`, 
        files: envFiles 
      },
      ...envFiles.map(file => ({
        label: vscode.workspace.asRelativePath(file),
        description: "Single file",
        files: [file]
      }))
    ];

    // Show quick pick to select files
    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select .env files to sync',
      canPickMany: false
    });

    if (!selected) return;

    // Show progress indicator
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: "Syncing .env files",
      cancellable: false
    }, async (progress) => {
      progress.report({ increment: 0 });
      
      const totalFiles = selected.files.length;
      let processedFiles = 0;
      
      for (const fileUri of selected.files) {
        try {
          const content = await vscode.workspace.fs.readFile(fileUri);
          const filename = path.basename(fileUri.fsPath);
          const encryptedContent = encrypt(content.toString(), derivedKey);

          const { error } = await auth.supabase.from('envs').upsert([
            {
              user_id: user.id,
              filename,
              content: encryptedContent
            }
          ]);

          if (error) {
            throw new Error(`Failed to sync ${filename}: ${error.message}`);
          }

          processedFiles++;
          progress.report({ 
            increment: (100 / totalFiles),
            message: `Processed ${processedFiles} of ${totalFiles} files` 
          });
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to sync file ${fileUri.fsPath}: ${(error as Error).message}`);
        }
      }
    });

    vscode.window.showInformationMessage(`${selected.files.length} .env file(s) synced to Supabase.`);
  } catch (error) {
    if (error instanceof PasswordRequiredError) {
      vscode.window.showErrorMessage('Password is required to encrypt files.');
    } else if (error instanceof InvalidPasswordError) {
      vscode.window.showErrorMessage('Invalid password. Please try again.');
    } else {
      vscode.window.showErrorMessage(`Failed to sync: ${(error as Error).message}`);
    }
  }
}

/**
 * Restore .env files from Supabase
 * @param context The extension context
 */
async function restoreEnvFiles(): Promise<void> {
  try {
    const user = await auth.getCurrentUser();
    if (!user) {
      vscode.window.showErrorMessage('Not logged in. Please run "EnvVault: Login" first.');
      return;
    }

    const derivedKey = await getDerivedKey(user.id);
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders) {
      vscode.window.showErrorMessage('No workspace is open.');
      return;
    }

    const rootPath = workspaceFolders[0].uri.fsPath;

    // Show progress indicator
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: "Restoring .env files",
      cancellable: false
    }, async (progress) => {
      progress.report({ increment: 0 });

      const { data, error } = await auth.supabase.from('envs').select('*').eq('user_id', user.id);
      
      if (error) {
        throw new Error(`Failed to fetch .env files: ${error.message}`);
      }
      
      if (!data || data.length === 0) {
        vscode.window.showInformationMessage('No .env files found in Supabase.');
        return;
      }

      const totalFiles = data.length;
      let processedFiles = 0;

      for (const row of data) {
        try {
          const decrypted = decrypt(row.content, derivedKey);
          
          // Check if the file already exists in the workspace
          const pattern = new vscode.RelativePattern(workspaceFolders[0], `**/${row.filename}`);
          const existingFiles = await vscode.workspace.findFiles(pattern);
          
          const targetPath = existingFiles.length > 0 
            ? existingFiles[0].fsPath 
            : path.join(rootPath, row.filename);

          fs.writeFileSync(targetPath, decrypted, 'utf8');
          
          processedFiles++;
          progress.report({ 
            increment: (100 / totalFiles),
            message: `Restored ${processedFiles} of ${totalFiles} files` 
          });
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to restore ${row.filename}: ${(error as Error).message}`);
        }
      }
    });

    vscode.window.showInformationMessage(`Environment files restored successfully.`);
  } catch (error) {
    if (error instanceof PasswordRequiredError) {
      vscode.window.showErrorMessage('Password is required to decrypt files.');
    } else if (error instanceof InvalidPasswordError) {
      vscode.window.showErrorMessage('Invalid password. Please try again.');
    } else {
      vscode.window.showErrorMessage(`Failed to restore: ${(error as Error).message}`);
    }
  }
}

/**
 * Clear all .env data from Supabase
 * @param context The extension context
 */
async function clearEnvData(): Promise<void> {
  try {
    const user = await auth.getCurrentUser();
    if (!user) {
      vscode.window.showErrorMessage('Not logged in. Please run "EnvVault: Login" first.');
      return;
    }

    const answer = await vscode.window.showWarningMessage(
      '⚠️ Are you sure you want to clear all .env files from Supabase? This action cannot be undone.',
      'Yes, Clear All',
      'Cancel'
    );

    if (answer !== 'Yes, Clear All') {
      return;
    }

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: "Clearing .env data",
      cancellable: false
    }, async () => {
      const { error } = await auth.supabase.from('envs').delete().eq('user_id', user.id);
      
      if (error) {
        throw new Error(`Failed to clear .env data: ${error.message}`);
      }
    });

    vscode.window.showInformationMessage('All .env files have been cleared from Supabase.');
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to clear data: ${(error as Error).message}`);
  }
}

/**
 * Activate the extension
 * @param context The extension context
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  try {
    // Initialize authentication state
    auth.initializeState(context);
    await auth.restoreSession();

    // Register URI handler for OAuth callbacks
    context.subscriptions.push(
      vscode.window.registerUriHandler(new EnvVaultUriHandler())
    );

    // Register commands
    context.subscriptions.push(
      vscode.commands.registerCommand('envsync.login', async () => {
        try {
          await auth.login();
        } catch (error) {
          vscode.window.showErrorMessage(`Login failed: ${(error as Error).message}`);
        }
      }),
      
      vscode.commands.registerCommand('supabase-github.logout', async () => {
        try {
          await auth.logout();
        } catch (error) {
          vscode.window.showErrorMessage(`Logout failed: ${(error as Error).message}`);
        }
      }),
      
      vscode.commands.registerCommand('envsync.sync', async () => {
        await syncEnvFiles();
      }),
      
      vscode.commands.registerCommand('envsync.restore', async () => {
        await restoreEnvFiles();
      }),
      
      vscode.commands.registerCommand('envsync.clear', async () => {
        await clearEnvData();
      })
    );

    // Run setup wizard for first-time users
    await runSetupWizard(context);
  } catch (error) {
    vscode.window.showErrorMessage(`Extension activation failed: ${(error as Error).message}`);
  }
}

/**
 * Deactivate the extension
 */
export function deactivate(): void {
  // Nothing to clean up
}
