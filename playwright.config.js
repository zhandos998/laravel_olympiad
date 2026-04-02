import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 30000,
    use: {
        baseURL: 'http://127.0.0.1:8001',
        headless: true,
    },
    webServer: {
        command: 'cmd /c "npm run build && php artisan migrate:fresh --force && php artisan db:seed --force && php artisan serve --host=127.0.0.1 --port=8001"',
        url: 'http://127.0.0.1:8001',
        reuseExistingServer: true,
        timeout: 120000,
    },
});
