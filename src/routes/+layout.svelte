<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { ModeWatcher } from "mode-watcher";
	import { Toaster } from "$lib/components/ui/sonner";

	import "../app.css";
	import "./theme.css"
    import { toast } from 'svelte-sonner';

	let { children, data } = $props();
	const toasts = $derived(data.toast);

	$effect(() => {
		if (toasts.length > 0) {
			toasts.forEach((toast_info) => {
				if (toast_info.type === "error") {
					toast.error(toast_info.message);
				} else if (toast_info.type === "success") {
					toast.success(toast_info.message);
				} else {
					toast(toast_info.message);
				}
			});
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<Toaster />
<ModeWatcher />
{@render children()}
