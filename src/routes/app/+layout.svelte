<script lang="ts">
    import { SidebarProvider, SidebarTrigger, SidebarInset } from "$lib/components/ui/sidebar";
    import SideBarApp from "$lib/components/app/sidebar.svelte";

    import { page } from "$app/state";

    let { children, data } = $props();
    
</script>

<SidebarProvider>
    <SideBarApp user={data.user} />

    <SidebarInset>
        <header class="p-4 border-b flex">
            <SidebarTrigger />
            {#if page.data.name_page}
                <h1 class="text-2xl font-bold">{page.data.name_page}</h1>
            {/if}
        </header>
        <main class="p-4 h-full">
            {@render children()}
        </main>
    </SidebarInset>
</SidebarProvider>
