import {defineConfig} from 'vite';

export default defineConfig({
    test: {
        setupFiles: [
            './test/setupFiles/server.js',
        ],
        coverage: {
            provider: 'v8',
            reporter: [
                ['lcov', {projectRoot: '../../..'}],
                ['html'],
                ['text'],
                ['json'],
            ],
        },
    },
});
