const fs = require('fs');

// Create the version.prod.ts file
const execSync = require('child_process').execSync;
const packageJson = require('./package.json');

const commitHash = execSync('git rev-parse HEAD').toString().trim();
const buildDate = new Date().toISOString();

const content = `
export const version = '${packageJson.version}';
export const buildDate = '${buildDate}';
export const commitHash = '${commitHash}';
`;

fs.writeFileSync('./src/environments/version.prod.ts', content);

// Set up the analytics tag in index.html
const indexContent = fs.readFileSync('./src/index.html', { encoding: 'utf8' });
let analyticsTag = '';
try {
  analyticsTag = fs.readFileSync('.analytics', { encoding: 'utf8' });
} catch (e) {
  console.log(`Could not read .analytics file: ${e.toString()}`);
}
fs.writeFileSync(
  './src/index.prod.html',
  indexContent.replace('<!-- ANALYTICS_TAG -->', analyticsTag)
);
