import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GITHUB_REPO = 'matter-labs/zksync-os-server';
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const IMAGE_PATTERN = /ghcr\.io\/matter-labs\/zksync-os-server:([^\s"]+)/;

async function main() {
    // @ts-ignore
    const scriptDir = path.dirname(fileURLToPath(import.meta.url));
    const rootDir = path.resolve(scriptDir, '../..');
    const composeFile = path.join(rootDir, 'docker-compose-deps.yaml');
    const stateFile = path.join(scriptDir, 'zkos-l1-state.json');

    if (!fs.existsSync(composeFile)) {
        throw new Error(`docker-compose-deps.yaml not found at ${composeFile}`);
    }

    const composeContent = fs.readFileSync(composeFile, 'utf-8');
    const currentVersionMatch = composeContent.match(IMAGE_PATTERN);

    if (!currentVersionMatch) {
        throw new Error(`Could not extract current zksyncos version from ${composeFile}`);
    }

    const currentVersion = currentVersionMatch[1]; // First match group
    console.log(`Current version: ${currentVersion}`);

    console.log('Fetching latest release from GitHub...');
    const response = await fetch(GITHUB_API_URL);

    if (!response.ok) {
        throw new Error(`Failed to fetch release information from GitHub: ${response.status} ${response.statusText}`);
    }

    const release = (await response.json()) as { tag_name?: string };
    const latestVersion = release.tag_name;

    if (!latestVersion) {
        throw new Error('Could not extract latest version from GitHub API response');
    }

    console.log(`Latest version: ${latestVersion}`);

    if (currentVersion === latestVersion) {
        console.log('Already up to date!');
        return;
    }

    console.log(`New version available: ${currentVersion} -> ${latestVersion}`);

    console.log('Updating docker-compose-deps.yaml...');
    const updatedContent = composeContent.replace(
        new RegExp(`ghcr\\.io/matter-labs/zksync-os-server:${currentVersion}`, 'g'),
        `ghcr.io/matter-labs/zksync-os-server:${latestVersion}`
    );
    fs.writeFileSync(composeFile, updatedContent);

    const verifyMatch = updatedContent.match(IMAGE_PATTERN);
    if (verifyMatch?.[1] !== latestVersion) {
        throw new Error('Failed to update docker-compose-deps.yaml');
    }

    console.log('docker-compose-deps.yaml updated successfully');

    const downloadUrl = `https://github.com/${GITHUB_REPO}/releases/download/${latestVersion}/zkos-l1-state.json`;
    console.log(`Downloading zkos-l1-state.json from ${downloadUrl}...`);

    const stateResponse = await fetch(downloadUrl, { redirect: 'follow' });

    if (!stateResponse.ok) {
        throw new Error(`Failed to download zkos-l1-state.json: ${stateResponse.status} ${stateResponse.statusText}`);
    }

    const stateContent = await stateResponse.text();
    fs.writeFileSync(stateFile, stateContent);

    console.log(`zkos-l1-state.json downloaded successfully to ${stateFile}`);

    console.log('');
    console.log('Update complete!');
    console.log(`  - docker-compose-deps.yaml: ${currentVersion} -> ${latestVersion}`);
    console.log('  - zkos-l1-state.json: downloaded');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
