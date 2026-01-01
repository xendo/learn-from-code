import fs from 'fs';
import path from 'path';
import type { Curriculum } from '../types';
import crypto from 'crypto';

const CACHE_DIR = path.join(process.cwd(), 'cache');

if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR);
}

function getCacheKey(repoUrl: string): string {
    return crypto.createHash('md5').update(repoUrl).digest('hex');
}

export function getCachedCurriculum(repoUrl: string, commitHash?: string): Curriculum | null {
    const key = getCacheKey(repoUrl);
    const cachePath = path.join(CACHE_DIR, `${key}.json`);

    if (!fs.existsSync(cachePath)) {
        return null;
    }

    try {
        const data = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));

        // If commitHash is provided, strictly check it
        if (commitHash && data.commitHash) {
            if (data.commitHash === commitHash) {
                return data.curriculum;
            }
            return null; // Commit changed, invalidate cache
        }

        // Fallback to timestamp check (same day)
        const timestamp = new Date(data.timestamp);
        const now = new Date();

        const isSameDay =
            timestamp.getFullYear() === now.getFullYear() &&
            timestamp.getMonth() === now.getMonth() &&
            timestamp.getDate() === now.getDate();

        if (isSameDay) {
            return data.curriculum;
        }

        return null;
    } catch (e) {
        console.error('Failed to read cache:', e);
        return null;
    }
}

export function setCachedCurriculum(repoUrl: string, curriculum: Curriculum, commitHash?: string): void {
    const key = getCacheKey(repoUrl);
    const cachePath = path.join(CACHE_DIR, `${key}.json`);

    const cacheData = {
        repoUrl,
        timestamp: new Date().toISOString(),
        commitHash,
        curriculum
    };

    try {
        fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2));
    } catch (e) {
        console.error('Failed to write cache:', e);
    }
}

export function listCachedProjects() {
    if (!fs.existsSync(CACHE_DIR)) return [];

    const files = fs.readdirSync(CACHE_DIR);
    const projects = [];

    for (const file of files) {
        if (!file.endsWith('.json')) continue;
        try {
            const data = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, file), 'utf-8'));
            projects.push({
                projectName: data.curriculum.projectName,
                description: data.curriculum.description,
                repoUrl: data.repoUrl,
                timestamp: data.timestamp
            });
        } catch (e) {
            console.error(`Failed to read cache file ${file}:`, e);
        }
    }

    return projects.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
