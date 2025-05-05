const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { login, isLoggedIn, getCurrentUser, supabase } = require('./auth');

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
	const { data, error } = await supabase.from('users').select('secret_key').eq('user_id', userId).single();

	if (data?.secret_key) {
		return Buffer.from(data.secret_key, 'hex');
	}

	const newKey = crypto.randomBytes(32).toString('hex');
	await supabase.from('users').upsert([{ user_id: userId, secret_key: newKey }]);
	return Buffer.from(newKey, 'hex');
}

async function syncEnvFiles() {
	const user = await getCurrentUser();
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

	const folderPath = workspaceFolders[0].uri.fsPath;
	const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.env'));

	if (files.length === 0) {
		vscode.window.showInformationMessage('No .env files found to sync.');
		return;
	}

	for (const filename of files) {
		const fullPath = path.join(folderPath, filename);
		const content = fs.readFileSync(fullPath, 'utf8');
		const encryptedContent = encrypt(content, secretKey);

		await supabase.from('envs').upsert([
			{
				user_id: user.id,
				filename,
				content: encryptedContent
			}
		]);
	}

	vscode.window.showInformationMessage('✅ .env files synced to Supabase.');
}

async function restoreEnvFiles() {
	const user = await getCurrentUser();
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

	const { data, error } = await supabase.from('envs').select('*').eq('user_id', user.id);
	if (!data || data.length === 0) {
		vscode.window.showInformationMessage('No .env files found in Supabase.');
		return;
	}

	for (const row of data) {
		const decrypted = decrypt(row.content, secretKey);
		fs.writeFileSync(path.join(folderPath, row.filename), decrypted, 'utf8');
	}

	vscode.window.showInformationMessage('✅ .env files restored.');
}

async function clearEnvData() {
	const user = await getCurrentUser();
	if (!user) {
		vscode.window.showErrorMessage('Not logged in.');
		return;
	}

	await supabase.from('envs').delete().eq('user_id', user.id);
	vscode.window.showInformationMessage('🧹 .env data cleared from Supabase.');
}

async function activate(context) {
	context.subscriptions.push(
		vscode.commands.registerCommand('envsync.login', login),
		vscode.commands.registerCommand('envsync.sync', syncEnvFiles),
		vscode.commands.registerCommand('envsync.restore', restoreEnvFiles),
		vscode.commands.registerCommand('envsync.clear', clearEnvData)
	);
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
};
