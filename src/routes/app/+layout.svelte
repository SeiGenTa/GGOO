<script lang="ts">
    import { SidebarProvider, SidebarTrigger, SidebarInset } from "$lib/components/ui/sidebar";
    import SideBarApp from "$lib/components/app/sidebar.svelte";

    import { page } from "$app/state";

    let { children, data } = $props();
    
</script>

<SidebarProvider>
    <SideBarApp user={data.user!} app_name={data.app_name} />

    <SidebarInset>
        <header class="p-4 border-b flex">
            <SidebarTrigger />
            {#if page.data.name_page}
                <h1 class="text-2xl font-bold">{page.data.name_page}</h1>
            {/if}
        </header>
        <main class="p-4 h-full w-full">
            {@render children()}
        </main>
        <footer class="p-4 border-t text-center text-sm">
            &copy; {new Date().getFullYear()} GGOO. Todos los derechos reservados.
            <a href="/app/extras/contributors" class="text-blue-500 hover:underline ml-2">Contribuidores</a>
            <a href="/app/extras/contributions_money" class="text-blue-500 hover:underline ml-2">Contribuciones monetarias</a>
            <a href="https://github.com/SeiGenTa/GGOO" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline ml-2">GitHub</a>
        </footer>
    </SidebarInset>
</SidebarProvider>
