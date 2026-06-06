import adapter from '@sveltejs/adapter-node'
import { relative, sep } from 'node:path'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: vitePreprocess(),
    kit: {
        // adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
        // If your environment is not supported, or you settled on a specific environment, switch out the adapter.
        // See https://svelte.dev/docs/kit/adapters for more information about adapters.
        adapter: adapter({
            // default output directory is 'build'
            out: 'build',
            precompress: true,
            envPrefix: '',
        }),
        alias: {
            $lib: './src/lib',
            $generated: './generated',
            $utils: './src/utils',
            $src: './src',
        },
    },
}

export default config
