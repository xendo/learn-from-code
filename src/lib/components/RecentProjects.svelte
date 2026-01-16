<script lang="ts">
    interface RecentProject {
        projectName: string;
        description: string;
        repoUrl: string;
        timestamp: string;
    }

    interface Props {
        projects: RecentProject[];
        hasCurriculum: boolean;
        onSelect: (repoUrl: string) => void;
    }

    let { projects, hasCurriculum, onSelect }: Props = $props();
</script>

{#if projects.length > 0}
    <section class="recent-explorations">
        <div class="section-header">
            <h2>
                {hasCurriculum
                    ? "Explore Other Projects"
                    : "Recent Explorations"}
            </h2>
            <p>Jump back into previously analyzed projects.</p>
        </div>
        <div class="recent-grid">
            {#each projects as project}
                <button
                    class="card recent-card"
                    onclick={() => onSelect(project.repoUrl)}
                >
                    <h3>{project.projectName}</h3>
                    <p>{project.description}</p>
                    <span class="repo-link">{project.repoUrl}</span>
                </button>
            {/each}
        </div>
    </section>
{/if}

<style>
    .recent-explorations {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .recent-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1.5rem;
    }

    .recent-card {
        text-align: left;
        transition:
            transform 0.2s,
            box-shadow 0.2s;
        cursor: pointer;
        border: 1px solid var(--border-color);
    }

    .recent-card:hover {
        transform: translateY(-2px);
        box-shadow:
            0 4px 6px -1px rgb(0 0 0 / 0.1),
            0 2px 4px -2px rgb(0 0 0 / 0.1);
        border-color: var(--primary);
    }

    .recent-card h3 {
        margin-top: 0;
        margin-bottom: 0.5rem;
        font-size: 1.125rem;
    }

    .recent-card p {
        font-size: 0.875rem;
        color: var(--text-muted);
        margin-bottom: 1rem;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    .repo-link {
        font-size: 0.75rem;
        color: var(--primary);
        opacity: 0.8;
        word-break: break-all;
    }
</style>
