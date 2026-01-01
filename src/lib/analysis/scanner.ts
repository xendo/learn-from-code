import fs from 'fs';
import path from 'path';

export type FileNode = {
    name: string;
    path: string;
    isDirectory: boolean;
    children?: FileNode[];
};

export function scanDirectory(dir: string, baseDir: string = dir): FileNode[] {
    const result: FileNode[] = [];
    const files = fs.readdirSync(dir);

    for (const file of files) {
        if (file === '.git' || file === 'node_modules' || file === '.svelte-kit') continue;

        const fullPath = path.join(dir, file);
        const relativePath = path.relative(baseDir, fullPath);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
            result.push({
                name: file,
                path: relativePath,
                isDirectory: true,
                children: scanDirectory(fullPath, baseDir)
            });
        } else {
            result.push({
                name: file,
                path: relativePath,
                isDirectory: false
            });
        }
    }

    return result;
}

export function getFileContent(baseDir: string, relativePath: string): string {
    const fullPath = path.join(baseDir, relativePath);
    return fs.readFileSync(fullPath, 'utf-8');
}
