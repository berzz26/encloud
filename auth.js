const vscode = require('vscode');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    throw new Error('Missing required environment variables: SUPABASE_URL or SUPABASE_ANON_KEY');
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

let currentSession = null;
let globalState;

function initializeState(context) {
    globalState = context.globalState;
}

async function login() {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
            redirectTo: 'vscode://AumTamboli.env-vault/callback'
        }
    });

    if (error) {
        vscode.window.showErrorMessage(`Login failed: ${error.message}`);
        return null;
    }

    // Open the OAuth URL in browser
    await vscode.env.openExternal(vscode.Uri.parse(data.url));
    return true;
}

async function handleDeepLink(uri) {
    try {
        const hash = uri.fragment;
        const params = new URLSearchParams(hash);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');

        if (!access_token) {
            throw new Error('No access token found in callback URL');
        }

        const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token
        });

        if (error) throw error;

        currentSession = data.session;
        await globalState.update('envvault.session', data.session);
        vscode.window.showInformationMessage(`Logged in as ${data.session.user.email}`);
        return data.session;
    } catch (err) {
        vscode.window.showErrorMessage(`Auth error: ${err.message}`);
        return null;
    }
}

async function logout() {
    await supabase.auth.signOut();
    currentSession = null;
    await globalState.update('envvault.session', null);
    vscode.window.showInformationMessage('Logged out successfully.');
}

async function isLoggedIn() {
    if (currentSession) return true;
    const { data } = await supabase.auth.getSession();
    currentSession = data?.session;
    return !!currentSession;
}

async function getCurrentUser() {
    if (!currentSession) {
        const { data } = await supabase.auth.getSession();
        currentSession = data?.session;
    }
    return currentSession?.user || null;
}

async function restoreSession() {
    const savedSession = await globalState.get('envvault.session');
    if (savedSession) {
        currentSession = savedSession;
        return true;
    }
    return false;
}

module.exports = {
    login,
    logout,
    isLoggedIn,
    getCurrentUser,
    handleDeepLink,
    supabase,
    initializeState,
    restoreSession
};
