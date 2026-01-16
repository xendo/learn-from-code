import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';

// We need to mock the promisified exec, not exec itself
// Create a mock at the module level
const mockExec = vi.fn();

vi.mock('child_process', () => ({
    exec: vi.fn()
}));

vi.mock('util', () => ({
    promisify: () => mockExec
}));

vi.mock('fs');

describe('Git Module', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.spyOn(process, 'cwd').mockReturnValue('/mock');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('cloneRepo', () => {
        it('should pull if repo already exists', async () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            mockExec.mockResolvedValue({ stdout: '', stderr: '' });

            const { cloneRepo } = await import('./git');
            const result = await cloneRepo('https://github.com/test/my-repo');

            expect(result).toBe('/mock/repos/my-repo');
            expect(mockExec).toHaveBeenCalledWith('git pull', { cwd: '/mock/repos/my-repo' });
        });

        it('should clone if repo does not exist', async () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);
            mockExec.mockResolvedValue({ stdout: '', stderr: '' });

            const { cloneRepo } = await import('./git');
            const result = await cloneRepo('https://github.com/test/new-repo');

            expect(result).toBe('/mock/repos/new-repo');
            expect(mockExec).toHaveBeenCalledWith(
                expect.stringContaining('git clone')
            );
        });

        it('should throw error if clone fails', async () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);
            const error = new Error('Clone failed') as Error & { stderr?: string };
            error.stderr = 'Repository not found';
            mockExec.mockRejectedValue(error);

            const { cloneRepo } = await import('./git');

            await expect(cloneRepo('https://github.com/test/bad-repo'))
                .rejects.toThrow('Cloning failed');
        });

        it('should strip .git suffix from repo name', async () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);
            mockExec.mockResolvedValue({ stdout: '', stderr: '' });

            const { cloneRepo } = await import('./git');
            const result = await cloneRepo('https://github.com/test/my-repo.git');

            expect(result).toBe('/mock/repos/my-repo');
        });
    });

    describe('getLatestCommitHash', () => {
        it('should return commit hash from git rev-parse', async () => {
            mockExec.mockResolvedValue({ stdout: 'abc123def456\n', stderr: '' });

            const { getLatestCommitHash } = await import('./git');
            const result = await getLatestCommitHash('/mock/repos/test');

            expect(result).toBe('abc123def456');
            expect(mockExec).toHaveBeenCalledWith('git rev-parse HEAD', { cwd: '/mock/repos/test' });
        });

        it('should return "unknown" if git command fails', async () => {
            mockExec.mockRejectedValue(new Error('Not a git repository'));

            const { getLatestCommitHash } = await import('./git');
            const result = await getLatestCommitHash('/mock/repos/test');

            expect(result).toBe('unknown');
        });
    });
});
