/**
 * Authentication module for Encloud
 * Handles GitHub OAuth authentication via Supabase
 */

import * as vscode from 'vscode';
import { createClient, SupabaseClient, Session, User } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { AuthenticationError } from './types';

// Load environment variables
// Try multiple possible locations for the .env file
const possibleEnvPaths = [
  path.join(__dirname, '..', '..', '.env'),  // For compiled code in dist/src
  path.join(__dirname, '..', '.env'),        // Fallback
  '.env'                                     // Direct reference to root
];

for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

// Validate required environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    throw new Error('Missing required environment variables: SUPABASE_URL or SUPABASE_ANON_KEY');
}

// Initialize Supabase client
export const supabase: SupabaseClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// Module state
let currentSession: Session | null = null;
let globalState: vscode.Memento;

/**
 * Initialize the extension's global state
 * @param context The extension context containing globalState
 */
export function initializeState(context: vscode.ExtensionContext): void {
    globalState = context.globalState;
}

/**
 * Initiate the GitHub OAuth login flow
 * @returns Promise resolving to true if login flow started successfully, null if failed
 */
export async function login(): Promise<boolean | null> {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: 'vscode://AumTamboli.encloud/callback'
            }
        });

        if (error) {
            vscode.window.showErrorMessage(`Login failed: ${error.message}`);
            return null;
        }

        // Open the OAuth URL in browser
        await vscode.env.openExternal(vscode.Uri.parse(data.url));
        return true;
    } catch (err) {
        const error = err as Error;
        vscode.window.showErrorMessage(`Login error: ${error.message}`);
        return null;
    }
}

/**
 * Handle the OAuth callback from GitHub
 * @param uri The URI containing the OAuth tokens
 * @returns Promise resolving to the user session if successful, null if failed
 */
export async function handleDeepLink(uri: vscode.Uri): Promise<Session | null> {
    try {
        const hash = uri.fragment;
        const params = new URLSearchParams(hash);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');

        if (!access_token) {
            throw new AuthenticationError('No access token found in callback URL');
        }

        const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token: refresh_token || ''
        });

        if (error) throw new AuthenticationError(error.message);

        if (data.session) {
            currentSession = data.session;
            await globalState.update('encloud.session', data.session);
            vscode.window.showInformationMessage(`Logged in as ${data.session.user.email}`);
            return data.session;
        } else {
            throw new AuthenticationError('No session data returned from authentication');
        }
    } catch (err) {
        const error = err as Error;
        vscode.window.showErrorMessage(`Auth error: ${error.message}`);
        return null;
    }
}

/**
 * Log out the current user
 * @returns Promise that resolves when logout is complete
 */
export async function logout(): Promise<void> {
    try {
        await supabase.auth.signOut();
        currentSession = null;
        await globalState.update('encloud.session', null);
        vscode.window.showInformationMessage('Logged out successfully.');
    } catch (err) {
        const error = err as Error;
        vscode.window.showErrorMessage(`Logout error: ${error.message}`);
    }
}

/**
 * Check if the user is currently logged in
 * @returns Promise resolving to true if logged in, false otherwise
 */
export async function isLoggedIn(): Promise<boolean> {
    if (currentSession) return true;
    
    try {
        const { data } = await supabase.auth.getSession();
        currentSession = data?.session;
        return !!currentSession;
    } catch (err) {
        const error = err as Error;
        vscode.window.showErrorMessage(`Session check error: ${error.message}`);
        return false;
    }
}

/**
 * Get the current authenticated user
 * @returns Promise resolving to the user object if logged in, null otherwise
 */
export async function getCurrentUser(): Promise<User | null> {
    try {
        if (!currentSession) {
            const { data } = await supabase.auth.getSession();
            currentSession = data?.session;
        }
        return currentSession?.user || null;
    } catch (err) {
        const error = err as Error;
        vscode.window.showErrorMessage(`Get user error: ${error.message}`);
        return null;
    }
}

/**
 * Restore the user session from VS Code's global state
 * @returns Promise resolving to true if session restored, false otherwise
 */
export async function restoreSession(): Promise<boolean> {
    try {
        const savedSession = await globalState.get<Session>('encloud.session');
        if (savedSession) {
            currentSession = savedSession;
            return true;
        }
        return false;
    } catch (err) {
        const error = err as Error;
        vscode.window.showErrorMessage(`Session restore error: ${error.message}`);
        return false;
    }
}
