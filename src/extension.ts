import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as auth from './auth';
import {
  PasswordSetup,
  EnvFileQuickPickItem,
  PasswordRequiredError,
  InvalidPasswordError,
  EncryptionError,
  DecryptionError,
} from './types';

// (The URI handler, crypto, and password functions remain the same...)

class EncloudUriHandler implements vscode.UriHandler {
  async handleUri(uri: vscode.Uri): Promise<void> {
    await auth.handleDeepLink(uri);
  }
}

async function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 100000, 32, 'sha256', (err, key) => {
      if (err) reject(new EncryptionError(`Key derivation failed: ${err.message}`));
      else resolve(key);
    });
  });
}

async function hashPassword(password: string, salt: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, key) => {
      if (err) reject(new EncryptionError(`Password hashing failed: ${err.message}`));
      else resolve(key.toString('hex'));
    });
  });
}

async function setupPassword(): Promise<PasswordSetup> {
  const password = await vscode.window.showInputBox({
    prompt: 'Set up a password to encrypt your .env files (min. 8 characters)',
    password: true,
    validateInput: (text) => (text.length < 8 ? 'Password must be at least 8 characters' : null),
  });
  if (!password) {
    throw new PasswordRequiredError('Password is required for setup');
  }
  const salt = crypto.randomBytes(16);
  const verificationHash = await hashPassword(password, salt);
  return { password, salt: salt.toString('hex'), verificationHash };
}

async function requestPassword(): Promise<string | undefined> {
  return vscode.window.showInputBox({
    prompt: 'Enter your password to access .env files',
    password: true,
  });
}

async function getDerivedKey(userId: string): Promise<Buffer> {
  try {
    const { data, error } = await auth.supabase
      .from('users')
      .select('salt, verification_hash')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to retrieve user data: ${error.message}`);
    }

    let password: string | undefined;
    let salt: string;

    if (!data?.salt) {
      const setup = await setupPassword();
      const { error: upsertError } = await auth.supabase
        .from('users')
        .upsert([{ user_id: userId, salt: setup.salt, verification_hash: setup.verificationHash }]);
      if (upsertError) throw new Error(`Failed to save user data: ${upsertError.message}`);
      password = setup.password;
      salt = setup.salt;
    } else {
      password = await requestPassword();
      if (!password) throw new PasswordRequiredError();
      salt = data.salt;
      const hash = await hashPassword(password, Buffer.from(salt, 'hex'));
      if (hash !== data.verification_hash) throw new InvalidPasswordError();
    }
    return deriveKey(password, Buffer.from(salt, 'hex'));
  } catch (error) {
    if (error instanceof PasswordRequiredError || error instanceof InvalidPasswordError) {
      throw error;
    }
    throw new Error(`Failed to get encryption key: ${(error as Error).message}`);
  }
}

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
 * Prompts the user to select or create a project for syncing.
 * @param userId The ID of the current user.
 * @returns The selected or newly created project name, or undefined if cancelled.
 */
async function selectOrCreateProject(userId: string): Promise<string | undefined> {
  const { data, error } = await auth.supabase
    .from('envs')
    .select('project_name', { count: 'exact', head: false })
    .eq('user_id', userId);

  if (error) {
    vscode.window.showErrorMessage(`Failed to fetch projects: ${error.message}`);
    return undefined;
  }

  const projects = [...new Set(data.map((p) => p.project_name))];
  const CREATE_NEW_PROJECT = '[ Create a new project ]';
  const items = [...projects, CREATE_NEW_PROJECT];

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select a project to sync to, or create a new one',
  });

  if (!selected) return undefined;

  if (selected === CREATE_NEW_PROJECT) {
    return await vscode.window.showInputBox({
      prompt: 'Enter a name for your new project',
      validateInput: (text) => (text ? null : 'Project name cannot be empty'),
    });
  }

  return selected;
}

/**
 * Sync .env files to a selected project in Supabase.
 */
async function syncEnvFiles(): Promise<void> {
  try {
    const user = await auth.getCurrentUser();
    if (!user) {
      vscode.window.showErrorMessage('Not logged in. Please run "Encloud: Login" first.');
      return;
    }

    const projectName = await selectOrCreateProject(user.id);
    if (!projectName) return; // User cancelled

    const derivedKey = await getDerivedKey(user.id);
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage('No workspace is open.');
      return;
    }

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

    const items: EnvFileQuickPickItem[] = [
      { label: 'Sync all .env files', description: `(${envFiles.length} files)`, files: envFiles },
      ...envFiles.map((file) => ({
        label: vscode.workspace.asRelativePath(file),
        description: 'Single file',
        files: [file],
      })),
    ];
    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select .env files to sync',
    });
    if (!selected) return;

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Syncing files to project: ${projectName}`,
        cancellable: false,
      },
      async (progress) => {
        const filesToUpsert = [];
        for (const fileUri of selected.files) {
          const content = await vscode.workspace.fs.readFile(fileUri);
          const encryptedContent = encrypt(content.toString(), derivedKey);
          const relativePath = vscode.workspace.asRelativePath(fileUri, false);
          filesToUpsert.push({
            user_id: user.id,
            project_name: projectName,
            relative_path: relativePath,
            content: encryptedContent,
          });
        }

        const { error } = await auth.supabase.from('envs').upsert(filesToUpsert, {
          onConflict: 'user_id, project_name, relative_path',
        });

        if (error) {
          throw new Error(`Failed to sync files: ${error.message}`);
        }

        progress.report({ increment: 100 });
      }
    );

    vscode.window.showInformationMessage(
      `${selected.files.length} file(s) synced to project "${projectName}".`
    );
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
 * Restore .env files from a selected project in Supabase.
 */
