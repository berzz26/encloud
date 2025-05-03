
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
				vscode.window.showInformationMessage(`Error reading ${filename}: ${err.message}`);
				return;
			}
			vscode.window.showInformationMessage(`${filename} contents:\n${data.substring(0, 200)}...`);
		});
	};
	
	const readMultipleEnv = (fileList) => {
		fileList.forEach(file => readEnv(file));
	};
	
	const selectEnvFile = async () => {
		const envFiles = getEnvFiles();
	
		if (envFiles.length === 0) {
			vscode.window.showInformationMessage('No .env files found in the workspace');
			return;
		}
	
		const options = ['[Read All Detected .env Files]', ...envFiles];
	
		const selectedFile = await vscode.window.showQuickPick(options, {
			placeHolder: 'Select an .env file to work with or read all'
		});
	
		if (!selectedFile) return;
	
		if (selectedFile === '[Read All Detected .env Files]') {
			vscode.window.showInformationMessage(' Reading all .env files...');
			readMultipleEnv(envFiles);
		} else {
			vscode.window.showInformationMessage(`Selected file: ${selectedFile}`);
			readEnv(selectedFile);
		}
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
