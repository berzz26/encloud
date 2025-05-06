/**
 * Script to automatically update version numbers across the project
 * This script should be run after pnpm version commands
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Define types for package.json
interface PackageJson {
  version: string;
  name: string;
  [key: string]: unknown;
}

// Read the current version from package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as PackageJson;
const version = packageJson.version;

console.log(`Updating project to version ${version}`);

// Update CHANGELOG.md with new version
try {
  const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
  const changelog = fs.readFileSync(changelogPath, 'utf8');
  
  const today = new Date().toISOString().split('T')[0];
  const newVersionEntry = `## [${version}] - ${today}\n\n### Added\n- [Add new features here]\n\n### Changed\n- [Add changes here]\n\n### Fixed\n- [Add fixes here]\n\n`;
  
  // Check if this version already exists in the changelog
  if (!changelog.includes(`## [${version}]`)) {
    // Add new version entry after the header
    const updatedChangelog = changelog.replace(
      /# Change Log\n\n/,
      `# Change Log\n\n${newVersionEntry}`
    );
    
    fs.writeFileSync(changelogPath, updatedChangelog);
    console.log(`Updated CHANGELOG.md with version ${version}`);
  } else {
    console.log(`Version ${version} already exists in CHANGELOG.md`);
  }
} catch (error) {
  console.error('Error updating CHANGELOG.md:', error);
}

// Commit the version changes if we're on the main branch
try {
  const currentBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
  
  if (currentBranch === 'main' || currentBranch === 'master') {
    console.log('On main branch, committing version changes...');
    
    try {
      execSync('git add package.json pnpm-lock.yaml CHANGELOG.md');
      execSync(`git commit -m "chore: bump version to ${version}"`);
      execSync(`git tag v${version}`);
      
      console.log(`Changes committed and tagged as v${version}`);
      console.log('To push changes and trigger the release workflow:');
      console.log('  git push && git push --tags');
    } catch (commitError) {
      console.error('Error committing changes:', commitError instanceof Error ? commitError.message : String(commitError));
      console.log('You may need to commit and tag manually:');
      console.log(`  git add package.json pnpm-lock.yaml CHANGELOG.md`);
      console.log(`  git commit -m "chore: bump version to ${version}"`);
      console.log(`  git tag v${version}`);
      console.log(`  git push && git push --tags`);
    }
  } else {
    console.log(`Currently on branch '${currentBranch}', not committing version changes.`);
    console.log('Version changes will be committed when merged to main branch.');
    console.log('After merging to main, you can tag the release with:');
    console.log(`  git tag v${version}`);
    console.log(`  git push --tags`);
  }
} catch (error) {
  console.error('Error with Git operations:', error instanceof Error ? error.message : String(error));
  console.log('Please check if Git is installed and the repository is properly configured.');
}

console.log('Version update complete!');
