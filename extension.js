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

async function deriveKey(password, salt) {
	return new Promise((resolve, reject) => {
		crypto.pbkdf2(password, salt, 100000, 32, 'sha256', (err, key) => {
			if (err) reject(err);
			else resolve(key);
		});
	});
}

async function hashPassword(password, salt) {
	return new Promise((resolve, reject) => {
		crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, key) => {
			if (err) reject(err);
			else resolve(key.toString('hex'));
		});
	});
}

async function setupPassword() {
	const password = await vscode.window.showInputBox({
		prompt: 'Set up a password to encrypt your .env files (min. 8 characters)',
		password: true,
		validateInput: text => text.length < 8 ? 'Password must be at least 8 characters' : null
	});
	
	if (!password) throw new Error('Password is required for setup');
	
	const salt = crypto.randomBytes(16);
	const verificationHash = await hashPassword(password, salt);
	
	return {
		password,
		salt: salt.toString('hex'),
		verificationHash
	};
}

async function requestPassword() {
	return vscode.window.showInputBox({
		prompt: 'Enter your password to access .env files',
		password: true
	});
}

async function getDerivedKey(userId, context) {
	const { data } = await auth.supabase
		.from('users')
		.select('salt, verification_hash')
		.eq('user_id', userId)
		.single();

	let password, salt;

	if (!data?.salt) {
		const setup = await setupPassword();
		await auth.supabase.from('users').upsert([{
			user_id: userId,
			salt: setup.salt,
			verification_hash: setup.verificationHash
		}]);
		password = setup.password;
		salt = setup.salt;
	} else {
		password = await requestPassword();
		if (!password) throw new Error('Password required');

		salt = data.salt;
		const hash = await hashPassword(password, Buffer.from(salt, 'hex'));
		if (hash !== data.verification_hash) {
			throw new Error('Invalid password');
		}
	}

	return deriveKey(password, Buffer.from(salt, 'hex'));
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

async function syncEnvFiles(context) {
	const user = await auth.getCurrentUser();
	if (!user) {
		vscode.window.showErrorMessage('Not logged in. Please run "Login" first.');
		return;
	}

	try {
		const derivedKey = await getDerivedKey(user.id, context);
		const workspaceFolders = vscode.workspace.workspaceFolders;

		if (!workspaceFolders) {
			vscode.window.showErrorMessage('No workspace is open.');
			return;
		}

		const envFiles = [];
		for (const folder of workspaceFolders) {
			const pattern = new vscode.RelativePattern(folder, '**/.env*');
			const files = await vscode.workspace.findFiles(pattern);
			envFiles.push(...files);
		}

		if (envFiles.length === 0) {
			vscode.window.showInformationMessage('No .env files found to sync.');
			return;
		}

		const items = [
			{ label: "Sync all .env files", description: `(${envFiles.length} files)`, files: envFiles },
			...envFiles.map(file => ({
				label: vscode.workspace.asRelativePath(file),
				description: "Single file",
				files: [file]
			}))
		];

		const selected = await vscode.window.showQuickPick(items, {
			placeHolder: 'Select .env files to sync',
			canPickMany: false
		});

		if (!selected) return;

		for (const fileUri of selected.files) {
			const content = await vscode.workspace.fs.readFile(fileUri);
			const filename = path.basename(fileUri.fsPath);
			const encryptedContent = encrypt(content.toString(), derivedKey);

			await auth.supabase.from('envs').upsert([
				{
					user_id: user.id,
					filename,
					content: encryptedContent
				}
			]);
		}

		vscode.window.showInformationMessage(`${selected.files.length} .env file(s) synced to Supabase.`);
	} catch (error) {
		vscode.window.showErrorMessage('Failed to encrypt: ' + error.message);
		return;
	}
}

async function restoreEnvFiles(context) {
	const user = await auth.getCurrentUser();
	if (!user) {
		vscode.window.showErrorMessage('Not logged in.');
		return;
	}

	try {
		const derivedKey = await getDerivedKey(user.id, context);
		const workspaceFolders = vscode.workspace.workspaceFolders;

		if (!workspaceFolders) {
			vscode.window.showErrorMessage('No workspace is open.');
			return;
		}

		const rootPath = workspaceFolders[0].uri.fsPath;

		const { data, error } = await auth.supabase.from('envs').select('*').eq('user_id', user.id);
		if (!data || data.length === 0) {
			vscode.window.showInformationMessage('No .env files found in Supabase.');
			return;
		}

		for (const row of data) {
			const decrypted = decrypt(row.content, derivedKey);
			
			const pattern = new vscode.RelativePattern(workspaceFolders[0], `**/${row.filename}`);
			const existingFiles = await vscode.workspace.findFiles(pattern);
			
			const targetPath = existingFiles.length > 0 
				? existingFiles[0].fsPath 
				: path.join(rootPath, row.filename);

			fs.writeFileSync(targetPath, decrypted, 'utf8');
		}

		vscode.window.showInformationMessage(' .env files restored.');
	} catch (error) {
		vscode.window.showErrorMessage('Failed to decrypt: ' + error.message);
		return;
	}
}

async function clearEnvData(context) {
	const user = await auth.getCurrentUser();
	if (!user) {
		vscode.window.showErrorMessage('Not logged in.');
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

	await auth.supabase.from('envs').delete().eq('user_id', user.id);
	vscode.window.showInformationMessage(' All .env files have been cleared from Supabase.');
}

async function activate(context) {
	auth.initializeState(context);
	await auth.restoreSession();

	context.subscriptions.push(
		vscode.window.registerUriHandler(new EnvVaultUriHandler())
	);

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
