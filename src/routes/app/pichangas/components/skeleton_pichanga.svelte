<script lang="ts">
    import { Skeleton } from '$lib/components/ui/skeleton'
</script>

<div class="space-y-2">
    <div class="flex items-center space-x-2">
        <Skeleton class="h-5 w-70" />
        <Skeleton class="h-5 w-15" />
    </div>
    <div class="flex items-center space-x-2 w-full justify-between">
        <Skeleton class="h-3 w-40" />
        <Skeleton class="h-3 w-40" />
    </div>
    <Skeleton class="h-3 w-full" />
</div>
