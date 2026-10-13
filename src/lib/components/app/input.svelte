<script lang="ts">
    import Input from '../ui/input/input.svelte'
    import Label from '../ui/label/label.svelte'

    let {
        name,
        id,
        placeholder,
        label,
        value = $bindable(),
        type = 'text',
        required,
        disabled,
        oninput,
    }: {
        name?: string
        id?: string
        placeholder?: string
        label?: string
        value?: string
        type?: string
        required?: boolean
        disabled?: boolean
        oninput?: (event: Event) => void
    } = $props()
</script>

<div class="space-y-2">
    <Label for={id}>{label}</Label>
    <Input {id} {name} {placeholder} {type} {required} {value} {disabled} {oninput} />
</div>
