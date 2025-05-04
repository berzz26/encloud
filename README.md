# Env Vault

**Securely sync and restore `.env` files across your VS Code projects.**

Env Vault allows developers to securely encrypt, store, and restore `.env` files using VS Code's global storage. Never worry about losing your local environment variables again.

## Features

- Detects `.env*` files in your workspace
- Encrypts and saves them in global storage (using AES-256-CBC)
- Restore `.env` files anytime on any project
- Minimal UI through VS Code’s command palette

##  How to Use

1. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Search for and run: `Env Vault: Get Env`
3. Choose from:
   - `[Sync .env Files]` → Select and store your `.env` files securely
   - `[Restore .env files]` → Restore your previously synced files into the current workspace

## Security

Your environment file content is encrypted with AES-256-CBC using a hashed secret key and stored in VS Code’s global storage. This ensures your data stays local and secure.

