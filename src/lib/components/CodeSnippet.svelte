<script lang="ts">
    import type { CodeSnippet } from "$lib/types";
    let { snippet }: { snippet: CodeSnippet } = $props();
</script>

<div class="code-fragment">
    <div class="fragment-header">
        <span class="file-path">{snippet.filePath}</span>
        <span class="lang-tag">{snippet.language}</span>
    </div>
    <pre><code>{snippet.code}</code></pre>
    <p class="explanation">{snippet.explanation}</p>
</div>

<style>
    .code-fragment {
        background: #0f172a;
        border-radius: 8px;
        margin: 1rem 0;
        overflow: hidden;
        color: #e2e8f0;
    }

    .fragment-header {
        background: #1e293b;
        padding: 0.5rem 1rem;
        display: flex;
        justify-content: space-between;
        font-size: 0.75rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    pre {
        padding: 1rem;
        margin: 0;
        overflow-x: auto;
        font-family: "JetBrains Mono", "Fira Code", monospace;
        font-size: 0.875rem;
    }

    .explanation {
        padding: 1rem;
        background: rgba(255, 255, 255, 0.05);
        margin: 0;
        font-size: 0.875rem;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        color: #94a3b8;
    }

    .lang-tag {
        text-transform: uppercase;
        opacity: 0.6;
    }
</style>
