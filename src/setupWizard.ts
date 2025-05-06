/**
 * Setup Wizard for DotVault
 * 
 * Provides a guided setup experience for first-time users
 */

import * as vscode from 'vscode';
import * as auth from './auth';

enum SetupStep {
  Welcome,
  Login,
  PasswordSetup,
  WorkspaceCheck,
  Complete
}

/**
 * Runs the setup wizard for first-time users
 * @param context The extension context
 */
export async function runSetupWizard(context: vscode.ExtensionContext): Promise<void> {
  // Check if the wizard has already been completed
  const wizardCompleted = context.globalState.get<boolean>('dotvault.wizardCompleted');
  if (wizardCompleted) {
    return;
  }

  let currentStep = SetupStep.Welcome;
  let cancelled = false;

  while (currentStep !== SetupStep.Complete && !cancelled) {
    switch (currentStep) {
      case SetupStep.Welcome: {
        const welcomeResult = await showWelcomeStep();
        if (welcomeResult === 'next') {
          currentStep = SetupStep.Login;
        } else {
          cancelled = true;
        }
        break;
      }

      case SetupStep.Login: {
        const loginResult = await showLoginStep();
        if (loginResult === 'next') {
          currentStep = SetupStep.PasswordSetup;
        } else if (loginResult === 'back') {
          currentStep = SetupStep.Welcome;
        } else {
          cancelled = true;
        }
        break;
      }

      case SetupStep.PasswordSetup: {
        const passwordResult = await showPasswordStep();
        if (passwordResult === 'next') {
          currentStep = SetupStep.WorkspaceCheck;
        } else if (passwordResult === 'back') {
          currentStep = SetupStep.Login;
        } else {
          cancelled = true;
        }
        break;
      }

      case SetupStep.WorkspaceCheck: {
        const workspaceResult = await showWorkspaceStep();
        if (workspaceResult === 'next') {
          currentStep = SetupStep.Complete;
        } else if (workspaceResult === 'back') {
          currentStep = SetupStep.PasswordSetup;
        } else {
          cancelled = true;
        }
        break;
      }
    }
  }

  if (!cancelled) {
    // Mark wizard as completed
    await context.globalState.update('dotvault.wizardCompleted', true);
    
    // Show completion message
    vscode.window.showInformationMessage(
      'DotVault setup complete! You can now sync and restore your .env files.',
      'View Commands'
    ).then(selection => {
      if (selection === 'View Commands') {
        vscode.commands.executeCommand('workbench.action.quickOpen', '>DotVault:');
      }
    });
  }
}

/**
 * Show the welcome step of the setup wizard
 * @returns Promise resolving to the user's choice
 */
async function showWelcomeStep(): Promise<string> {
  const result = await vscode.window.showInformationMessage(
    'Welcome to DotVault! This wizard will help you set up the extension for securely managing your .env files.',
    { modal: true },
    'Next',
    'Skip'
  );

  if (result === 'Next') {
    return 'next';
  } else {
    return 'cancel';
  }
}

/**
 * Show the login step of the setup wizard
 * @returns Promise resolving to the user's choice
 */
async function showLoginStep(): Promise<string> {
  const isLoggedIn = await auth.isLoggedIn();

  if (isLoggedIn) {
    return 'next';
  }

  const result = await vscode.window.showInformationMessage(
    'First, you need to log in with your GitHub account. This allows DotVault to securely store your encrypted .env files.',
    { modal: true },
    'Login with GitHub',
    'Back',
    'Skip'
  );

  if (result === 'Login with GitHub') {
    await auth.login();
    // Check if login was successful
    const loginSuccess = await auth.isLoggedIn();
    if (loginSuccess) {
      return 'next';
    } else {
      // If login failed, stay on this step
      return 'current';
    }
  } else if (result === 'Back') {
    return 'back';
  } else {
    return 'cancel';
  }
}

/**
 * Show the password setup step of the setup wizard
 * @returns Promise resolving to the user's choice
 */
async function showPasswordStep(): Promise<string> {
  const result = await vscode.window.showInformationMessage(
    'Next, you\'ll need to set up an encryption password. This password will be used to encrypt and decrypt your .env files. ' +
    'You\'ll be prompted to create or enter this password when you sync or restore files.',
    { modal: true },
    'Continue',
    'Back',
    'Skip'
  );

  if (result === 'Continue') {
    return 'next';
  } else if (result === 'Back') {
    return 'back';
  } else {
    return 'cancel';
  }
}

/**
 * Show the workspace check step of the setup wizard
 * @returns Promise resolving to the user's choice
 */
async function showWorkspaceStep(): Promise<string> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  
  if (!workspaceFolders || workspaceFolders.length === 0) {
    const result = await vscode.window.showWarningMessage(
      'No workspace is currently open. You\'ll need to open a workspace with .env files to use DotVault.',
      { modal: true },
      'Finish Setup Anyway',
      'Back'
    );

    if (result === 'Finish Setup Anyway') {
      return 'next';
    } else {
      return 'back';
    }
  }

  // Check for .env files in the workspace
  let envFilesFound = false;
  for (const folder of workspaceFolders) {
    const pattern = new vscode.RelativePattern(folder, '**/.env*');
    const files = await vscode.workspace.findFiles(pattern, null, 1);
    if (files.length > 0) {
      envFilesFound = true;
      break;
    }
  }

  if (envFilesFound) {
    const result = await vscode.window.showInformationMessage(
      '.env files were found in your workspace. You can sync these files using the "DotVault: Sync .env Files" command.',
      { modal: true },
      'Finish Setup',
      'Back'
    );

    if (result === 'Finish Setup') {
      return 'next';
    } else {
      return 'back';
    }
  } else {
    const result = await vscode.window.showInformationMessage(
      'No .env files were found in your workspace. You can create .env files and then sync them using the "DotVault: Sync .env Files" command.',
      { modal: true },
      'Finish Setup',
      'Back'
    );

    if (result === 'Finish Setup') {
      return 'next';
    } else {
      return 'back';
    }
  }
}
