# Contributing to DotVault

Thank you for considering contributing to DotVault! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please be respectful and considerate of others.

## How Can I Contribute?

### Reporting Bugs

Before submitting a bug report:
- Check the [issue tracker](https://github.com/berzz26/dot-vault/issues) to see if the problem has already been reported
- Ensure you're using the latest version of the extension

When submitting a bug report, please include:
- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior vs. actual behavior
- Screenshots if applicable
- Your environment details (VS Code version, OS, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:
- Use a clear and descriptive title
- Provide a detailed description of the proposed functionality
- Explain why this enhancement would be useful
- Include mockups or examples if possible

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

### Pull Requests

1. Fork the repository
2. Create a new branch (`git checkout -b feat/amazing-feature`)
3. Make your changes
4. Run tests and linting (`pnpm run test` and `pnpm run lint`)
5. Commit your changes using the conventional format (`git commit -m 'feat: add amazing feature'`)
6. Push to the branch (`git push origin feat/amazing-feature`)
7. Open a Pull Request

## Development Setup

1. Clone your fork of the repository
2. Install dependencies: `pnpm install`
3. Create a `.env` file with your Supabase credentials
4. Start the development server: Press F5 in VS Code

## Coding Guidelines

### TypeScript

- Use TypeScript for all new code
- Follow the existing code style
- Add JSDoc comments to all functions and classes
- Use interfaces for object shapes
- Use proper error handling with try/catch blocks

### Testing

- Write tests for all new functionality
- Ensure all tests pass before submitting a PR
- Aim for good test coverage

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `style:` for formatting changes
- `refactor:` for code refactoring
- `test:` for adding or modifying tests
- `chore:` for maintenance tasks

## Release Process

The maintainers will handle the release process, including:
- Version bumping
- Changelog updates
- Publishing to the VS Code Marketplace

## Questions?

If you have any questions about contributing, please open an issue or contact the maintainers.

Thank you for contributing to DotVault!
