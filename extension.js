const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const auth = require('./auth');

class EnvVaultUriHandler {
	async handleUri(uri) {
		await auth.handleDeepLink(uri);
	}
}

function encrypt(text, key) {
	const iv = crypto.randomBytes(16);
	const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
	const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
	return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(payload, key) {
	const [ivHex, encryptedHex] = payload.split(':');
	const iv = Buffer.from(ivHex, 'hex');
	const encryptedText = Buffer.from(encryptedHex, 'hex');
	const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
	const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
	return decrypted.toString('utf8');
}

async function getOrCreateSecretKey(userId) {
	const { data, error } = await auth.supabase.from('users').select('secret_key').eq('user_id', userId).single();

	if (data?.secret_key) {
		return Buffer.from(data.secret_key, 'hex');
	}

	const newKey = crypto.randomBytes(32).toString('hex');
	await auth.supabase.from('users').upsert([{ user_id: userId, secret_key: newKey }]);
	return Buffer.from(newKey, 'hex');
}

async function syncEnvFiles(context) {
	const user = await auth.getCurrentUser();
	if (!user) {
		vscode.window.showErrorMessage('Not logged in. Please run "Login" first.');
		return;
	}

	const secretKey = await getOrCreateSecretKey(user.id);
	const workspaceFolders = vscode.workspace.workspaceFolders;

	if (!workspaceFolders) {
		vscode.window.showErrorMessage('No workspace is open.');
		return;
	}

	// Find all .env files in workspace
	const envFiles = [];
	for (const folder of workspaceFolders) {
		// Modified pattern to catch all .env* files
		const pattern = new vscode.RelativePattern(folder, '**/.env*');
		const files = await vscode.workspace.findFiles(pattern);
		envFiles.push(...files);
	}

	if (envFiles.length === 0) {
		vscode.window.showInformationMessage('No .env files found to sync.');
		return;
	}

	// Create QuickPick items
	const items = [
		{ label: "Sync all .env files", description: `(${envFiles.length} files)`, files: envFiles },
		...envFiles.map(file => ({
			label: vscode.workspace.asRelativePath(file),
			description: "Single file",
			files: [file]
		}))
	];

	// Show QuickPick
	const selected = await vscode.window.showQuickPick(items, {
		placeHolder: 'Select .env files to sync',
		canPickMany: false
	});

	if (!selected) return;

	// Sync selected files
	for (const fileUri of selected.files) {
		const content = await vscode.workspace.fs.readFile(fileUri);
		const filename = path.basename(fileUri.fsPath);
		const encryptedContent = encrypt(content.toString(), secretKey);

		await auth.supabase.from('envs').upsert([
			{
				user_id: user.id,
				filename,
				content: encryptedContent
			}
		]);
	}

	vscode.window.showInformationMessage(`✅ ${selected.files.length} .env file(s) synced to Supabase.`);
}

async function restoreEnvFiles(context) {
	const user = await auth.getCurrentUser();
	if (!user) {
		vscode.window.showErrorMessage('Not logged in.');
		return;
	}

	const secretKey = await getOrCreateSecretKey(user.id);
	const workspaceFolders = vscode.workspace.workspaceFolders;

	if (!workspaceFolders) {
		vscode.window.showErrorMessage('No workspace is open.');
		return;
	}

	const folderPath = workspaceFolders[0].uri.fsPath;

	const { data, error } = await auth.supabase.from('envs').select('*').eq('user_id', user.id);
	if (!data || data.length === 0) {
		vscode.window.showInformationMessage('No .env files found in Supabase.');
		return;
	}

	for (const row of data) {
		const decrypted = decrypt(row.content, secretKey);
		fs.writeFileSync(path.join(folderPath, row.filename), decrypted, 'utf8');
	}

	vscode.window.showInformationMessage(' .env files restored.');
}

async function clearEnvData(context) {
	const user = await auth.getCurrentUser();
	if (!user) {
		vscode.window.showErrorMessage('Not logged in.');
		return;
	}

	await auth.supabase.from('envs').delete().eq('user_id', user.id);
	vscode.window.showInformationMessage('🧹 .env data cleared from Supabase.');
}

async function activate(context) {
	// Initialize auth state
	auth.initializeState(context);
	
	// Restore session if exists
	await auth.restoreSession();

	// Register URI handler
	context.subscriptions.push(
		vscode.window.registerUriHandler(new EnvVaultUriHandler())
	);

	// Register commands
	context.subscriptions.push(
		vscode.commands.registerCommand('envsync.login', () => auth.login()),
		vscode.commands.registerCommand('supabase-github.logout', () => auth.logout()),
		vscode.commands.registerCommand('envsync.sync', async () => {
			await syncEnvFiles(context);
		}),
		vscode.commands.registerCommand('envsync.restore', async () => {
			await restoreEnvFiles(context);
		}),
		vscode.commands.registerCommand('envsync.clear', async () => {
			await clearEnvData(context);
		})
	);
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
};
