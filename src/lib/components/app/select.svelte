<script lang=ts>
    import * as Select from "$lib/components/ui/select";
    import Label from "../ui/label/label.svelte";

    let {
        label,
        options,
        name,
        placeholder,
        type = "single",
        value = $bindable(),
        ...props
    }:{
        label: string,
        options: { value: string, label: string }[],
        name:string,
        placeholder?: string,
        type?: "single" | "multiple",
        value?: string|string[],
        [key: string]: any
    } = $props();

</script>

<div {...props} class="space-y-2">
    <Label>{label}</Label>
    <Select.Root type={type} bind:value={value as any} {name}>
        <Select.Trigger class="w-full">
            {#if value == "" || (Array.isArray(value) && value.length === 0)}
                <span>{placeholder ?? "Selecciona una opción"}</span>
            {:else}
                {#if type === "single"}
                    {#each options as option}
                        {#if option.value === value}
                            {option.label}
                        {/if}
                    {/each}
                {:else if type === "multiple"}
                    {#each options as option}
                        {#if Array.isArray(value) && value.includes(option.value)}
                            <span>{option.label}</span>
                        {/if}
                    {/each}
                {/if}
            {/if}
        </Select.Trigger>
        <Select.Content>
            {#each options as option}
                <Select.Item value={option.value}>{option.label}</Select.Item>
            {/each}
        </Select.Content>
    </Select.Root>
</div>
