import { defineConfig } from 'tsup';

export default defineConfig({
    entry: {
        index: 'src/index.ts',
        'parsers/index': 'src/parsers/index.ts',
        'generators/index': 'src/generators/index.ts',
        'types/index': 'src/types/index.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    splitting: true,
    sourcemap: true,
    clean: true,
    minify: false,
    treeshake: true,
});
