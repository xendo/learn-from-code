import { json } from '@sveltejs/kit';
import { cloneRepo, getLatestCommitHash } from '$lib/analysis/git';
import { scanDirectory } from '$lib/analysis/scanner';
import { generateCurriculum } from '$lib/curriculum/generator';
import { getCachedCurriculum, setCachedCurriculum } from '$lib/curriculum/cache';

export const POST = async ({ request }) => {
    const { repoUrl } = await request.json();

    if (!repoUrl) {
        return json({ error: 'Repo URL is required' }, { status: 400 });
    }

    try {
        // Clone/Update repo first to get the latest commit hash
        const repoPath = cloneRepo(repoUrl);
        const commitHash = getLatestCommitHash(repoPath);

        // Check Cache with commit hash
        const cached = getCachedCurriculum(repoUrl, commitHash);
        if (cached) {
            console.log('Serving from cache:', repoUrl, commitHash);
            const fileTree = scanDirectory(repoPath);
            return json({ curriculum: cached, fileTree, fromCache: true });
        }

        const fileTree = scanDirectory(repoPath);

        const curriculum = await generateCurriculum(repoPath, repoUrl);

        // Save to Cache with commit hash
        setCachedCurriculum(repoUrl, curriculum, commitHash);

        return json({ curriculum, fileTree, fromCache: false });
    } catch (e: any) {
        console.error('API Error:', e);

        // Check for rate limit error (Gemini often uses 429)
        if (e.status === 429 || e.message?.includes('429') || e.message?.includes('quota')) {
            return json({ error: 'Daily API limit reached. Please try one of the "Recent Explorations" or come back tomorrow!' }, { status: 429 });
        }

        return json({ error: e.message || 'An error occurred during generation' }, { status: 500 });
    }
};
