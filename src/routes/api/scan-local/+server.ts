import { json } from '@sveltejs/kit';
import { scanDirectory } from '$lib/analysis/scanner';
import path from 'path';

export const GET = async () => {
    const rootDir = process.cwd();
    const fileTree = scanDirectory(rootDir);
    return json({ fileTree });
};
