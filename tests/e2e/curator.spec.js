import { test, expect } from '@playwright/test';

const TINY_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sot9wAAAABJRU5ErkJggg==';

async function loginAsCurator(page) {
    await page.goto('/login');
    await page.getByTestId('login-email').fill('curator@olympiad.local');
    await page.getByTestId('login-password').fill('password123');
    await page.getByTestId('auth-submit').click();
    await expect(page).toHaveURL(/\/curator$/);
}

async function openFirstSubjectQuestions(page) {
    const firstSubject = page.locator('[data-testid^="curator-subject-"]').first();
    await expect(firstSubject).toBeVisible();
    await firstSubject.locator('[data-testid^="curator-open-subject-"]').click();
    await expect(page).toHaveURL(/\/curator\/subjects\/\d+\/questions$/);

    return page.url().match(/\/subjects\/(\d+)\/questions$/)?.[1];
}

async function fillTinyMceText(page, editorId, value) {
    const body = page.frameLocator(`#${editorId}_ifr`).locator('body');
    await body.waitFor();
    await body.click();
    await body.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
    await body.fill(value);
}

async function uploadTestImage(page) {
    return await page.evaluate(
        async ({ base64 }) => {
            const byteCharacters = window.atob(base64);
            const byteNumbers = Array.from(byteCharacters, (character) => character.charCodeAt(0));
            const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'image/png' });
            const formData = new FormData();
            formData.append('image', blob, 'e2e-image.png');

            const response = await fetch('/api/curator/question-images', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('olympiad_token')}`,
                },
                body: formData,
            });
            const data = await response.json();

            if (!response.ok || typeof data.location !== 'string') {
                throw new Error(data.message || 'Failed to upload test image');
            }

            return data.location;
        },
        { base64: TINY_PNG_BASE64 },
    );
}

async function getAuthToken(page) {
    return await page.evaluate(() => localStorage.getItem('olympiad_token'));
}

function buildQuestionPayload(title) {
    return {
        text: `<p>${title}</p>`,
        explanation: '',
        options: Array.from({ length: 5 }, (_, index) => ({
            text: `<p>${title} Option ${index + 1}</p>`,
            is_correct: index === 0,
        })),
    };
}

test('curator can create and persist a TinyMCE question with uploaded image', async ({ page, request }) => {
    page.on('dialog', (dialog) => dialog.accept());

    const questionTitle = `Image Question ${Date.now()}`;

    await loginAsCurator(page);
    const subjectId = await openFirstSubjectQuestions(page);
    const token = await getAuthToken(page);

    await page.getByTestId('curator-create-question-link').click();
    await expect(page).toHaveURL(/\/curator\/subjects\/\d+\/questions\/new$/);
    await expect(page.getByTestId('curator-save-and-new-question')).toBeVisible();

    const imageLocation = await uploadTestImage(page);

    for (let optionIndex = 0; optionIndex < 5; optionIndex += 1) {
        await fillTinyMceText(page, `curator-question-option-editor-${optionIndex}`, `Answer ${optionIndex + 1}`);
    }

    const payload = await page.evaluate((textHtml) => ({
        text: textHtml,
        explanation: '',
        options: Array.from({ length: 5 }, (_, index) => ({
            text: window.tinymce.get(`curator-question-option-editor-${index}`).getContent(),
            is_correct: index === 0,
        })),
    }), `<p>${questionTitle}</p><p><img src="${imageLocation}" alt="e2e-image" width="64" height="64" /></p>`);

    const saveResponse = await request.post(`/api/curator/subjects/${subjectId}/questions`, {
        headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
            'X-Locale': 'rus',
        },
        data: payload,
    });
    expect(saveResponse.ok()).toBeTruthy();
    const savedQuestion = await saveResponse.json();

    await page.goto(`/curator/subjects/${subjectId}/questions/${savedQuestion.id}/edit`);
    await expect(page).toHaveURL(/\/curator\/subjects\/\d+\/questions\/\d+\/edit$/);
    await expect(page.frameLocator('#curator-question-text-editor_ifr').locator('img[alt="e2e-image"]')).toBeVisible();

    const persistedHtml = await page.evaluate(() => window.tinymce.get('curator-question-text-editor').getContent());
    expect(persistedHtml).toContain('/api/media/question-images/');
    expect(persistedHtml).not.toContain('data:image/');
    expect(persistedHtml).not.toContain('http://127.0.0.1:8001');
});

test('curator can search, sort and paginate questions', async ({ page, request }) => {
    await loginAsCurator(page);
    const subjectId = await openFirstSubjectQuestions(page);
    const token = await getAuthToken(page);

    expect(subjectId).toBeTruthy();
    expect(token).toBeTruthy();

    for (let index = 1; index <= 12; index += 1) {
        const title = `ZZZ Page ${String(index).padStart(2, '0')}`;
        const response = await request.post(`/api/curator/subjects/${subjectId}/questions`, {
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${token}`,
                'X-Locale': 'rus',
            },
            data: buildQuestionPayload(title),
        });

        expect(response.ok()).toBeTruthy();
    }

    await page.goto(`/curator/subjects/${subjectId}/questions`);
    await expect(page.getByTestId('curator-question-search')).toBeVisible();

    await page.getByTestId('curator-question-search').fill('ZZZ Page');
    await page.getByTestId('curator-question-sort').selectOption('alphabetical');

    await expect(page.getByTestId('curator-question-page-label')).toContainText('1 / 2');
    await expect(page.locator('[data-testid^="curator-question-"]', { hasText: 'ZZZ Page 01' }).first()).toBeVisible();

    await page.getByTestId('curator-question-page-next').click();
    await expect(page.getByTestId('curator-question-page-label')).toContainText('2 / 2');
    await expect(page.locator('[data-testid^="curator-question-"]', { hasText: 'ZZZ Page 11' }).first()).toBeVisible();
});
