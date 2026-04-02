import React, { useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { renderWirisFormulas } from '../../lib/wirisViewer';

const PRESERVED_MATHML_TAGS = ['semantics', 'annotation', 'annotation-xml', 'mstack', 'msline', 'msrow', 'none'];
const PRESERVED_MATHML_ATTRIBUTES = ['encoding', 'linebreak', 'charalign', 'stackalign'];
const MATHML_ANNOTATION_REGEX = /<(annotation(?:-xml)?)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi;

function normalizeMathMlMarkup(html) {
    if (!html || typeof document === 'undefined') {
        return html;
    }

    const container = document.createElement('div');
    container.innerHTML = html;

    container.querySelectorAll('math').forEach((mathNode) => {
        mathNode.setAttribute('display', 'inline');
        mathNode.removeAttribute('mode');
    });

    container.querySelectorAll('mstyle').forEach((node) => {
        node.setAttribute('displaystyle', 'true');
        node.setAttribute('scriptlevel', '0');
    });

    container.querySelectorAll('[displaystyle]').forEach((node) => {
        node.setAttribute('displaystyle', 'true');
    });

    container.querySelectorAll('[scriptlevel]').forEach((node) => {
        node.setAttribute('scriptlevel', '0');
    });

    container.querySelectorAll('[mathsize],[minsize],[maxsize]').forEach((node) => {
        node.removeAttribute('mathsize');
        node.removeAttribute('minsize');
        node.removeAttribute('maxsize');
    });

    container.querySelectorAll('math [style*="font-size"]').forEach((node) => {
        const style = node.getAttribute('style') ?? '';
        const normalizedStyle = style
            .split(';')
            .map((part) => part.trim())
            .filter((part) => part && !part.toLowerCase().startsWith('font-size'))
            .join('; ');

        if (normalizedStyle) {
            node.setAttribute('style', normalizedStyle);
            return;
        }

        node.removeAttribute('style');
    });

    return container.innerHTML;
}

function sanitizeRichHtml(content) {
    if (!content) {
        return '';
    }

    const preservedAnnotations = [];
    const contentWithPlaceholders = content.replace(MATHML_ANNOTATION_REGEX, (match) => {
        const placeholder = `__WIRIS_ANNOTATION_${preservedAnnotations.length}__`;
        preservedAnnotations.push(match);
        return placeholder;
    });

    let sanitizedHtml = DOMPurify.sanitize(contentWithPlaceholders, {
        USE_PROFILES: { html: true, mathMl: true },
        ADD_TAGS: PRESERVED_MATHML_TAGS,
        ADD_ATTR: PRESERVED_MATHML_ATTRIBUTES,
    });

    preservedAnnotations.forEach((annotationHtml, index) => {
        sanitizedHtml = sanitizedHtml.replace(`__WIRIS_ANNOTATION_${index}__`, annotationHtml);
    });

    return normalizeMathMlMarkup(sanitizedHtml);
}

export function RichContent({ content, className = '' }) {
    const containerRef = useRef(null);
    const sanitizedHtml = sanitizeRichHtml(content);

    useEffect(() => {
        renderWirisFormulas(containerRef.current).catch(() => {});
    }, [sanitizedHtml]);

    if (!content) {
        return null;
    }

    return (
        <div
            ref={containerRef}
            className={[
                'rich-content text-sm text-slate-800',
                '[&_img]:inline-block [&_img]:align-middle [&_img]:max-w-full [&_img]:rounded-xl [&_img]:border [&_img]:border-slate-200',
                '[&>*+*]:mt-3',
                '[&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-slate-950 [&_pre]:p-4 [&_pre]:text-sm [&_pre]:text-slate-100',
                '[&_pre]:whitespace-pre [&_code]:font-mono [&_p]:leading-6 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5',
                '[&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-200 [&_td]:p-2 [&_th]:border [&_th]:border-slate-200 [&_th]:p-2',
                className,
            ]
                .join(' ')
                .trim()}
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
    );
}
