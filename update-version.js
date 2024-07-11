const fs = require('fs');
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
