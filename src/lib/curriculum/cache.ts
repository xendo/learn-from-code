import fs from 'fs';
import path from 'path';
import type { Curriculum } from '../types';
import crypto from 'crypto';
import { logCache } from '$lib/logging';

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
        logCache('debug', 'Cache miss - file not found', { repoUrl });
        return null;
    }

    try {
        const data = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));

        // Primary: Exact commit match = cache valid
        if (commitHash && data.commitHash && data.commitHash === commitHash) {
            logCache('info', 'Cache hit - commit match', { repoUrl, commitHash });
            return data.curriculum;
        }

        // Secondary: Same-day cache for frequently updated repos
        const cacheTime = new Date(data.timestamp);
        const now = new Date();
        const isSameDay =
            cacheTime.getFullYear() === now.getFullYear() &&
            cacheTime.getMonth() === now.getMonth() &&
            cacheTime.getDate() === now.getDate();

        if (isSameDay) {
            logCache('info', 'Cache hit - same day', { repoUrl, cacheTime: data.timestamp });
            return data.curriculum;
        }

        logCache('debug', 'Cache miss - stale', { repoUrl, cacheTime: data.timestamp });
        return null;
    } catch (e) {
        logCache('error', 'Failed to read cache', { repoUrl, error: (e as Error).message });
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
        updateIndex(repoUrl, curriculum, cacheData.timestamp);
        logCache('info', 'Cache written', { repoUrl, projectName: curriculum.projectName });
    } catch (e) {
        logCache('error', 'Failed to write cache', { repoUrl, error: (e as Error).message });
    }
}

function updateIndex(repoUrl: string, curriculum: Curriculum, timestamp: string) {
    const indexPath = path.join(CACHE_DIR, 'index.json');
    let index: any[] = [];

    if (fs.existsSync(indexPath)) {
        try {
            index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
        } catch (e) { }
    }

    index = index.filter(p => p.repoUrl !== repoUrl);
    index.unshift({
        projectName: curriculum.projectName,
        description: curriculum.description,
        repoUrl,
        timestamp
    });

    try {
        fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    } catch (e) {
        logCache('error', 'Failed to write cache index', { error: (e as Error).message });
    }
}

export function listCachedProjects() {
    if (!fs.existsSync(CACHE_DIR)) return [];

    const indexPath = path.join(CACHE_DIR, 'index.json');

    if (fs.existsSync(indexPath)) {
        try {
            const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
            return index.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        } catch (e) {
            // Corrupt index, fall through to rebuild
        }
    }

    // Slow path: Rebuild index from files
    const files = fs.readdirSync(CACHE_DIR);
    const projects = [];

    for (const file of files) {
        if (!file.endsWith('.json') || file === 'index.json') continue;
        try {
            const data = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, file), 'utf-8'));
            projects.push({
                projectName: data.curriculum.projectName,
                description: data.curriculum.description,
                repoUrl: data.repoUrl,
                timestamp: data.timestamp
            });
        } catch (e) {
            logCache('error', `Failed to read cache file ${file}`, { error: (e as Error).message });
        }
    }

    try {
        fs.writeFileSync(indexPath, JSON.stringify(projects, null, 2));
    } catch (e) { }

    return projects.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
