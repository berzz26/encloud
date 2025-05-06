# Change Log

All notable changes to the "env-vault" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.2.0] - 2025-05-06

### Added
- Setup wizard for first-time users
- Husky pre-commit hooks for code quality
- GitHub Actions CI/CD workflows
- Comprehensive documentation (DEVELOPMENT.md, CONTRIBUTING.md)
- GitHub issue and PR templates

### Changed
- Converted entire codebase from JavaScript to TypeScript
- Switched from npm to pnpm for package management
- Changed build output directory from 'out' to 'dist'
- Improved error handling with custom error classes
- Enhanced type safety with proper TypeScript types

### Fixed
- ESLint configuration for TypeScript compatibility
- Type definitions for Supabase authentication
- Packaging issues with pnpm dependencies

## [0.1.4] - Initial release

- Initial version of Env Vault extension
- Secure encryption and storage of .env files in Supabase
- GitHub authentication via Supabase
- Basic commands for syncing and restoring .env files