async function restoreEnvFiles(): Promise<void> {
  try {
    const user = await auth.getCurrentUser();
    if (!user) {
      vscode.window.showErrorMessage('Not logged in. Please run "Encloud: Login" first.');
      return;
    }

    const { data: projectsData, error: projectsError } = await auth.supabase
      .from('envs')
      .select('project_name')
      .eq('user_id', user.id);

    if (projectsError) throw new Error(`Failed to fetch projects: ${projectsError.message}`);

    const projects = [...new Set(projectsData.map((p) => p.project_name))];
    if (projects.length === 0) {
      vscode.window.showInformationMessage('No projects found in Supabase to restore from.');
      return;
    }

    const projectName = await vscode.window.showQuickPick(projects, {
      placeHolder: 'Select a project to restore files from',
    });
    if (!projectName) return;

    const derivedKey = await getDerivedKey(user.id);
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage('No workspace is open.');
      return;
    }
    const rootPath = workspaceFolders[0].uri.fsPath;

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Restoring files from project: ${projectName}`,
        cancellable: false,
      },
      async (progress) => {
        const { data, error } = await auth.supabase
          .from('envs')
          .select('relative_path, content')
          .eq('user_id', user.id)
          .eq('project_name', projectName);

        if (error) throw new Error(`Failed to fetch files: ${error.message}`);

        for (const row of data) {
          const decrypted = decrypt(row.content, derivedKey);
          const targetPath = path.join(rootPath, row.relative_path);

          // Ensure directory exists before writing file
          const dirName = path.dirname(targetPath);
          if (!fs.existsSync(dirName)) {
            fs.mkdirSync(dirName, { recursive: true });
          }

          fs.writeFileSync(targetPath, decrypted, 'utf8');
        }
      }
    );

    vscode.window.showInformationMessage(`Files restored from project "${projectName}".`);
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
 * Clear all .env data from Supabase (now project-specific).
 */
async function clearEnvData(): Promise<void> {
  try {
    const user = await auth.getCurrentUser();
    if (!user) {
      vscode.window.showErrorMessage('Not logged in. Please run "Encloud: Login" first.');
      return;
    }

    // Fetch and let user select which project to clear
    const { data: projectsData, error: projectsError } = await auth.supabase
      .from('envs')
      .select('project_name')
      .eq('user_id', user.id);

    if (projectsError) throw new Error(`Failed to fetch projects: ${projectsError.message}`);

    const projects = [...new Set(projectsData.map((p) => p.project_name))];
    if (projects.length === 0) {
      vscode.window.showInformationMessage('No projects found to clear.');
      return;
    }

    const projectToClear = await vscode.window.showQuickPick(projects, {
      placeHolder: 'Select a project to clear all .env files from',
    });
    if (!projectToClear) return;

    const answer = await vscode.window.showWarningMessage(
      `⚠️ Are you sure you want to clear all .env files from project "${projectToClear}"? This action cannot be undone.`,
      { modal: true },
      'Yes, Clear All'
    );
    if (answer !== 'Yes, Clear All') return;

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Clearing data for project: ${projectToClear}`,
        cancellable: false,
      },
      async () => {
        const { error } = await auth.supabase
          .from('envs')
          .delete()
          .eq('user_id', user.id)
          .eq('project_name', projectToClear);

        if (error) throw new Error(`Failed to clear data: ${error.message}`);
      }
    );

    vscode.window.showInformationMessage(
      `All .env files for project "${projectToClear}" have been cleared.`
    );
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
    auth.initializeState(context);
    await auth.restoreSession();

    context.subscriptions.push(vscode.window.registerUriHandler(new EncloudUriHandler()));

    context.subscriptions.push(
      vscode.commands.registerCommand('encloud.login', async () => {
        try {
          await auth.login();
        } catch (error) {
          vscode.window.showErrorMessage(`Login failed: ${(error as Error).message}`);
        }
      }),
      vscode.commands.registerCommand('encloud.logout', async () => {
        try {
          await auth.logout();
        } catch (error) {
          vscode.window.showErrorMessage(`Logout failed: ${(error as Error).message}`);
        }
      }),
      vscode.commands.registerCommand('encloud.sync', syncEnvFiles),
      vscode.commands.registerCommand('encloud.restore', restoreEnvFiles),
      vscode.commands.registerCommand('encloud.clear', clearEnvData)
    );
  } catch (error) {
    vscode.window.showErrorMessage(`Extension activation failed: ${(error as Error).message}`);
  }
}

/**
 * Deactivate the extension
 */
export function deactivate(): void {}
