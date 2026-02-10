<script lang="ts">
    import LoadingSpinner from "./LoadingSpinner.svelte";
    import * as Card from "$lib/components/ui/card";

    interface Props {
        repoUrl: string;
        loadingStatus: string;
    }

    let { repoUrl, loadingStatus }: Props = $props();

    let displayName = $derived(repoUrl.replace("https://github.com/", ""));
</script>

<Card.Root class="text-center p-12">
    <Card.Header>
        <Card.Title class="text-2xl">Analyzing {displayName}</Card.Title>
        <Card.Description>This may take up to a minute...</Card.Description>
    </Card.Header>
    <Card.Content class="flex flex-col items-center justify-center gap-4 py-8">
        <LoadingSpinner size={32} color="hsl(var(--primary))" />
        <span class="font-medium text-primary animate-pulse">{loadingStatus || "Initializing..."}</span>
    </Card.Content>
</Card.Root>
