import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import type { Curriculum } from '../types';
import { env } from '$env/dynamic/private';
import { scanDirectory, flattenFileTree, getFileContent } from '../analysis/scanner';
import { getSupportedLanguages } from '../runtime/registry';
import { logGeneration, logError } from '$lib/logging';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY || '');
// Prioritize newer models, fallback to stable
const COMPATIBLE_MODELS = [
  'gemini-3-flash-preview',
  'gemini-2.5-flash-lite-preview',
];

// Helper to keep context within limits (approx)
const MAX_CONTEXT_CHARS = 100000;

async function discoverContext(repoPath: string, repoUrl: string, onProgress?: (msg: string) => void): Promise<string> {
  const fileTree = scanDirectory(repoPath);
  const allFiles = flattenFileTree(fileTree);

  // Initial Context: The file list
  let contextSoFar = `Project File Structure (${allFiles.length} files):\n${allFiles.join('\n')}\n`;
  let loadedFiles = new Set<string>();

  // We allow up to 5 turns of "investigation"
  const MAX_TURNS = 5;

  for (let i = 0; i < MAX_TURNS; i++) {
    const msg = `🔍 Context Discovery Turn ${i + 1}/${MAX_TURNS}`;
    logGeneration('debug', msg, { turn: i + 1, maxTurns: MAX_TURNS });
    if (onProgress) onProgress(msg);

    const prompt = `
        You are an expert software architect analyzing a repository to create a learning curriculum.
        Your goal is to understand the core logic, patterns, and architecture of this project: ${repoUrl}

        CURRENT CONTEXT:
        ${contextSoFar.slice(0, 5000)}... (truncated for brevity in log, full context sent to model)

        FILES ALREADY READ: ${Array.from(loadedFiles).join(', ') || 'None'}

        INSTRUCTIONS:
        Based on the file structure and any content you've seen, which files do you need to read NEXT to understand the project?
        - Prioritize entry points (main.py, index.js, App.svelte), core logic, and types/models.
        - Do NOT request simple configs (tsconfig, .gitignore) unless critical.
        - If you have enough info to generate a comprehensive curriculum, respond with "READY".

        RESPONSE FORMAT:
        Return a JSON object:
        {
            "thoughts": "Why I need these files...",
            "requestFiles": ["path/to/file1", "path/to/file2"],
            "status": "CONTINUE" | "READY"
        }
        `;

    // We send the full context, not the truncated log version
    const fullPrompt = prompt.replace('CURRENT CONTEXT:', `CURRENT CONTEXT:\n${contextSoFar}`);

    try {
      // Re-use fallback logic here to ensure discovery also works with best model
      const text = await generateWithFallback(fullPrompt);
      const plan = JSON.parse(text);

      logGeneration('debug', 'AI thoughts', { thoughts: plan.thoughts });

      if (plan.status === 'READY' || !plan.requestFiles || plan.requestFiles.length === 0) {
        logGeneration('info', 'AI ready to generate');
        if (onProgress) onProgress("✅ AI is ready to generate curriculum.");
        break;
      }

      // Load requested files
      let newContent = '';
      for (const filePath of plan.requestFiles) {
        if (loadedFiles.has(filePath)) continue;

        // Validate path exists in our file list (security check)
        if (!allFiles.includes(filePath)) {
          logGeneration('warn', 'AI requested non-existent file', { filePath });
          continue;
        }

        try {
          const content = getFileContent(repoPath, filePath);
          // Add to context
          const fileSection = `\n--- FILE: ${filePath} ---\n${content}\n`;

          if (contextSoFar.length + fileSection.length > MAX_CONTEXT_CHARS) {
            logGeneration('warn', 'Context limit approaching, stopping file loading');
            break;
          }

          newContent += fileSection;
          loadedFiles.add(filePath);
        } catch (e) {
          console.error(`Failed to read ${filePath}`, e);
        }
      }

      if (plan.requestFiles && plan.requestFiles.length > 0 && newContent.length === 0) {
        logGeneration('warn', 'No valid new files loaded, forcing READY');
        break;
      }

      contextSoFar += newContent;

    } catch (e) {
      console.error('Context discovery error:', e);
      break; // Stop loop on error, try to generate with what we have
    }
  }

  return contextSoFar;
}

// Helper to get a working model
async function generateWithFallback(
  contextPrompt: string,
  onProgress?: (msg: string) => void
): Promise<string> {
  const models = COMPATIBLE_MODELS;

  for (const modelName of models) {
    try {
      if (onProgress) onProgress(`🤖 Generating with ${modelName}...`);
      logGeneration('info', 'Attempting generation', { model: modelName });

      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: 'application/json' }
      });

      const result = await model.generateContent(contextPrompt);
      const text = result.response.text();
      logGeneration('info', 'Generation successful', { model: modelName });
      return text;
    } catch (e: any) {
      const msg = e.message || String(e);
      logGeneration('warn', 'Model failed', { model: modelName, error: msg });
      if (onProgress) onProgress(`⚠️ ${modelName} failed, trying older model...`);

      // If it's the last model, throw the error
      if (modelName === models[models.length - 1]) throw e;
    }
  }
  throw new Error("All models failed");
}

