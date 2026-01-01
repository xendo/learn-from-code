import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

export function cloneRepo(repoUrl: string): string {
    const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'unknown';
    const targetDir = path.join(process.cwd(), 'repos', repoName);

    if (fs.existsSync(targetDir)) {
        try {
            execSync('git pull', { cwd: targetDir, stdio: 'ignore' });
        } catch (e) {
            console.warn('Failed to pull latest changes, using existing version.');
        }
        return targetDir;
    }

    try {
        execSync(`git clone ${repoUrl} ${targetDir}`, { stdio: 'pipe' });
        return targetDir;
    } catch (error: any) {
        const stderr = error.stderr ? error.stderr.toString() : '';
        const msg = `Cloning failed: ${stderr || error.message}`;
        console.error(msg);
        throw new Error(msg);
    }
}

export function getLatestCommitHash(repoDir: string): string {
    try {
        return execSync('git rev-parse HEAD', { cwd: repoDir }).toString().trim();
    } catch (e) {
        console.error('Failed to get commit hash:', e);
        return 'unknown';
    }
}
