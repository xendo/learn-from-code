import { json } from '@sveltejs/kit';
import { listCachedProjects } from '$lib/curriculum/cache';

export const GET = async () => {
    try {
        const projects = listCachedProjects();
        return json({ projects });
    } catch (e: any) {
        console.error('Recent API Error:', e);
        return json({ error: 'Failed to fetch recent projects' }, { status: 500 });
    }
};