export async function generateCurriculum(repoPath: string, repoUrl: string, onProgress?: (msg: string) => void): Promise<Curriculum> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  // 1. Intelligent Context Gathering
  let codeContext = '';
  try {
    if (onProgress) onProgress("🚀 Starting Repository Analysis...");
    codeContext = await discoverContext(repoPath, repoUrl, onProgress);
  } catch (e) {
    console.error("Discovery failed, falling back to basic context", e);
    // Fallback: Just read README if discovery crashes
    try {
      codeContext = `README.md:\n${fs.readFileSync(path.join(repoPath, 'README.md'), 'utf-8')}`;
    } catch (_) { }
  }

  const supportedLangs = getSupportedLanguages().join(', ');

  const prompt = `
    You are an expert technical educator. I have a git repository at ${repoUrl}.
    
    CONTEXT GATHERED:
    ${codeContext}

    Create a high-quality learning curriculum for a programmer who wants to understand this project.
    
    STRUCTURE:
    {
      "projectName": "Name of the project",
      "description": "Short description",
      "patterns": ["pattern 1", "pattern 2"],
      "lessons": [
        {
          "id": "1",
          "title": "Lesson title",
          "description": "Lesson description",
          "highlights": ["highlight 1"],
          "codeFragments": [
            {
              "filePath": "src/path/to/file",
              "code": "code snippet",
              "explanation": "why this is important",
              "language": "javascript/headers/python"
            }
          ],
          "furtherReading": [],
          "codingExercises": [
            {
              "title": "Exercise title",
              "description": "Task to solve",
              "language": "python" | "javascript",
              "boilerplate": "def solve():\n    pass",
              "solution": "def solve():\n    return True",
              "validationScript": "assert solve() == True"
            }
          ],
          "quizzes": []
        }
      ]
    }

    --- CRITICAL INSTRUCTIONS ---
    1. SUPPORTED LANGUAGES: [${supportedLangs}].
    2. STRICT RULE: NEVER generate an exercise in a language NOT in the list above.
    3. FALLBACK: If the repo is in Rust/Go, ask the user to implement the algorithm/logic using Python (preferred) or JavaScript.
    4. EXERCISES: Must be executable in browser (Python via Pyodide, or JS).
    5. C/C++ SUPPORT:
       - AI can generate C/C++ exercises if relevant.
       - "validationScript" MUST be a complete \`int main()\` function that calls the user's function.
       - The validation main() MUST return 0 for success and 1 for failure.
       - Do NOT use Python assertions for C exercises.
       - CRITICAL: validationScript is APPENDED to user code.
         - Do NOT redefine the user's function implementation.
         - Use forward declarations (e.g., \`void user_func(int);\`) if needed.
         - Include ALL necessary headers (e.g., \`#include <stdio.h>\`).
         - Ensure the boilerplate code is valid C (e.g., if function returns int, return 0).
         - REQUIRED: If a test fails, \`printf("❌ Test Failed: Input %d, Expected %d, Got %d\\n", ...)\` BEFORE returning 1.
    6. PYTHON/JS SUPPORT:
       - For Python: Use \`print(f"❌ Test Failed: ...")\` before \`assert\`.
       - For JS: Use \`console.log("❌ Test Failed: ...")\` before throwing error.
    7. PATTERNS: Focus on architectural decisions found in the code.
    8. Focus on learning value, examples should be concise and self contained, but pack as much useful knowledge as possible.
    9. All questions should be specific to the project, not generic.
    10. FURTHER READING: REQUIRED. providing no "furtherReading" is UNACCEPTABLE.
       - Provide 1-2 external URLs for the concepts taught (e.g., React docs, Wikipedia for algorithms, Python docs).
       - If exact docs aren't found, link to high-quality tutorials or conceptual guides.
    `;

  try {
    const msg = `📝 Generating curriculum... (Prompt length: ${prompt.length})`;
    logGeneration('info', 'Starting curriculum generation', { repoUrl, promptLength: prompt.length });
    if (onProgress) onProgress(msg);

    // Use the fallback mechanism
    const responseText = await generateWithFallback(prompt, onProgress);

    let curriculum = JSON.parse(responseText);
    // Handle case where AI returns an array
    if (Array.isArray(curriculum)) {
      curriculum = curriculum[0];
    }

    curriculum.repoUrl = repoUrl;
    return curriculum;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logError('GENERATION', `Curriculum generation failed for ${repoUrl}`, error instanceof Error ? error : undefined);
    console.error('Error generating curriculum:', error);
    throw new Error('Failed to generate curriculum via AI');
  }
}
