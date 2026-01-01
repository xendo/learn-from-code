export class WASI {
    args: string[] = [];
    env: Record<string, string> = {};
    exports: any = null;
    memory: WebAssembly.Memory | null = null;
    wasiImport: Record<string, any>;

    stdout: (str: string) => void;
    stderr: (str: string) => void;
    exitCode: number | null = null; // Capture exit code

    constructor(stdout: (str: string) => void, stderr: (str: string) => void) {
        this.stdout = stdout;
        this.stderr = stderr;

        this.wasiImport = {
            fd_write: (fd: number, iovs_ptr: number, iovs_len: number, nwritten_ptr: number) => {
                const view = new DataView(this.memory!.buffer);
                let written = 0;
                for (let i = 0; i < iovs_len; i++) {
                    const ptr = view.getUint32(iovs_ptr + i * 8, true);
                    const len = view.getUint32(iovs_ptr + i * 8 + 4, true);
                    const chunk = new Uint8Array(this.memory!.buffer, ptr, len);
                    const text = new TextDecoder().decode(chunk);

                    if (fd === 1) this.stdout(text);
                    else if (fd === 2) this.stderr(text);

                    written += len;
                }
                view.setUint32(nwritten_ptr, written, true);
                return 0; // ES_SUCCESS
            },
            fd_close: () => 0,
            fd_seek: () => 70, // ENOSYS
            fd_read: () => 0,
            fd_fdstat_get: (fd: number, bufPtr: number) => {
                const view = new DataView(this.memory!.buffer);
                view.setUint8(bufPtr, fd); // fs_filetype
                view.setUint16(bufPtr + 2, 0, true); // fs_flags
                view.setBigUint64(bufPtr + 8, 0n, true); // fs_rights_base
                view.setBigUint64(bufPtr + 16, 0n, true); // fs_rights_inheriting
                return 0;
            },
            fd_prestat_get: (fd: number, bufPtr: number) => 8, // EBADF (Bad file descriptor) - signals end of preopened files
            fd_prestat_dir_name: () => 0,
            proc_exit: (code: number) => {
                this.exitCode = code;
                throw new Error(`WASI Exit: ${code}`);
            },
            environ_sizes_get: (environCount: number, environBufSize: number) => {
                const view = new DataView(this.memory!.buffer);
                view.setUint32(environCount, 0, true);
                view.setUint32(environBufSize, 0, true);
                return 0;
            },
            environ_get: () => 0,
            clock_time_get: () => 0,
            args_sizes_get: (argc: number, argv_buf_size: number) => {
                const view = new DataView(this.memory!.buffer);
                view.setUint32(argc, 0, true);
                view.setUint32(argv_buf_size, 0, true);
                return 0;
            },
            args_get: () => 0,
            // Add other stubs as needed by crt1.o
        };
    }

    start(instance: WebAssembly.Instance) {
        this.exports = instance.exports;
        this.memory = this.exports.memory;
        if (this.exports._start) {
            try {
                this.exports._start();
            } catch (e: any) {
                if (!e.message.startsWith('WASI Exit')) {
                    throw e;
                }
            }
        }
    }
}
