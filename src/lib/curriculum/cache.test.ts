import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// Mock the logging module before importing cache
vi.mock('$lib/logging', () => ({
    logCache: vi.fn()
}));

// We need to mock fs for isolated tests
vi.mock('fs');

describe('Cache Module', () => {
    const mockCacheDir = '/mock/cache';
    const mockRepoUrl = 'https://github.com/test/repo';
    const mockCurriculum = {
        projectName: 'Test Project',
        description: 'A test project',
        patterns: ['Pattern 1'],
        lessons: []
    };

    beforeEach(() => {
        vi.resetAllMocks();
        // Mock process.cwd
        vi.spyOn(process, 'cwd').mockReturnValue('/mock');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('getCachedCurriculum', () => {
        it('should return null if cache file does not exist', async () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);

            // Dynamically import after mocks are set
            const { getCachedCurriculum } = await import('./cache');
            const result = getCachedCurriculum(mockRepoUrl, 'abc123');

            expect(result).toBeNull();
        });

        it('should return curriculum if commit hash matches', async () => {
            const cacheData = {
                repoUrl: mockRepoUrl,
                timestamp: new Date().toISOString(),
                commitHash: 'abc123',
                curriculum: mockCurriculum
            };

            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(cacheData));

            const { getCachedCurriculum } = await import('./cache');
            const result = getCachedCurriculum(mockRepoUrl, 'abc123');

            expect(result).toEqual(mockCurriculum);
        });

        it('should return curriculum if within same day (even with different commit)', async () => {
            const cacheData = {
                repoUrl: mockRepoUrl,
                timestamp: new Date().toISOString(), // Today
                commitHash: 'old-commit',
                curriculum: mockCurriculum
            };

            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(cacheData));

            const { getCachedCurriculum } = await import('./cache');
            const result = getCachedCurriculum(mockRepoUrl, 'new-commit');

            expect(result).toEqual(mockCurriculum);
        });

        it('should return null if cache is from different day and commit differs', async () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const cacheData = {
                repoUrl: mockRepoUrl,
                timestamp: yesterday.toISOString(),
                commitHash: 'old-commit',
                curriculum: mockCurriculum
            };

            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(cacheData));

            const { getCachedCurriculum } = await import('./cache');
            const result = getCachedCurriculum(mockRepoUrl, 'new-commit');

            expect(result).toBeNull();
        });
    });

    describe('setCachedCurriculum', () => {
        it('should write cache file and update index', async () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue('[]');
            vi.mocked(fs.writeFileSync).mockImplementation(() => { });

            const { setCachedCurriculum } = await import('./cache');
            setCachedCurriculum(mockRepoUrl, mockCurriculum as any, 'abc123');

            expect(fs.writeFileSync).toHaveBeenCalled();
        });
    });

    describe('listCachedProjects', () => {
        it('should return empty array if cache dir does not exist', async () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);

            const { listCachedProjects } = await import('./cache');
            const result = listCachedProjects();

            expect(result).toEqual([]);
        });

        it('should return sorted projects from index', async () => {
            const mockIndex = [
                { repoUrl: 'repo1', timestamp: '2026-01-01T10:00:00Z', projectName: 'A' },
                { repoUrl: 'repo2', timestamp: '2026-01-01T12:00:00Z', projectName: 'B' }
            ];

            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockIndex));

            const { listCachedProjects } = await import('./cache');
            const result = listCachedProjects();

            // Should be sorted newest first
            expect(result[0].projectName).toBe('B');
            expect(result[1].projectName).toBe('A');
        });
    });
});
