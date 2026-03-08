import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

function execFileSafe(command: string, args: string[], options: { cwd?: string } = {}): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, options);
        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => stdout += data);
        child.stderr.on('data', (data) => stderr += data);

        child.on('close', (code) => {
            if (code === 0) {
                resolve({ stdout, stderr });
            } else {
                const error = new Error(`Command failed with code ${code}`);
                (error as any).stderr = stderr;
                reject(error);
            }
        });
    });
}

export function isValidRepoUrl(url: string): boolean {
    // Basic but strict regex for https/ssh git URLs
    const gitUrlRegex = /^(https:\/\/|git@|github\.com:|gitlab\.com:)[a-zA-Z0-9._\-\/@:]+(\.git)?\/?$/;
    return gitUrlRegex.test(url);
}

export async function cloneRepo(repoUrl: string): Promise<string> {
    if (!isValidRepoUrl(repoUrl)) {
        throw new Error('Invalid repository URL format');
    }

    const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'unknown';
    const targetDir = path.join(process.cwd(), 'repos', repoName);

    if (fs.existsSync(targetDir)) {
        try {
            await execFileSafe('git', ['pull'], { cwd: targetDir });
        } catch (e) {
            console.warn('Failed to pull latest changes, using existing version.');
        }
        return targetDir;
    }

    try {
        await execFileSafe('git', ['clone', repoUrl, targetDir]);
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
        const { stdout } = await execFileSafe('git', ['rev-parse', 'HEAD'], { cwd: repoDir });
        return stdout.toString().trim();
    } catch (e) {
        console.error('Failed to get commit hash:', e);
        return 'unknown';
    }
}
