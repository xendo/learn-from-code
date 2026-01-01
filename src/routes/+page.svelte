<script lang="ts">
  import { onMount } from "svelte";
  import type { Curriculum } from "$lib/types";
  import LessonView from "$lib/components/LessonView.svelte";

  interface RecentProject {
    projectName: string;
    description: string;
    repoUrl: string;
    timestamp: string;
  }

  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { signIn, signOut } from "@auth/sveltekit/client";

  // ... (RecentProject interface)

  let repoUrl = $state("");
  let isGenerating = $state(false);
  let loadingStatus = $state("");
  let activeError = $state<string | null>(null);
  let fileTree = $state<any[]>([]);
  let curriculum = $state<Curriculum | null>(null);
  let recentProjects = $state<RecentProject[]>([]);

  // Reactive derived state for the current project in URL
  let projectParam = $derived($page.url.searchParams.get("project"));
  let session = $derived($page.data.session);

  onMount(async () => {
    fetchRecent();
  });

  // Effect to handle URL changes (Navigation)
  $effect(() => {
    if (projectParam) {
      // user navigated to a project
      if (!curriculum || curriculum.repoUrl !== projectParam) {
        loadProject(projectParam);
      }
    } else {
      // user navigated to home (clearing project)
      curriculum = null;
      fileTree = [];
    }
  });

  async function fetchRecent() {
    try {
      const resp = await fetch("/api/recent");
      const data = await resp.json();
      recentProjects = data.projects || [];
    } catch (e) {
      console.error("Failed to fetch recent:", e);
    }
  }

  // Interaction just updates the URL
  function handleGenerate(url?: string) {
    const targetUrl = url || repoUrl;
    if (!targetUrl) return;

    // Push new state to history
    goto(`?project=${encodeURIComponent(targetUrl)}`);
  }

  // The actual logic moved to loadProject
  async function loadProject(url: string) {
    isGenerating = true;
    loadingStatus = "Initializing...";
    activeError = null;
    curriculum = null;
    fileTree = [];

    try {
      const resp = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: url }),
      });

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        // Keep the last part if incomplete
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const data = JSON.parse(line);
            console.log("Stream chunk:", data);

            if (data.status) {
              loadingStatus = data.status;
            } else if (data.error) {
              // Handle structured error
              if (data.code === 401) {
                activeError = "Sign in required to generate new curriculums.";
                // Optionally trigger sign-in flow here or let user click button
                return;
              }
              throw new Error(data.error);
            } else if (data.curriculum) {
              // Final payload
              curriculum = data.curriculum;
              fileTree = data.fileTree;
              repoUrl = url;
              fetchRecent();
            }
          } catch (err) {
            console.warn("Stream parse error", err, line);
          }
        }
      }

      // Process any remaining buffer content
      if (buffer.trim()) {
        try {
          const data = JSON.parse(buffer);
          if (data.curriculum) {
            curriculum = data.curriculum;
            fileTree = data.fileTree;
            repoUrl = url;
            fetchRecent();
          }
        } catch (e) {
          console.warn("Final buffer parse error", e);
        }
      }
    } catch (e: any) {
      activeError = e.message;
    } finally {
      isGenerating = false;
      loadingStatus = "";
    }
  }
</script>

<div class="container landing">
  <header class="hero">
    <h1 class="logo" onclick={() => goto("/")}>Learn from Code</h1>
    <p>Turn any GitHub repository into a step-by-step learning journey.</p>

    <div class="auth-actions">
      {#if session}
        <div class="user-info">
          <img
            src={session.user?.image}
            alt={session.user?.name}
            class="avatar"
          />
          <button class="btn-text" onclick={() => signOut()}>Sign Out</button>
        </div>
      {:else}
        <button class="btn-secondary" onclick={() => signIn("github")}
          >Sign In with GitHub</button
        >
      {/if}
    </div>
  </header>

  <section class="card url-input">
    <input
      type="text"
      bind:value={repoUrl}
      placeholder="https://github.com/user/repo"
      class="input-field"
    />
    <div
      class="button-wrapper"
      data-tooltip="Showcase Tier: Limited to ~20 gens/day."
    >
      <button
        class="btn-primary"
        onclick={() => handleGenerate()}
        disabled={isGenerating}
      >
        {isGenerating ? loadingStatus || "Generating..." : "Analyze Project"}
      </button>
    </div>
  </section>

  {#if activeError}
    <div class="error-banner">
      <p>{activeError}</p>
      {#if activeError.includes("Sign in")}
        <button onclick={() => signIn("github")}>Sign In</button>
      {/if}
    </div>
  {/if}

  {#if curriculum}
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
  {/if}

  {#if fileTree.length > 0}
    <section class="card results">
      <h2>Project Taxonomy</h2>
      <div class="tree-preview">
        <ul>
          {#each fileTree as node}
            <li>
              <span class="icon">{node.isDirectory ? "📁" : "📄"}</span>
              {node.name}
            </li>
          {/each}
        </ul>
      </div>
    </section>
  {/if}

  {#if recentProjects.length > 0}
    <section class="recent-explorations">
      <div class="section-header">
        <h2>{curriculum ? "Explore Other Projects" : "Recent Explorations"}</h2>
        <p>Jump back into previously analyzed projects.</p>
      </div>
      <div class="recent-grid">
        {#each recentProjects as project}
          <button
            class="card recent-card"
            onclick={() => handleGenerate(project.repoUrl)}
          >
            <h3>{project.projectName}</h3>
            <p>{project.description}</p>
            <span class="repo-link">{project.repoUrl}</span>
          </button>
        {/each}
      </div>
    </section>
  {/if}
</div>

<style>
  .landing {
    display: flex;
    flex-direction: column;
    gap: 2.5rem;
    padding-top: 3rem;
    padding-bottom: 5rem;
  }

  header {
    text-align: center;
  }

  header h1 {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
  }

  .logo {
    cursor: pointer;
  }

  .url-input {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  .url-input input {
    flex: 1;
  }

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

  /* Recent Explorations */
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

  .hero p {
    font-size: 1.25rem;
    color: var(--text-muted);
    margin-bottom: 2rem;
  }

  .auth-actions {
    position: absolute;
    top: 1rem;
    right: 1rem;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
  }

  .btn-text {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 0.875rem;
  }

  .btn-text:hover {
    color: var(--primary);
    text-decoration: underline;
  }

  .btn-secondary {
    background: white;
    border: 1px solid var(--border-color);
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
  }

  .btn-secondary:hover {
    background: #f8fafc;
  }

  .recent-card p {
    font-size: 0.875rem;
    color: var(--text-muted);
    margin-bottom: 1rem;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .repo-link {
    font-size: 0.75rem;
    color: var(--primary);
    opacity: 0.8;
    word-break: break-all;
  }

  /* Tooltip Styles */
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

  .error-banner {
    background: #fef2f2;
    border: 1px solid #fee2e2;
    color: #991b1b;
    padding: 1rem;
    border-radius: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .error-banner button {
    background: #dc2626;
    color: white;
    border: none;
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    cursor: pointer;
  }
</style>
