import { json } from '@sveltejs/kit';
import { cloneRepo, getLatestCommitHash } from '$lib/analysis/git';
import { scanDirectory } from '$lib/analysis/scanner';
import { generateCurriculum } from '$lib/curriculum/generator';
import { getCachedCurriculum, setCachedCurriculum } from '$lib/curriculum/cache';
import { env } from '$env/dynamic/private';
import { logApi, logError } from '$lib/logging';

export const POST = async ({ request, locals }) => {
    const { repoUrl } = await request.json();
    logApi('info', 'Generation request received', { repoUrl });

    if (!repoUrl) {
        logApi('warn', 'Missing repoUrl in request');
        return json({ error: 'Repo URL is required' }, { status: 400 });
    }

    // IMPORTANT: Auth check must happen BEFORE streaming starts
    const session = await locals.auth();

    let isStreamClosed = false;

    // Create a streaming response
    const stream = new ReadableStream({
        cancel() {
            isStreamClosed = true;
        },
        async start(controller) {
            const encoder = new TextEncoder();
            const send = (data: any) => {
                if (isStreamClosed) return;
                try {
                    controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'));
                } catch (e) {
                    // Controller likely closed by client disconnect
                    isStreamClosed = true;
                    console.warn('Analysis stream failure (client likely disconnected):', e);
                }
            };

            try {
                // 1. Clone/Update repo
                send({ status: '🔄 Cloning/Updating repository...' });
                const repoPath = await cloneRepo(repoUrl);
                const commitHash = await getLatestCommitHash(repoPath);
                logApi('info', 'Repository cloned', { repoUrl, commitHash });

                // 2. Check Cache
                const cached = getCachedCurriculum(repoUrl, commitHash);
                if (cached) {
                    logApi('info', 'Serving from cache', { repoUrl });
                    send({ status: '⚡ Found cached curriculum!' });
                    const fileTree = scanDirectory(repoPath);
                    if (!cached.repoUrl) cached.repoUrl = repoUrl;

                    send({ curriculum: cached, fileTree, fromCache: true });
                    await new Promise(r => setTimeout(r, 100));
                    controller.close();
                    return;
                }

                // 3. Auth Check
                if (!session && env.DISABLE_AUTH !== 'true') {
                    logApi('warn', 'Unauthorized generation attempt', { repoUrl });
                    send({ error: 'You must be signed in to generate new curriculums.', code: 401 });
                    controller.close();
                    return;
                }

                // 4. Analysis & Generation
                logApi('info', 'Starting generation', { repoUrl, user: session?.user?.name });
                send({ status: '📂 Scanning file structure...' });
                const fileTree = scanDirectory(repoPath);

                const curriculum = await generateCurriculum(repoPath, repoUrl, (msg) => {
                    send({ status: msg });
                });

                // 5. Save Cache
                setCachedCurriculum(repoUrl, curriculum, commitHash);
                logApi('info', 'Generation complete', { repoUrl, projectName: curriculum.projectName });

                send({ curriculum, fileTree, fromCache: false });

            } catch (e: any) {
                logError('API', `Generation failed for ${repoUrl}`, e);
                let errorMsg = e.message || 'An error occurred during generation';
                let statusCode = 500;

                if (e.status === 429 || e.message?.includes('429') || e.message?.includes('quota')) {
                    errorMsg = 'Daily API limit reached. Please try one of the "Recent Explorations" or come back tomorrow!';
                    statusCode = 429;
                }

                send({ error: errorMsg, code: statusCode });
            } finally {
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Content-Type-Options': 'nosniff'
        }
    });
};
