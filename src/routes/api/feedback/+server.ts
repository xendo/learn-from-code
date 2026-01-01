import { json } from '@sveltejs/kit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '$env/dynamic/private';
import { logApi, logError } from '$lib/logging';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY || '');

export async function POST({ request, locals }) {
    const session = await locals.auth();
    if (!session) {
        logApi('warn', 'Unauthorized feedback request');
        return json({ feedback: 'Please sign in to get AI Tutor feedback.' }, { status: 401 });
    }

    const { exerciseTitle, exerciseDescription, userCode, errorOutput, language } = await request.json();
    logApi('info', 'Feedback requested', { exerciseTitle, language, user: session?.user?.name });

    if (!env.GEMINI_API_KEY) {
        return json({ feedback: 'API Key not configured. Using fallback feedback: Check your syntax and logic.' }, { status: 200 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    const prompt = `
    You are a helpful coding tutor. A student is trying to solve a coding exercise but is getting an error.
    
    Exercise: ${exerciseTitle}
    Goal: ${exerciseDescription}
    Language: ${language}
    
    Student's Code:
    \`\`\`${language}
    ${userCode}
    \`\`\`
    
    Error/Output:
    ${errorOutput}
    
    Provide a concise hint or feedback to help them fix the error. 
    DO NOT provide the full solution. 
    DO NOT write code blocks unless it's a tiny snippet to explain syntax.
    Focus on guiding them to the root cause.
    Keep it under 3 sentences.
  `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const feedback = response.text();
        logApi('info', 'Feedback generated', { exerciseTitle });
        return json({ feedback });
    } catch (error) {
        logError('FEEDBACK', 'Error generating feedback', error instanceof Error ? error : undefined);
        return json({ feedback: 'Unable to generate simplified feedback at this time. Please check the raw error above.' });
    }
}
