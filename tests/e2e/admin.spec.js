import { test, expect } from '@playwright/test';

async function loginAsAdmin(page) {
    await page.goto('/login');
    await page.getByTestId('login-email').fill('admin@olympiad.local');
    await page.getByTestId('login-password').fill('password123');
    await page.getByRole('button', { name: /войти|кіру/i }).click();
    await expect(page).toHaveURL(/\/admin$/);
}

test('admin smoke flow covers olympiad settings and subjects pages', async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept());

    const olympiadTitle = `Smoke Olympiad ${Date.now()}`;
    const updatedTitle = `${olympiadTitle} Updated`;
    const subjectTitle = `Subject ${Date.now()}`;

    await loginAsAdmin(page);

    await page.getByTestId('olympiad-title-input').fill(olympiadTitle);
    await page.getByTestId('create-olympiad-button').click();
    await expect(page.getByText(olympiadTitle)).toBeVisible();

    const olympiadCard = page.locator('[data-testid^="olympiad-card-"]', { hasText: olympiadTitle }).first();
    await olympiadCard.locator('[data-testid^="open-olympiad-"]').click();
    await expect(page).toHaveURL(/\/admin\/olympiads\/\d+$/);

    await page.getByTestId('section-settings').click();
    await expect(page).toHaveURL(/\/settings$/);
    await page.getByTestId('settings-title-input').fill(updatedTitle);
    await page.getByTestId('settings-pass-percent-input').fill('75');
    await page.getByTestId('save-olympiad-settings').click();
    await expect(page.getByTestId('settings-title-input')).toHaveValue(updatedTitle);
    await expect(page.getByTestId('settings-pass-percent-input')).toHaveValue('75');

    await page.getByTestId('section-subjects').click();
    await expect(page).toHaveURL(/\/subjects$/);
    await page.getByTestId('subject-name-input').fill(subjectTitle);
    await page.getByTestId('subject-question-count-input').fill('30');
    await page.getByTestId('create-subject-button').click();
    await expect(page.getByText(subjectTitle)).toBeVisible();

    await page.getByTestId('section-overview').click();
    await expect(page).toHaveURL(/\/admin\/olympiads\/\d+$/);
    await expect(page.getByRole('button', { name: /участники|қатысушылар/i })).toBeVisible();
});

test('admin can archive olympiad and subject from UI', async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept());

    const olympiadTitle = `Archive Olympiad ${Date.now()}`;
    const subjectTitle = `Archive Subject ${Date.now()}`;

    await loginAsAdmin(page);

    await page.getByTestId('olympiad-title-input').fill(olympiadTitle);
    await page.getByTestId('create-olympiad-button').click();
    await expect(page.getByText(olympiadTitle)).toBeVisible();

    const olympiadCard = page.locator('[data-testid^="olympiad-card-"]', { hasText: olympiadTitle }).first();
    await olympiadCard.locator('[data-testid^="open-olympiad-"]').click();
    await page.getByTestId('section-subjects').click();
    await page.getByTestId('subject-name-input').fill(subjectTitle);
    await page.getByTestId('create-subject-button').click();
    await expect(page.getByText(subjectTitle)).toBeVisible();

    await page.locator(`[data-testid^="archive-subject-"]`).first().click();
    await expect(page.getByText(subjectTitle)).toHaveCount(0);

    await page.goto('/admin');
    await page.locator('[data-testid^="olympiad-card-"]', { hasText: olympiadTitle }).first().locator('[data-testid^="archive-olympiad-"]').click();
    await expect(page.getByText(olympiadTitle)).toHaveCount(0);
});
