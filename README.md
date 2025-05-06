# Env Vault

<div align="center">
  
![Env Vault Logo](https://via.placeholder.com/150x150.png?text=Env+Vault)

**Securely sync and restore `.env` files across your VS Code projects**

[![Version](https://img.shields.io/visual-studio-marketplace/v/AumTamboli.env-vault)](https://marketplace.visualstudio.com/items?itemName=AumTamboli.env-vault)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/AumTamboli.env-vault)](https://marketplace.visualstudio.com/items?itemName=AumTamboli.env-vault)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/AumTamboli.env-vault)](https://marketplace.visualstudio.com/items?itemName=AumTamboli.env-vault)
[![License](https://img.shields.io/github/license/berzz26/env-vault)](https://github.com/berzz26/env-vault/blob/main/LICENSE)

</div>

Env Vault allows developers to securely encrypt and store `.env` files in Supabase using password-based encryption. Perfect for managing environment variables across different machines and projects.

## 📸 Screenshots

<div align="center">
  
![Login Screen](https://via.placeholder.com/800x450.png?text=Login+Screen)
*GitHub authentication flow*

![Sync Files](https://via.placeholder.com/800x450.png?text=Sync+Files)
*Selecting .env files to sync*

![Restore Files](https://via.placeholder.com/800x450.png?text=Restore+Files)
*Restoring encrypted .env files*

</div>

## ✨ Features

- Detects `.env*` files in your workspace
- Password-based encryption (PBKDF2 + AES-256-CBC)
- GitHub authentication for user management
- Secure cloud storage with end-to-end encryption
- Restore `.env` files on any device with your password

## 🚀 Getting Started

### Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Env Vault"
4. Click Install

### First-time Setup

1. Open the Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Type "EnvVault: Login" and press Enter
3. Authenticate with your GitHub account
4. Create your encryption password (minimum 8 characters)
   - **Important**: This password is used to encrypt your data and cannot be recovered if lost

### Basic Usage

1. **Syncing .env Files**:
   - Open the Command Palette
   - Run "EnvVault: Sync .env Files"
   - Select files to encrypt and sync

2. **Restoring .env Files**:
   - Open the Command Palette
   - Run "EnvVault: Restore .env Files"
   - Enter your password to decrypt files

3. **Clearing Stored Data**:
   - Open the Command Palette
   - Run "EnvVault: Clear .env Data"
   - Confirm to remove all stored .env files

## 🔒 Security

- Password-based key derivation (PBKDF2 with 100,000 iterations)
- AES-256-CBC encryption for file contents
- Only salt and verification hash stored in database
- Zero-knowledge design - server never sees your password or decrypted data
- Each operation requires password verification

## 🛠️ For Developers

### Prerequisites

- Node.js (v14 or higher)
- VS Code
- Supabase account (for backend)

### Local Development Setup

This project uses [pnpm](https://pnpm.io/) as its package manager for faster and more efficient dependency management.

1. Install pnpm if you haven't already:
   ```bash
   npm install -g pnpm
   ```

2. Clone the repository:
   ```bash
   git clone https://github.com/berzz26/env-vault.git
   cd env-vault
   ```

3. Install dependencies:
   ```bash
   pnpm install
   ```

4. Create a `.env` file with your Supabase credentials:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. Run the extension in development mode:
   - Press F5 in VS Code to start debugging
   - A new VS Code window will open with the extension loaded

### Building the Extension

```bash
pnpm run build   # Compile TypeScript code
pnpm run package # Create VSIX package
```

This will create a `.vsix` file that can be installed manually in VS Code.

## ❓ Troubleshooting

### Common Issues

1. **Login Fails**
   - Ensure you have a stable internet connection
   - Check if GitHub authentication services are operational
   - Try clearing browser cookies and cache

2. **Cannot Sync Files**
   - Verify that your workspace contains `.env` files
   - Ensure you're logged in (run "EnvVault: Login" first)
   - Check if you have write permissions to the workspace

3. **Password Not Working**
   - Passwords are case-sensitive
   - Ensure you're using the same password that was set during initial setup
   - There is no password recovery - if lost, you'll need to clear data and start fresh

4. **Files Not Restoring**
   - Verify that you've previously synced files
   - Check if you're using the correct password
   - Ensure you have write permissions to the workspace

### Getting Help

If you encounter issues not covered here, please [open an issue](https://github.com/berzz26/env-vault/issues/new) on GitHub.

## ⚠️ Important Notes

- Keep your password safe - there's no recovery mechanism
- Password required for both sync and restore operations
- Works across different devices with the same password
- Always backup important .env files before using this extension

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to contribute to this project.
