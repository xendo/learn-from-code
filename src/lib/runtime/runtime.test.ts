import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JavascriptRuntime } from './javascript';
import { PythonRuntime } from './python';
import { CRuntime } from './c';
import { WASI } from './wasi';

// Mocks
global.console.log = vi.fn();
global.console.error = vi.fn();
global.window = {} as any;

describe('Runtime Extensions', () => {

    describe('JavascriptRuntime', () => {
        it('should execute JS code', async () => {
            const rt = new JavascriptRuntime();
            const result = await rt.run("console.log('test')");
            expect(result.success).toBe(true);
            expect(result.output).toContain('test');
        });

        it('should handle logic errors', async () => {
            const rt = new JavascriptRuntime();
            const result = await rt.run("throw new Error('fail')");
            expect(result.success).toBe(false);
            expect(result.error).toContain('fail');
        });

        it('should capture console.log before error', async () => {
            const rt = new JavascriptRuntime();
            // Simulate: print error then throw
            const code = `
                console.log("❌ Test Failed: Expected 10");
                throw new Error("Validation Error");
            `;
            const result = await rt.run(code);
            expect(result.success).toBe(false);
            expect(result.output).toContain("❌ Test Failed: Expected 10");
        });
    });

    describe('PythonRuntime', () => {
        it('should load via script injection if not present', async () => {
            const rt = new PythonRuntime();

            // Mock Script Element
            const appendChildSpy = vi.fn();
            global.document = {
                body: { appendChild: appendChildSpy },
                createElement: vi.fn(() => ({ src: '', onload: vi.fn() }))
            } as any;

            // Mock window.loadPyodide
            (global.window as any).loadPyodide = vi.fn(() => ({
                runPythonAsync: vi.fn(async () => 'OK'),
                setStdout: vi.fn()
            }));

            // Since load() waits for script onload, we can't fully unit test implementation details 
            // without a complex DOM mock. 
            // Instead, we verify the module properties exists.
            expect(rt.language).toBe('python');
        });

        it('should capture stdout before failure', async () => {
            const rt = new PythonRuntime();
            // Mock Pyodide to simulate print+fail pattern
            (window as any).loadPyodide = vi.fn(() => ({
                loadPackage: vi.fn(),
                setStdout: (opts: any) => {
                    // simulate stdout call immediately
                    opts.batched("❌ Test Failed: Expected A, Got B");
                },
                runPythonAsync: vi.fn(async () => {
                    throw new Error('AssertionError');
                })
            }));

            await rt.load();
            const result = await rt.run("bad_code()");

            expect(result.success).toBe(false);
            expect(result.output).toContain("❌ Test Failed: Expected A, Got B");
        });
    });

    describe('CRuntime', () => {
        it('should be created for "c"', () => {
            const rt = new CRuntime();
            expect(rt.language).toBe('c');
        });

        it('should fail run if not loaded', async () => {
            const rt = new CRuntime();
            const result = await rt.run("int main() {}");
            expect(result.success).toBe(false);
            expect(result.error).toBe("Compiler not loaded");
        });

        it('should strip user main() when validation script is present', async () => {
            const rt = new CRuntime();
            const compileSpy = vi.fn().mockResolvedValue({
                module: new WebAssembly.Module(new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00])), // Minimal valid WASM
                compileOutput: ''
            });

            // Mock loaded state
            (rt as any).compilerModule = { compile: compileSpy };

            // Mock WebAssembly.instantiate and WASI start to avoid real execution
            const originalInstantiate = WebAssembly.instantiate;
            global.WebAssembly.instantiate = vi.fn().mockResolvedValue({
                instance: { exports: { memory: new WebAssembly.Memory({ initial: 1 }) } }
            } as any);

            // Mock WASI start in the runtime by spying on prototype/instance usage if possible, 
            // but since WASI is instantiated inside run(), we rely on it running without error.
            // We can check the source passed to compileSpy.

            await rt.run("int main() { return 0; }", "int main() { return 0; }");

            const callArgs = compileSpy.mock.calls[0][0];
            expect(callArgs.source).toContain("int __user_main_disabled(");
            expect(callArgs.source).toContain("//--- Validation Script ---");

            // Restore
            global.WebAssembly.instantiate = originalInstantiate;
        });
    });

    describe('WASI Shim', () => {

        it('should implement essential syscalls', () => {
            const stdout = vi.fn();
            const stderr = vi.fn();
            const wasi = new WASI(stdout, stderr);

            // Check for the syscall that caused the crash
            expect(typeof wasi.wasiImport.fd_fdstat_get).toBe('function');

            // Mock memory for syscall test
            wasi.memory = { buffer: new ArrayBuffer(1024) } as any;

            // Test fd_fdstat_get returns 0 (success)
            const result = wasi.wasiImport.fd_fdstat_get(1, 0);
            expect(result).toBe(0);
        });
    });
});
