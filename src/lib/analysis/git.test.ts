import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import { EventEmitter } from 'events';

// Mock child_process spawn
const mockStdout = new EventEmitter();
const mockStderr = new EventEmitter();
const mockChild = Object.assign(new EventEmitter(), {
    stdout: mockStdout,
    stderr: mockStderr,
    unref: vi.fn(),
    kill: vi.fn()
});

const mockSpawn = vi.fn().mockReturnValue(mockChild);

vi.mock('child_process', () => ({
    spawn: mockSpawn
}));

const mockExistsSync = vi.fn();
vi.mock('fs', () => {
    const mockFs = {
        existsSync: (...args: any[]) => mockExistsSync(...args),
        readFileSync: vi.fn(),
        promises: {
            readFile: vi.fn()
        }
    };
    return {
        ...mockFs,
        default: mockFs
    };
});

describe('Git Module', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.spyOn(process, 'cwd').mockReturnValue('/mock');

        // Reset stdout/stderr mocks
        mockStdout.removeAllListeners();
        mockStderr.removeAllListeners();
        mockChild.removeAllListeners();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('isValidRepoUrl', () => {
        it('should allow valid HTTPS URLs', async () => {
            const { isValidRepoUrl } = await import('./git');
            expect(isValidRepoUrl('https://github.com/user/repo')).toBe(true);
            expect(isValidRepoUrl('https://github.com/user/repo.git')).toBe(true);
        });

        it('should allow valid SSH URLs', async () => {
            const { isValidRepoUrl } = await import('./git');
            expect(isValidRepoUrl('git@github.com:user/repo.git')).toBe(true);
        });

        it('should reject URLs with shell metacharacters', async () => {
            const { isValidRepoUrl } = await import('./git');
            expect(isValidRepoUrl('https://github.com/user/repo; ls')).toBe(false);
            expect(isValidRepoUrl('https://github.com/user/repo && echo hacked')).toBe(false);
        });
    });

    describe('cloneRepo', () => {
        it('should pull if repo already exists', async () => {
            mockExistsSync.mockReturnValue(true);

            const { cloneRepo } = await import('./git');
            const clonePromise = cloneRepo('https://github.com/test/my-repo');

            // Simulate successful process exit
            mockChild.emit('close', 0);
            const result = await clonePromise;

            expect(result).toBe('/mock/repos/my-repo');
            expect(mockSpawn).toHaveBeenCalledWith('git', ['pull'], expect.any(Object));
        });

        it('should clone if repo does not exist', async () => {
            mockExistsSync.mockReturnValue(false);

            const { cloneRepo } = await import('./git');
            const clonePromise = cloneRepo('https://github.com/test/new-repo');

            mockChild.emit('close', 0);
            const result = await clonePromise;

            expect(result).toBe('/mock/repos/new-repo');
            expect(mockSpawn).toHaveBeenCalledWith('git', ['clone', 'https://github.com/test/new-repo', '/mock/repos/new-repo'], expect.any(Object));
        });

        it('should throw error for invalid URLs before even trying to clone', async () => {
            const { cloneRepo } = await import('./git');
            await expect(cloneRepo('invalid-url; rm -rf /'))
                .rejects.toThrow('Invalid repository URL format');

            expect(mockSpawn).not.toHaveBeenCalled();
        });
    });

    describe('getLatestCommitHash', () => {
        it('should return commit hash from git rev-parse', async () => {
            const { getLatestCommitHash } = await import('./git');
            const hashPromise = getLatestCommitHash('/mock/repos/test');

            mockStdout.emit('data', Buffer.from('abc123def456\n'));
            mockChild.emit('close', 0);

            const result = await hashPromise;

            expect(result).toBe('abc123def456');
            expect(mockSpawn).toHaveBeenCalledWith('git', ['rev-parse', 'HEAD'], { cwd: '/mock/repos/test' });
        });

        it('should return "unknown" if git command fails', async () => {
            const { getLatestCommitHash } = await import('./git');
            const hashPromise = getLatestCommitHash('/mock/repos/test');

            mockChild.emit('close', 1); // Failure

            const result = await hashPromise;

            expect(result).toBe('unknown');
        });
    });
});
