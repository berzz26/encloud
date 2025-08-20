// build.js
const esbuild = require('esbuild');

async function build() {
  try {
    await esbuild.build({
      entryPoints: ['src/extension.ts'], // Your extension's entry point
      bundle: true, // Bundle all dependencies
      outfile: 'dist/extension.js', // Output file
      platform: 'node', // Target platform for VS Code extensions
      format: 'cjs', // Output format for VS Code extensions
      external: ['vscode'], // Exclude 'vscode' module, it's provided by the runtime
      sourcemap: true, // Generate a sourcemap for debugging
    });
    console.log('✅ Build successful!');
  } catch (error) {
    console.error('🔥 Build failed:', error);
    process.exit(1);
  }
}

build();
