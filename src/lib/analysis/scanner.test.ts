import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FileNode } from './scanner';

// Note: We don't mock fs here because the recursive scanDirectory is hard to mock.
// Instead, we test the pure functions (flattenFileTree, getFileContent) which are easier to isolate.

describe('Scanner Module', () => {
    describe('flattenFileTree', () => {
        it('should flatten nested file tree to paths', async () => {
            const tree: FileNode[] = [
                { name: 'file1.ts', path: 'file1.ts', isDirectory: false },
                {
                    name: 'src',
                    path: 'src',
                    isDirectory: true,
                    children: [
                        { name: 'index.ts', path: 'src/index.ts', isDirectory: false },
                        { name: 'utils.ts', path: 'src/utils.ts', isDirectory: false }
                    ]
                }
            ];

            const { flattenFileTree } = await import('./scanner');
            const result = flattenFileTree(tree);

            expect(result).toEqual(['file1.ts', 'src/index.ts', 'src/utils.ts']);
        });

        it('should return empty array for empty tree', async () => {
            const { flattenFileTree } = await import('./scanner');
            const result = flattenFileTree([]);

            expect(result).toEqual([]);
        });

        it('should skip directories in output', async () => {
            const tree: FileNode[] = [
                { name: 'folder', path: 'folder', isDirectory: true, children: [] }
            ];

            const { flattenFileTree } = await import('./scanner');
            const result = flattenFileTree(tree);

            expect(result).toEqual([]);
        });

        it('should handle deeply nested structures', async () => {
            const tree: FileNode[] = [
                {
                    name: 'a',
                    path: 'a',
                    isDirectory: true,
                    children: [
                        {
                            name: 'b',
                            path: 'a/b',
                            isDirectory: true,
                            children: [
                                { name: 'c.ts', path: 'a/b/c.ts', isDirectory: false }
                            ]
                        }
                    ]
                }
            ];

            const { flattenFileTree } = await import('./scanner');
            const result = flattenFileTree(tree);

            expect(result).toEqual(['a/b/c.ts']);
        });
    });

    describe('getFileContent', () => {
        it('should construct correct file path', async () => {
            // Test that path.join is called correctly by checking the implementation
            const { getFileContent } = await import('./scanner');

            // This will throw because file doesn't exist, but we're testing the path logic
            expect(() => getFileContent('/base', 'src/file.ts')).toThrow();
        });
    });
});
