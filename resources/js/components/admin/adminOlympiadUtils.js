export function parsePositiveInteger(value, max = 100) {
    const parsedValue = Number(value);

    if (!Number.isInteger(parsedValue) || parsedValue < 1 || parsedValue > max) {
        return null;
    }

    return parsedValue;
}

export function parseOptionalPercent(value) {
    if (value === '' || value === null || value === undefined) {
        return null;
    }

    const parsedValue = Number(value);

    if (!Number.isFinite(parsedValue) || parsedValue < 0 || parsedValue > 100) {
        return null;
    }

    return parsedValue;
}

export function toDateTimeInputValue(value) {
    if (!value) {
        return '';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

    return localDate.toISOString().slice(0, 16);
}

export function formatDate(value, locale) {
    if (!value) {
        return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '-';
    }

    return new Intl.DateTimeFormat(locale === 'kaz' ? 'kk-KZ' : 'ru-RU', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}

function csvEscape(value) {
    const normalized = value ?? '';
    const stringValue = String(normalized).replaceAll('"', '""');

    return `"${stringValue}"`;
}

export function downloadCsv(filename, rows) {
    const csvContent = `\uFEFF${rows.map((row) => row.map(csvEscape).join(',')).join('\n')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
