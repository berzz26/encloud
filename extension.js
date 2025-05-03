
const vscode = require('vscode');
const fs = require('fs')
const os = require('os')
const path = require('path');


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json

	const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
	const getEnvFiles = () => {
		const files = fs.readdirSync(workspaceFolder); // List all files in the workspace

		const envFiles = files.filter(file => file.startsWith('.env'));

		return envFiles;
	};

	const readEnv = (filename) => {
		
		fs.readFile(`${workspaceFolder}/${filename}`, 'utf8', (err, data) => {
			if (err) {
				vscode.window.showInformationMessage(''+err);
				return;
			}

			vscode.window.showInformationMessage('File Content: ' + data);
		});
	};


	const selectEnvFile = async () => {
		const envFiles = getEnvFiles(); // Get the .env files

		if (envFiles.length === 0) {
			vscode.window.showInformationMessage('No .env files found in the workspace');
			return;
		}

		const selectedFile = await vscode.window.showQuickPick(envFiles, {
			placeHolder: 'Select an .env file to work with'
		});

		if (!selectedFile) return;

		vscode.window.showInformationMessage(`Selected file: ${selectedFile}`);
		console.log('Selected file:', selectedFile);

		readEnv(selectedFile)
	};


	
	const get = vscode.commands.registerCommand('env-vault.getEnv', function () {
		// The code you place here will be executed every time your command is executed
		
		
		selectEnvFile()


	});

	const updateEnv = () => {


	}

	context.subscriptions.push(get);
}

function deactivate() { }

module.exports = {
	activate,
	deactivate
}
