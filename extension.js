const vscode = require('vscode');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const getSecretKey = (context) => {
	let key = context.globalState.get('env-vault-secret-key');
	if (!key) {
		key = crypto.randomBytes(32).toString('hex');
		context.globalState.update('env-vault-secret-key', key);
	}
	return Buffer.from(key, 'hex');
};

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
	if (!workspaceFolder) {
		vscode.window.showWarningMessage('No workspace folder is open.');
		return;
	}

	const SECRET_KEY = getSecretKey(context);

	const encrypt = (text) => {
		const iv = crypto.randomBytes(16);
		const cipher = crypto.createCipheriv('aes-256-cbc', SECRET_KEY, iv);
		let encrypted = cipher.update(text, 'utf8', 'hex');
		encrypted += cipher.final('hex');
		return iv.toString('hex') + ':' + encrypted;
	};

	const decrypt = (data) => {
		const [ivHex, encryptedText] = data.split(':');
		const iv = Buffer.from(ivHex, 'hex');
		const decipher = crypto.createDecipheriv('aes-256-cbc', SECRET_KEY, iv);
		let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
		decrypted += decipher.final('utf8');
		return decrypted;
	};

	const saveEnvToStorage = async (filename, content) => {
		const encrypted = encrypt(content);
		await context.globalState.update(`env-${filename}`, encrypted);

		let tracked = context.globalState.get('env-files') || [];
		if (!tracked.includes(filename)) {
			tracked.push(filename);
			await context.globalState.update('env-files', tracked);
		}

		vscode.window.showInformationMessage(`Synced ${filename} securely`);
	};

	const loadStoredEnvs = () => {
		const tracked = context.globalState.get('env-files') || [];
		const storedEnvs = {};

		for (const filename of tracked) {
			const encrypted = context.globalState.get(`env-${filename}`);
			if (!encrypted) continue;
			try {
				storedEnvs[filename] = decrypt(encrypted);
			} catch (e) {
				vscode.window.showErrorMessage(`Failed to decrypt ${filename}`);
			}
		}

		return storedEnvs;
	};

	const getEnvFiles = () => {
		try {
			const files = fs.readdirSync(workspaceFolder);
			return files.filter(file => file.startsWith('.env'));
		} catch (err) {
			vscode.window.showErrorMessage('Error reading workspace folder');
			return [];
		}
	};

	const readEnv = (filename) => {
		const fullPath = path.join(workspaceFolder, filename);
		fs.readFile(fullPath, 'utf8', async (err, data) => {
			if (err) {
				vscode.window.showErrorMessage(`Error reading ${filename}: ${err.message}`);
				return;
			}
			await saveEnvToStorage(filename, data);
		});
	};

	const readMultipleEnv = (fileList) => {
		fileList.forEach(file => readEnv(file));
	};

	const selectEnvFile = async () => {
		const envFiles = getEnvFiles();

		const options = [
			'[Restore .env files]',
			'[Sync .env Files]',
			'[Clear Synced .env Files]'
		];

		const selectedFile = await vscode.window.showQuickPick(options, {
			placeHolder: 'Select action'
		});

		if (!selectedFile) return;

		if (selectedFile === '[Sync .env Files]') {
			const selectEnvOpt = ['[Select all .env files in workspace]', ...envFiles];
			const syncOpt = await vscode.window.showQuickPick(selectEnvOpt, {
				placeHolder: 'Select which env file to sync'
			});
			if (!syncOpt) return;
			if (syncOpt === '[Select all .env files in workspace]') {
				readMultipleEnv(envFiles);
			} else {
				readEnv(syncOpt);
			}
		} else if (selectedFile === '[Restore .env files]') {
			const stored = loadStoredEnvs();

			if (Object.keys(stored).length === 0) {
				vscode.window.showInformationMessage('No stored env files found in global storage.');
				return;
			}

			for (const [filename, content] of Object.entries(stored)) {
				const filePath = path.join(workspaceFolder, filename);
				fs.writeFileSync(filePath, content, 'utf8');
				vscode.window.showInformationMessage(`Restored ${filename} to workspace.`);
			}
		} else if (selectedFile === '[Clear Synced .env Files]') {
			const confirm = await vscode.window.showQuickPick(['Yes', 'No'], {
				placeHolder: 'Are you sure you want to clear all synced .env files?'
			});

			if (confirm === 'Yes') {
				const tracked = context.globalState.get('env-files') || [];
				for (const filename of tracked) {
					await context.globalState.update(`env-${filename}`, undefined);
				}
				await context.globalState.update('env-files', undefined);
				await context.globalState.update('env-vault-secret-key', undefined);
				vscode.window.showInformationMessage('Cleared all synced .env files and encryption key.');
			}
		}
	};

	const get = vscode.commands.registerCommand('env-vault.getEnv', function () {
		vscode.window.showInformationMessage('OS: ' + os.platform() + ' | Version: ' + os.version());
		selectEnvFile();
	});

	context.subscriptions.push(get);
}

function deactivate() { }

module.exports = {
	activate,
	deactivate
};
