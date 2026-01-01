import { json } from '@sveltejs/kit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '$env/dynamic/private';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY || '');

export async function POST({ request }) {
    const { exerciseTitle, exerciseDescription, userCode, errorOutput, language } = await request.json();

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
        return json({ feedback });
    } catch (error) {
        console.error('Error generating feedback:', error);
        return json({ feedback: 'Unable to generate simplified feedback at this time. Please check the raw error above.' });
    }
}
