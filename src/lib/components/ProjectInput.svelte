<script lang="ts">
    import LoadingSpinner from "./LoadingSpinner.svelte";

    interface Props {
        repoUrl: string;
        isGenerating: boolean;
        onGenerate: () => void;
    }

    let { repoUrl = $bindable(), isGenerating, onGenerate }: Props = $props();
</script>

<section class="card url-input">
    <input
        type="text"
        bind:value={repoUrl}
        placeholder="https://github.com/user/repo"
        class="input-field"
        disabled={isGenerating}
    />
    <div
        class="button-wrapper"
        data-tooltip="Showcase Tier: Limited to ~20 gens/day."
    >
        <button
            class="btn-primary"
            onclick={onGenerate}
            disabled={isGenerating}
        >
            {#if isGenerating}
                <div class="loading-state">
                    <LoadingSpinner size={18} color="white" />
                    <span>Initializing...</span>
                </div>
            {:else}
                Analyze Project
            {/if}
        </button>
    </div>
</section>

<style>
    .url-input {
        display: flex;
        gap: 0.75rem;
        align-items: center;
    }

    .url-input input {
        flex: 1;
    }

    .button-wrapper {
        position: relative;
        display: inline-block;
    }

    .button-wrapper:hover::after {
        content: attr(data-tooltip);
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        margin-bottom: 0.75rem;
        background: #334155;
        color: white;
        padding: 0.5rem 0.75rem;
        border-radius: 6px;
        font-size: 0.75rem;
        white-space: nowrap;
        opacity: 0;
        animation: fadeInTooltip 0.2s forwards;
        pointer-events: none;
        z-index: 10;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    }

    .button-wrapper:hover::before {
        content: "";
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        margin-bottom: 0.25rem;
        border-width: 5px;
        border-style: solid;
        border-color: #334155 transparent transparent transparent;
        opacity: 0;
        animation: fadeInTooltip 0.2s forwards;
        pointer-events: none;
    }

    @keyframes fadeInTooltip {
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }
</style>
