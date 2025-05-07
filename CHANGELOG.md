# Change Log

All notable changes to the "encloud" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.4.3] - 2025-05-07

### Fixed

- Fixed extension activation events to properly register commands
- Added explicit file inclusion list to ensure all required files are published
- Updated .vscodeignore to prevent dist directory exclusion

## [0.4.2] - 2025-05-07

### Fixed

- Fixed extension activation events to properly register commands
- Resolved "command not found" error for encloud.login
- Ensured proper command registration during extension startup

## [0.4.1] - 2025-05-07

### Fixed

- Fixed command naming to use 'encloud' prefix consistently
- Updated OAuth callback URL to use new extension identifier
- Fixed global state keys to use 'encloud' namespace

## [0.4.0] - 2025-05-06

### Changed

- Renamed project from "DotVault" to "Encloud" for better branding
- Updated all references in code and documentation
- Changed package name from "dot-vault" to "encloud"
- Updated GitHub repository references
- Modified command categories from "DotVault" to "Encloud"

### Added

- Added MIT LICENSE.md file

## [0.3.2] - 2025-05-06

### Fixed

- Fixed VS Code Marketplace publishing by adding --no-dependencies flag to vsce publish command
- Resolved dependency issues in GitHub Actions workflow

## [0.3.1] - 2025-05-06

### Fixed

- Fixed GitHub Actions workflow for publishing to VS Code Marketplace
- Improved error handling for Supabase database operations
- Updated documentation for Supabase table setup

## [0.3.0] - 2025-05-06

### Fixed

- Fixed environment variable loading to properly detect .env files in different locations
- Added missing fs import in auth.ts
- Fixed extension activation to ensure commands are properly registered
- Improved error handling for Supabase connection
- Added missing SUPABASE_CALLBACK_URL to .env.example

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

- Initial version of Encloud extension
- Secure encryption and storage of .env files in Supabase
- GitHub authentication via Supabase
- Basic commands for syncing and restoring .env files
