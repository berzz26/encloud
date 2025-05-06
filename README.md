# Env Vault

**Securely sync and restore `.env` files across your VS Code projects.**

Env Vault allows developers to securely encrypt and store `.env` files in Supabase using password-based encryption. Perfect for managing environment variables across different machines and projects.

## Features

- Detects `.env*` files in your workspace
- Password-based encryption (PBKDF2 + AES-256-CBC)
- GitHub authentication for user management
- Secure cloud storage with end-to-end encryption
- Restore `.env` files on any device with your password

## How to Use

1. Login with GitHub through the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Set up your encryption password (first time only)
3. Choose from available commands:
   - `EnvVault: Sync` → Select and encrypt `.env` files
   - `EnvVault: Restore` → Decrypt and restore your files
   - `EnvVault: Clear` → Remove stored `.env` files

## Security

- Password-based key derivation (PBKDF2 with 100,000 iterations)
- AES-256-CBC encryption for file contents
- Only salt and verification hash stored in database
- Zero-knowledge design - server never sees your password or decrypted data
- Each operation requires password verification

## Important Notes

- Keep your password safe - there's no recovery mechanism
- Password required for both sync and restore operations
- Works across different devices with the same password

