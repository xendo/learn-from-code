import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import type { Curriculum } from '../types';
import { env } from '$env/dynamic/private';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY || '');

export async function generateCurriculum(repoPath: string, repoUrl: string): Promise<Curriculum> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in your environment or .env file.');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

  // 1. Gather context from the repo
  const contextFiles = ['README.md', 'package.json', 'src/main.ts', 'src/index.ts', 'src/App.svelte', 'src/routes/+page.svelte'];
  let codeContext = '';

  for (const relPath of contextFiles) {
    const fullPath = path.join(repoPath, relPath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      codeContext += `\n--- file: ${relPath} ---\n${content.slice(0, 2000)}\n`;
    }
  }

  const prompt = `
    You are an expert technical educator. I have a git repository at ${repoUrl}.
    Here is some context from the most important files:
    ${codeContext}

    Create a high-quality learning curriculum for a programmer who wants to understand this project.
    Return the result ONLY as a JSON object matching this structure:
    {
      "projectName": "Name of the project",
      "description": "Short description of what it does",
      "patterns": ["pattern 1", "pattern 2"],
      "lessons": [
        {
          "id": "1",
          "title": "Lesson title",
          "description": "Lesson description",
          "highlights": ["highlight 1", "highlight 2"],
          "codeFragments": [
            {
              "filePath": "src/path/to/file",
              "code": "code snippet",
              "explanation": "why this is important",
              "language": "javascript/typescript/etc"
            }
          ],
          "furtherReading": [
            { "title": "Resource title", "url": "https://..." }
          ],
          "codingExercises": [
            {
              "title": "Exercise title",
              "description": "Task to solve",
              "language": "python",
              "boilerplate": "def solve():\n    pass",
              "solution": "def solve():\n    return True",
              "validationScript": "assert solve() == True"
            }
          ],
          "quizzes": [
            {
              "question": "Question text?",
              "options": ["A", "B", "C"],
              "correctAnswer": "A",
              "explanation": "Why"
            }
          ]
        }
      ]
    }

    --- CRITICAL INSTRUCTIONS FOR CODING EXERCISES ---
    1. If the repository is Python, prioritize "language": "python".
    2. ENVIRONMENT: Python code runs in the browser via Pyodide. 
    3. RESTRICTION: Pyodide CANNOT run torch, tensorflow, cuda or heavy native libs.
    4. BEST PRACTICE: Use vanilla Python or NumPy for exercises. 
    5. If teaching a Torch concept (like Softmax), ask the student to implement it using NumPy or pure Python math.
    6. For JS/TS projects, use "language": "javascript".
    7. Validation scripts MUST be in the same language as the boilerplate.
    Be concise but thorough. Focus on the core coding patterns and architectural decisions.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Clean up potential markdown formatting in the response
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr) as Curriculum;
  } catch (error) {
    console.error('Error generating curriculum:', error);
    throw new Error('Failed to generate curriculum via AI');
  }
}
