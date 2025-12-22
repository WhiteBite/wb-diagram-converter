import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        ignores: ['dist/**', 'node_modules/**', '**/*.js', '**/*.cjs'],
    },
    {
        files: ['src/**/*.ts', '__tests__/**/*.ts'],
        rules: {
            '@typescript-eslint/no-unused-vars': ['warn', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
            }],
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/explicit-function-return-type': 'off',
            'no-useless-escape': 'warn',
            'no-control-regex': 'off',
            'no-case-declarations': 'off',
            'prefer-const': 'warn',
        },
    }
);
