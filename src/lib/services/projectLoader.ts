import type { Curriculum } from '$lib/types';

export interface LoadProjectCallbacks {
    onStatus: (msg: string) => void;
    onCurriculum: (curriculum: Curriculum, fileTree: any[]) => void;
    onError: (error: string, code?: number) => void;
}

/**
 * Loads a project by calling the generate API and parsing the streaming response.
 * Extracts the stream parsing logic from the main page for reusability.
 */
export async function loadProject(
    repoUrl: string,
    callbacks: LoadProjectCallbacks
): Promise<void> {
    const { onStatus, onCurriculum, onError } = callbacks;

    const resp = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl }),
    });

    if (!resp.body) {
        throw new Error('No response body');
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Keep the last part if incomplete
        buffer = lines.pop() || '';

        for (const line of lines) {
            if (!line.trim()) continue;

            try {
                const data = JSON.parse(line);

                if (data.status) {
                    onStatus(data.status);
                } else if (data.error) {
                    onError(data.error, data.code);
                    return; // Stop processing on error
                } else if (data.curriculum) {
                    onCurriculum(data.curriculum, data.fileTree || []);
                }
            } catch (err) {
                console.warn('Stream parse error', err, line);
            }
        }
    }

    // Process any remaining buffer content
    if (buffer.trim()) {
        try {
            const data = JSON.parse(buffer);
            if (data.curriculum) {
                onCurriculum(data.curriculum, data.fileTree || []);
            }
        } catch (e) {
            console.warn('Final buffer parse error', e);
        }
    }
}
