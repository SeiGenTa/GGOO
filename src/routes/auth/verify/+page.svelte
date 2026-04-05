<script lang="ts">
    const { data } = $props()

    const title = data.title;
    const body = data.message;
</script>

<div class="flex flex-col items-center justify-center h-screen">
    <h1 class="text-4xl font-bold mb-4">{title}</h1>
    <p class="text-lg text-gray-600">{body}</p>
</div>
    
