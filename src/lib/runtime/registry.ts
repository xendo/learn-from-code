import type { CodeRunner } from './types';
import { JavascriptRuntime } from './javascript';
import { PythonRuntime } from './python';
import { CRuntime } from './c';

const runtimes: Record<string, CodeRunner> = {
    'javascript': new JavascriptRuntime(),
    'python': new PythonRuntime(),
    'c': new CRuntime(),
    'cpp': new CRuntime(), // C++ shares the same clang runtime
    // 'go': new GoRuntime() // Future: Add Go WASM runtime
};

export function getRuntime(language: string): CodeRunner | null {
    return runtimes[language.toLowerCase()] || null;
}

export function isLanguageSupported(language: string): boolean {
    return !!runtimes[language.toLowerCase()];
}

export function getSupportedLanguages(): string[] {
    return Object.keys(runtimes);
}
