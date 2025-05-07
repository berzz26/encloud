# Development Guide for Encloud

This project uses [pnpm](https://pnpm.io/) as its package manager for faster and more efficient dependency management. This guide will help you set up your development environment and understand the project workflow.

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [pnpm](https://pnpm.io/) (v8 or higher)
- [VS Code](https://code.visualstudio.com/)

## Getting Started

1. Install pnpm if you haven't already:
   ```bash
   npm install -g pnpm
   ```

2. Clone the repository:
   ```bash
   git clone https://github.com/berzz26/encloud.git
   cd encloud
   ```

3. Install dependencies:
   ```bash
   pnpm install
   ```

4. Create a `.env` file with your Supabase credentials (see `.env.example` for reference):
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

## Development Workflow

### Local Development

- Use `pnpm run watch` for continuous compilation during development
- The pre-commit hooks will automatically run linting and formatting before each commit

### Building the Extension

```bash
pnpm run build
```

This will:
- Clean the output directory
- Compile TypeScript to JavaScript

### Testing the Extension Locally

#### Method 1: Using VS Code Extension Development Host

1. Open the project in VS Code
2. Press `F5` or click the "Run and Debug" icon in the sidebar and select "Run Extension"
3. This will open a new VS Code window with your extension loaded
4. You can test all the commands from the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)

#### Method 2: Installing the Extension Locally

1. Build the extension
   ```bash
   pnpm run build
   ```

2. Package the extension into a .vsix file
   ```bash
   pnpm run package
   ```

3. Install the packaged extension
   ```bash
   code --install-extension encloud-[version].vsix
   ```
   (Replace `[version]` with the current version number)

4. Restart VS Code to use the installed extension

### Running Tests

```bash
pnpm run test
```

## Versioning and Releases

### Version Management

The project uses semantic versioning. To update the version:

```bash
# For patch updates (bug fixes)
pnpm run version:patch

# For minor updates (new features, backward compatible)
pnpm run version:minor

# For major updates (breaking changes)
pnpm run version:major
```

### Commit Message Convention

We follow a conventional commit message format to make the commit history more readable and to automate versioning and release processes.

Each commit message should be structured as follows:

```
<type>: <description>
```

Where `<type>` is one of:

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to the build process or auxiliary tools and libraries

Examples:
- `feat: add new encryption method`
- `fix: resolve issue with auth token refresh`
- `docs: update readme with installation instructions`
- `chore: update dependencies`

### Creating a Release

To create a new release:

1. Update the version using one of the version scripts:

```bash
# For patch updates (bug fixes)
pnpm run version:patch

# For minor updates (new features, backward compatible)
pnpm run version:minor

# For major updates (breaking changes)
pnpm run version:major
```

2. The script will automatically update the CHANGELOG.md file with a new entry

3. If you're on the main branch, the script will attempt to commit the changes and create a tag

4. Push the changes and tag to trigger the release workflow:

```bash
git push && git push --tags
```

This will trigger the release workflow in GitHub Actions, which will:
1. Build and test the extension
2. Package the extension
3. Create a GitHub Release with the .vsix file attached

## CI/CD Pipeline

The project uses GitHub Actions for continuous integration and deployment:

### CI Workflow

Triggered on:
- Push to main branch
- Pull requests to main branch

Actions:
- Build the extension
- Run tests

### Release Workflow

Triggered on:
- Push of a tag with format `v*`

Actions:
- Build and test the extension
- Package the extension
- Create a GitHub Release
- Publish to VS Code Marketplace (requires `VSCE_PAT` secret)

### VS Code Marketplace Publishing

> **Note:** Automatic publishing to the VS Code Marketplace is currently disabled in the workflow.

When you're ready to enable publishing to the VS Code Marketplace:

1. Obtain a Personal Access Token (PAT) from [Azure DevOps](https://dev.azure.com/)
   - Follow the [instructions here](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) to get a PAT

2. Add the token as a secret named `VSCE_TOKEN` in your GitHub repository settings

3. Uncomment the publishing step in the `.github/workflows/release.yml` file

For now, you can manually publish the extension using:

```bash
pnpm exec vsce publish -p <your-pat>
```

Or just package it for local distribution:

```bash
pnpm run package
```

## Project Structure

```
encloud/
├── .github/               # GitHub-specific files
│   ├── workflows/         # GitHub Actions workflows
│   └── ISSUE_TEMPLATE/    # Issue templates
├── .husky/                # Husky git hooks
├── .vscode/               # VS Code settings
├── dist/                  # Compiled output (generated)
├── node_modules/          # Dependencies (generated)
├── scripts/               # Build and utility scripts
├── src/                   # Source code
│   ├── auth.ts            # Authentication module
│   ├── encryption.ts      # Encryption utilities
│   ├── extension.ts       # Extension entry point
│   ├── setupWizard.ts     # First-time setup wizard
│   ├── types.ts           # Type definitions
│   └── ...                # Other source files
├── test/                  # Test files
├── .eslintrc.js           # ESLint configuration
├── .gitignore             # Git ignore file
├── .prettierrc            # Prettier configuration
├── CONTRIBUTING.md        # Contribution guidelines
├── DEVELOPMENT.md         # Development documentation
├── package.json           # Project manifest
├── pnpm-lock.yaml         # pnpm lock file
├── tsconfig.json          # TypeScript configuration
└── README.md              # Project documentation

## Code Style and Linting

The project uses:
- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting

These tools are automatically run as pre-commit hooks using Husky and lint-staged.

### Coding Standards

- Use TypeScript for all new code
- Follow the existing code style
- Add JSDoc comments to all functions and classes
- Use interfaces for object shapes
- Use proper error handling with try/catch blocks
- Implement proper type definitions for better code safety
- Follow the zero-knowledge design pattern for sensitive data
- Ensure proper error handling for authentication and encryption operations

## Submitting Changes

Please refer to [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on contributing to this project.
