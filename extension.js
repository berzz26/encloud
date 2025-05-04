const vscode = require('vscode');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const SECRET_KEY = crypto.createHash('sha256').update('my-super-secret').digest(); // 32-byte key

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;

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

	// --- Save to Global Encrypted Storage ---
	const saveEnvToStorage = async (filename, content) => {
		const encrypted = encrypt(content);
		await context.globalState.update(`env-${filename}`, encrypted);

		// Track the filename in a list
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


	// --- Detect .env Files ---
	const getEnvFiles = () => {
		const files = fs.readdirSync(workspaceFolder);
		return files.filter(file => file.startsWith('.env'));
	};


	const readEnv = (filename) => {
		const fullPath = path.join(workspaceFolder, filename);
		fs.readFile(fullPath, 'utf8', async (err, data) => {
			if (err) {
				vscode.window.showErrorMessage(`Error reading ${filename}: ${err.message}`);
				return;
			}
			// vscode.window.showInformationMessage(`Synced ${filename}: ${data.slice(0, 100)}...`);
			await saveEnvToStorage(filename, data);
		});
	};

	// --- Sync All Detected ---
	const readMultipleEnv = (fileList) => {
		fileList.forEach(file => readEnv(file));
	};

	// --- UI Command for User to Choose ---
	const selectEnvFile = async () => {
		const envFiles = getEnvFiles();

		if (envFiles.length === 0) {
			vscode.window.showInformationMessage('No .env files found in the workspace');
			return;
		}

		const options = ['[Restore .env files]', '[Sync .env Files]'];
		const selectedFile = await vscode.window.showQuickPick(options, {
			placeHolder: 'Select action'
		});

		if (!selectedFile) return;

		if (selectedFile === '[Sync .env Files]') {
			const selectEnvOpt = ['[Select all .env files in workspace]', ...envFiles]

			const syncOpt = await vscode.window.showQuickPick(selectEnvOpt, {
				placeHolder: 'Select which env file to sync'
			})
			if (!syncOpt) return;
			if (syncOpt == '[Select all .env files in workspace]') {
				readMultipleEnv(envFiles)
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
		} else {
			readEnv(selectedFile);
		}
	};

	const get = vscode.commands.registerCommand('env-vault.getEnv', function () {
		vscode.window.showInformationMessage('Current OS: ' + os.version());
		selectEnvFile();
	});

	context.subscriptions.push(get);
}

function deactivate() { }

module.exports = {
	activate,
	deactivate
};
