import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    base: '/',
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        // reduce memory usage during build
        minify: 'esbuild',
        rollupOptions: {
            output: {
                manualChunks: undefined,
            },
        },
        // disable source maps to save memory
        sourcemap: false,
    },
});
