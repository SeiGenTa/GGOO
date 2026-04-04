<script lang="ts">
    import Input from "../ui/input/input.svelte";
    import Label from "../ui/label/label.svelte";

    let { 
        name,
        id,
        placeholder,
        label,
        value = $bindable(),
        type = "text",
        required,
        disabled
    }:{
        name?: string;
        id?: string;
        placeholder?: string;
        label?: string;
        value?: string;
        type?: string;
        required?: boolean;
        disabled?: boolean;
    } = $props();
</script>

<div class="space-y-2">
    <Label for={id}>{label}</Label>
    <Input {id} {name} {placeholder} {type} {required} {value} {disabled}/>
</div>
