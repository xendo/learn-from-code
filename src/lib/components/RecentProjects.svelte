<script lang="ts">
    import * as Card from "$lib/components/ui/card";

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
    <section class="space-y-6">
        <div class="space-y-1">
            <h2 class="text-2xl font-bold tracking-tight">
                {hasCurriculum ? "Explore Other Projects" : "Recent Explorations"}
            </h2>
            <p class="text-muted-foreground">Jump back into previously analyzed projects.</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each projects as project}
                <button 
                    class="text-left h-full w-full group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
                    onclick={() => onSelect(project.repoUrl)}
                >
                    <Card.Root class="h-full hover:border-primary/50 hover:shadow-md transition-all duration-200">
                        <Card.Header>
                            <Card.Title class="text-lg group-hover:text-primary transition-colors">{project.projectName}</Card.Title>
                        </Card.Header>
                        <Card.Content>
                            <Card.Description class="line-clamp-2 mb-4">{project.description}</Card.Description>
                            <div class="text-xs text-muted-foreground font-mono break-all opacity-80 bg-muted/50 p-1.5 rounded">
                                {project.repoUrl}
                            </div>
                        </Card.Content>
                    </Card.Root>
                </button>
            {/each}
        </div>
    </section>
{/if}
