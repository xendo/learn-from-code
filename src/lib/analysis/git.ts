import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

export async function cloneRepo(repoUrl: string): Promise<string> {
    const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'unknown';
    const targetDir = path.join(process.cwd(), 'repos', repoName);

    if (fs.existsSync(targetDir)) {
        try {
            await execAsync('git pull', { cwd: targetDir });
        } catch (e) {
            console.warn('Failed to pull latest changes, using existing version.');
        }
        return targetDir;
    }

    try {
        await execAsync(`git clone ${repoUrl} ${targetDir}`);
        return targetDir;
    } catch (error: any) {
        const stderr = error.stderr ? error.stderr.toString() : '';
        const msg = `Cloning failed: ${stderr || error.message}`;
        console.error(msg);
        throw new Error(msg);
    }
}

export async function getLatestCommitHash(repoDir: string): Promise<string> {
    try {
        const { stdout } = await execAsync('git rev-parse HEAD', { cwd: repoDir });
        return stdout.toString().trim();
    } catch (e) {
        console.error('Failed to get commit hash:', e);
        return 'unknown';
    }
}
