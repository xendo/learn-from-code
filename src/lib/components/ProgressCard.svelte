<script lang="ts">
    import LoadingSpinner from "./LoadingSpinner.svelte";

    interface Props {
        repoUrl: string;
        loadingStatus: string;
    }

    let { repoUrl, loadingStatus }: Props = $props();

    let displayName = $derived(repoUrl.replace("https://github.com/", ""));
</script>

<section class="card progress-card">
    <div class="progress-header">
        <h2>Analyzing {displayName}</h2>
        <p>This may take up to a minute...</p>
    </div>
    <div class="loading-state centered">
        <LoadingSpinner size={24} color="var(--primary)" />
        <span class="status-text">{loadingStatus || "Initializing..."}</span>
    </div>
</section>

<style>
    .progress-card {
        text-align: center;
        padding: 3rem;
    }

    .progress-header h2 {
        margin: 0 0 0.5rem;
        font-size: 1.5rem;
        color: var(--text-heading);
    }

    .progress-header p {
        color: var(--text-muted);
        margin: 0;
    }

    .status-text {
        font-weight: 500;
        color: var(--primary);
    }
</style>
