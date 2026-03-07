import { json, type RequestHandler } from '@sveltejs/kit';
import { cloneRepo, getLatestCommitHash } from '$lib/analysis/git';
import { scanDirectory } from '$lib/analysis/scanner';
import { generateCurriculum } from '$lib/curriculum/generator';
import { getCachedCurriculum, setCachedCurriculum } from '$lib/curriculum/cache';
import { env } from '$env/dynamic/private';
import { logApi, logError } from '$lib/logging';
import { lockManager } from '$lib/services/lockManager';
import { rateLimiter } from '$lib/services/rateLimiter';

export const POST: RequestHandler = async ({ request, locals }) => {
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

            const locked = !(await lockManager.tryAcquire(repoUrl));
            if (locked) {
                logApi('info', 'Project scan already in progress, subscribing to stream', { repoUrl });
                let unsubscribe: (() => void) | undefined;

                const callback = (data: any) => {
                    send(data);
                    // Close stream if we got a terminal event
                    if (data.curriculum || data.error) {
                        if (unsubscribe) unsubscribe();
                        try { controller.close(); } catch (e) { }
                    }
                };

                unsubscribe = await lockManager.subscribe(repoUrl, callback);
                return;
            }

            const publishAndSend = (data: any) => {
                lockManager.publish(repoUrl, data).catch(e => console.error('Publish error', e));
                send(data);
            };

            // Keep-alive to prevent timeout
            const keepAlive = setInterval(() => {
                if (!isStreamClosed) {
                    send({ ping: true });
                } else {
                    clearInterval(keepAlive);
                }
            }, 5000);

            try {
                // 1. Clone/Update repo
                publishAndSend({ status: '🔄 Cloning/Updating repository...' });
                const repoPath = await cloneRepo(repoUrl);
                const commitHash = await getLatestCommitHash(repoPath);
                logApi('info', 'Repository cloned', { repoUrl, commitHash });

                // 2. Check Cache
                const cached = getCachedCurriculum(repoUrl, commitHash);
                if (cached) {
                    logApi('info', 'Serving from cache', { repoUrl });
                    publishAndSend({ status: '⚡ Found cached curriculum!' });
                    const fileTree = scanDirectory(repoPath);
                    if (!cached.repoUrl) cached.repoUrl = repoUrl;

                    publishAndSend({ curriculum: cached, fileTree, fromCache: true });

                    // Allow the stream client to receive the final message before we brutally close the controller
                    await new Promise(r => setTimeout(r, 500));
                    try { controller.close(); } catch (e) { }
                    return;
                }

                // 3. Auth Check
                if (!session && env.DISABLE_AUTH !== 'true') {
                    logApi('warn', 'Unauthorized generation attempt', { repoUrl });
                    publishAndSend({ error: 'You must be signed in to generate new curriculums.', code: 401 });
                    try { controller.close(); } catch (e) { }
                    return;
                }
                // 4. Rate Limit Check (Global: 10 scans per hour)
                const ONE_HOUR = 60 * 60 * 1000;
                if (!rateLimiter.checkLimit('scans', 10, ONE_HOUR)) {
                    logApi('warn', 'Rate limit reached for scans', { repoUrl });
                    publishAndSend({
                        error: 'Global rate limit reached (10 scans/hour). Please try again in a bit or explore a cached project!',
                        code: 429
                    });
                    try { controller.close(); } catch (e) { }
                    return;
                }

                // 5. Analysis & Generation
                logApi('info', 'Starting generation', { repoUrl, user: session?.user?.name });
                publishAndSend({ status: '📂 Scanning file structure...' });
                const fileTree = scanDirectory(repoPath);

                const curriculum = await generateCurriculum(repoPath, repoUrl, (msg) => {
                    publishAndSend({ status: msg });
                });

                // 5. Save Cache
                setCachedCurriculum(repoUrl, curriculum, commitHash);
                logApi('info', 'Generation complete', { repoUrl, projectName: curriculum.projectName });

                publishAndSend({ curriculum, fileTree, fromCache: false });

            } catch (e: any) {
                logError('API', `Generation failed for ${repoUrl}`, e, { repoUrl });
                let errorMsg = e.message || 'An error occurred during generation';
                let statusCode = 500;

                if (e.status === 429 || e.message?.includes('429') || e.message?.includes('quota')) {
                    errorMsg = 'Daily API limit reached. Please try one of the "Recent Explorations" or come back tomorrow!';
                    statusCode = 429;
                }

                publishAndSend({ error: errorMsg, code: statusCode });
            } finally {
                clearInterval(keepAlive);
                await lockManager.release(repoUrl);
                try { controller.close(); } catch (e) { }
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
