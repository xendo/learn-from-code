<script lang="ts">
    import type { Curriculum } from "$lib/types";
    import LessonView from "./LessonView.svelte";

    interface Props {
        curriculum: Curriculum;
        fileTree: any[];
    }

    let { curriculum, fileTree }: Props = $props();
</script>

<main class="curriculum-view">
    <section class="card overview">
        <h2>{curriculum.projectName}</h2>
        <p>{curriculum.description}</p>
        <div class="patterns">
            <h3>Core Coding Patterns</h3>
            <div class="tag-cloud">
                {#each curriculum.patterns as pattern}
                    <span class="tag">{pattern}</span>
                {/each}
            </div>
        </div>
    </section>

    <section class="lessons">
        {#each curriculum.lessons as lesson}
            <LessonView {lesson} />
        {/each}
    </section>
</main>

{#if fileTree.length > 0}
    <section class="card results">
        <h2>Project Taxonomy</h2>
        <div class="tree-preview">
            <ul>
                {#each fileTree as node}
                    <li>
                        <span class="icon"
                            >{node.isDirectory ? "📁" : "📄"}</span
                        >
                        {node.name}
                    </li>
                {/each}
            </ul>
        </div>
    </section>
{/if}

<style>
    .curriculum-view {
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }

    .overview h2 {
        margin-top: 0;
    }

    .patterns {
        margin-top: 1.5rem;
        padding-top: 1rem;
        border-top: 1px solid var(--border-color);
    }

    .tag-cloud {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 0.75rem;
    }

    .tag {
        background: #eff6ff;
        color: var(--primary);
        padding: 0.25rem 0.75rem;
        border-radius: 999px;
        font-size: 0.875rem;
        font-weight: 500;
    }

    .lessons {
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }

    .tree-preview {
        max-height: 300px;
        overflow-y: auto;
        font-family: "JetBrains Mono", "Fira Code", monospace;
        font-size: 0.875rem;
        padding: 0.5rem;
    }

    ul {
        list-style: none;
        padding-left: 0;
    }

    li {
        margin-bottom: 0.5rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .icon {
        opacity: 0.6;
    }
</style>
