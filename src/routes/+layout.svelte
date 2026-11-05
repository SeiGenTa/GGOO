<script lang="ts">
    import favicon from '$lib/assets/favicon.svg'
    import { ModeWatcher } from 'mode-watcher'
    import { Toaster } from '$lib/components/ui/sonner'
    import logo from '$src/public/logo.jpg'

    import '../app.css'
    import './theme.css'
    import { toast } from 'svelte-sonner'

    let { children, data } = $props()
    const toasts = $derived(data.toast)

    $effect(() => {
        if (toasts.length > 0) {
            toasts.forEach((toast_info) => {
                if (toast_info.type === 'error') {
                    toast.error(toast_info.message)
                } else if (toast_info.type === 'success') {
                    toast.success(toast_info.message)
                } else {
                    toast(toast_info.message)
                }
            })
        }
    })

    import { navigating } from '$app/state'
</script>

{#if navigating.type === 'goto' || navigating.type === 'link' || navigating.type === 'popstate'}
    <div class="loading-bar"></div>
{/if}

<svelte:head>
    <link rel="icon" href={logo} />
</svelte:head>

<Toaster />
<ModeWatcher />
{@render children()}

<style>
    .loading-bar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: #ff3e00; /* Color naranja de Svelte, cámbialo por el tuyo */
        z-index: 9999;
        animation: loading 2s ease-in-out infinite;
        transform-origin: left;
    }

    @keyframes loading {
        0% {
            transform: scaleX(0);
        }
        50% {
            transform: scaleX(0.7);
        }
        100% {
            transform: scaleX(1);
        }
    }
</style>
