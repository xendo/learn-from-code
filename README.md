# Learn from Code

> **Turn any GitHub repository into an interactive coding course.**

**Learn from Code** is an intelligent educational tool that bridges the gap between passive reading and active coding. By leveraging large language models, it analyzes GitHub repositories and generates a structured curriculum complete with deep dives, patterns, and **interactive, native-language coding exercises**.

## Key Features

### Deep Repository Analysis
Just paste a URL, and the system scans the codebase to extract:
- **Core Architectural Patterns**: Understand *why* the code was written that way.
- **Critical Code Fragments**: See highlighted snippets explained in context.
- **Key Concepts**: From "Self-Attention" in Transformers to "Store State" in Svelte.

### Interactive Native Execution
Don't just read code—write it.
- **Python**: Full in-browser Python execution powered by **Pyodide** (WebAssembly). Supports standard library and **NumPy**.
- **JavaScript**: Secure sandboxed execution for JS/TS projects.

### Intelligent AI Tutor
Stuck on a problem? The system doesn't just verify your answer—it acts as a tutor.
- **Smart Feedback**: If you make a mistake, the AI analyzes your specific error and code through a feedback loop.
- **Helpful Hints**: Instead of giving the answer, it provides contextual hints to guide you to the solution.

## Getting Started

### Prerequisites
- Bun (v1.0+)
- A Gemini API Key (Get one from [Google AI Studio](https://aistudio.google.com/))

### Installation
1. **Clone the repository**
   ```bash
   git clone https://github.com/xendo/learn-from-code.git
   cd learn-from-code
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Configure Environment**
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

4. **Start the Development Server**
   ```bash
   bun run dev
   ```

5. **Open your browser** to `http://localhost:5173`

## License
MIT © 2026 xendo

## Developing with SvelteKit

This project is built with SvelteKit.
Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

### Creating a project

```sh
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

### Developing

Once you've created a project and installed dependencies with `bun install`, start a development server:

```sh
bun run dev
```

### Building

To create a production version of your app:

```sh
bun run build
```

You can preview the production build with `bun run preview`.
