require('dotenv').config();
const vscode = require('vscode');
const { createClient } = require('@supabase/supabase-js');

// Check for required env variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
	vscode.window.showErrorMessage('Supabase credentials missing from environment variables.');
	throw new Error('Missing Supabase credentials.');
}

const supabase = createClient(
	process.env.SUPABASE_URL,
	process.env.SUPABASE_ANON_KEY
);
let currentSession = null;

async function isLoggedIn() {
	const { data } = await supabase.auth.getSession();
	return data?.session || null;
}

async function login() {
	const { data, error } = await supabase.auth.signInWithOAuth({
		provider: 'github',
		options: {
			redirectTo: process.env.SUPABASE_CALLBACK_URL
		}
	});

	if (error) {
		vscode.window.showErrorMessage(`Login failed: ${error.message}`);
		return null;
	}

	vscode.env.openExternal(vscode.Uri.parse(data.url));
	vscode.window.setStatusBarMessage('Waiting for GitHub login...');

	for (let i = 0; i < 30; i++) {
		await new Promise(res => setTimeout(res, 1000));
		const { data } = await supabase.auth.getSession();
		if (data?.session) {
			currentSession = data.session;
			vscode.window.setStatusBarMessage('');
			vscode.window.showInformationMessage(`Logged in as ${data.session.user.email}`);
			return data.session;
		}
	}

	vscode.window.setStatusBarMessage('');
	vscode.window.showErrorMessage('Login timed out.');
	return null;
}

async function logout() {
	await supabase.auth.signOut();
	currentSession = null;
	vscode.window.showInformationMessage('Logged out successfully.');
}

async function getCurrentUser() {
	const session = await isLoggedIn();
	return session?.user || null;
}

module.exports = {
	login,
	logout,
	isLoggedIn,
	getCurrentUser,
	supabase
};
