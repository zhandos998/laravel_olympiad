import React from 'react';
import { Editor } from '@tinymce/tinymce-react';
import wirisPlugin from '@wiris/mathtype-tinymce7/plugin.min.js?url';
import 'tinymce/tinymce';
import 'tinymce/icons/default';
import 'tinymce/models/dom';
import 'tinymce/themes/silver';
import 'tinymce/plugins/advlist';
import 'tinymce/plugins/autolink';
import 'tinymce/plugins/code';
import 'tinymce/plugins/image';
import 'tinymce/plugins/link';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/preview';
import 'tinymce/plugins/table';
import 'tinymce/plugins/visualblocks';
import 'tinymce/plugins/wordcount';
import 'tinymce/skins/ui/oxide/skin.css';
import 'tinymce/skins/content/default/content.css';
import 'tinymce-i18n/langs8/ru.js';

const MAX_IMAGE_DIMENSION = 1800;
const MAX_IMAGE_UPLOAD_BYTES = 2 * 1024 * 1024;
const MIN_IMAGE_QUALITY = 0.55;
const DEFAULT_IMAGE_FILENAME = 'editor-image.png';
const COMPRESSIBLE_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/bmp']);

async function imageToDataUrl(blob) {
    return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Failed to read image'));
        reader.readAsDataURL(blob);
    });
}

async function loadImageElement(blob) {
    return await new Promise((resolve, reject) => {
        const imageUrl = URL.createObjectURL(blob);
        const image = new Image();

        image.onload = () => {
            URL.revokeObjectURL(imageUrl);
            resolve(image);
        };
        image.onerror = () => {
            URL.revokeObjectURL(imageUrl);
            reject(new Error('Failed to decode image'));
        };
        image.src = imageUrl;
    });
}

async function canvasToBlob(canvas, mimeType, quality) {
    return await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Failed to encode image'));
                return;
            }

            resolve(blob);
        }, mimeType, quality);
    });
}

function replaceFileExtension(filename, extension) {
    if (!filename) {
        return `${DEFAULT_IMAGE_FILENAME.replace(/\.[^.]+$/, '')}.${extension}`;
    }

    if (!filename.includes('.')) {
        return `${filename}.${extension}`;
    }

    return filename.replace(/\.[^.]+$/, `.${extension}`);
}

function extensionForMimeType(mimeType) {
    return (
        {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
            'image/bmp': 'bmp',
        }[mimeType] ?? 'png'
    );
}

async function optimizeImageBlob(blobInfo) {
    const originalBlob = blobInfo.blob();
    const originalType = originalBlob.type || 'image/png';
    const originalFilename = blobInfo.filename() || DEFAULT_IMAGE_FILENAME;

    if (!COMPRESSIBLE_IMAGE_TYPES.has(originalType) || typeof document === 'undefined') {
        return { blob: originalBlob, filename: originalFilename };
    }

    const image = await loadImageElement(originalBlob);
    const longestSide = Math.max(image.naturalWidth, image.naturalHeight, 1);
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / longestSide);
    const targetWidth = Math.max(1, Math.round(image.naturalWidth * scale));
    const targetHeight = Math.max(1, Math.round(image.naturalHeight * scale));
    const needsResize = targetWidth !== image.naturalWidth || targetHeight !== image.naturalHeight;
    const needsCompression = originalBlob.size > MAX_IMAGE_UPLOAD_BYTES;

    if (!needsResize && !needsCompression) {
        return { blob: originalBlob, filename: originalFilename };
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext('2d');
    if (!context) {
        return { blob: originalBlob, filename: originalFilename };
    }

    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const outputMimeType = originalType === 'image/jpeg' ? 'image/jpeg' : 'image/webp';
    let quality = 0.9;
    let optimizedBlob = await canvasToBlob(canvas, outputMimeType, quality);

    while (optimizedBlob.size > MAX_IMAGE_UPLOAD_BYTES && quality > MIN_IMAGE_QUALITY) {
        quality -= 0.1;
        optimizedBlob = await canvasToBlob(canvas, outputMimeType, quality);
    }

    if (!needsResize && optimizedBlob.size >= originalBlob.size) {
        return { blob: originalBlob, filename: originalFilename };
    }

    return {
        blob: optimizedBlob,
        filename: replaceFileExtension(originalFilename, extensionForMimeType(outputMimeType)),
    };
}

async function uploadEditorImage(blobInfo, uploadUrl, authToken) {
    const preparedImage = await optimizeImageBlob(blobInfo);

    if (!uploadUrl) {
        return imageToDataUrl(preparedImage.blob);
    }

    const formData = new FormData();
    formData.append('image', preparedImage.blob, preparedImage.filename);

    const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: formData,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || typeof data.location !== 'string') {
        const validationMessage = data.errors
            ? Object.values(data.errors)
                  .flat()
                  .find(Boolean)
            : null;

        throw new Error(validationMessage || data.message || `Failed to upload image (${response.status})`);
    }

    return data.location;
}

function applyEditorLtr(editor) {
    const body = editor.getBody();

    if (!body) {
        return;
    }

    body.dir = 'ltr';
    body.style.direction = 'ltr';
    body.style.textAlign = 'left';
    body.style.unicodeBidi = 'plaintext';

    editor.dom.select('p,div,li,td,th,h1,h2,h3,blockquote,pre', body).forEach((node) => {
        editor.dom.setAttrib(node, 'dir', 'ltr');
        editor.dom.setStyle(node, 'text-align', 'left');
    });
}

function normalizeEditorUrl(url) {
    if (!url) {
        return url;
    }

    if (url.startsWith('/') || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('#')) {
        return url;
    }

    if (typeof window === 'undefined') {
        return url;
    }

    try {
        const parsedUrl = new URL(url, window.location.origin);

        if (parsedUrl.origin === window.location.origin) {
            return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
        }
    } catch {
        return url;
    }

    return url;
}

export function RichTextEditor({ id, value, onChange, height = 320, imageUploadUrl, authToken }) {
    return (
        <Editor
            id={id}
            initialValue={value}
            onEditorChange={onChange}
            init={{
                license_key: 'gpl',
                height,
                language: 'ru',
                directionality: 'ltr',
                menubar: false,
                branding: false,
                promotion: false,
                external_plugins: {
                    tiny_mce_wiris: wirisPlugin,
                },
                plugins: ['advlist', 'autolink', 'lists', 'link', 'image', 'table', 'code', 'preview', 'visualblocks', 'wordcount'],
                toolbar:
                    'undo redo | blocks | bold italic underline | alignleft aligncenter alignright | bullist numlist | link image table | tiny_mce_wiris_formulaEditor | removeformat code preview',
                automatic_uploads: true,
                paste_data_images: true,
                object_resizing: true,
                draggable_modal: true,
                convert_urls: false,
                relative_urls: false,
                remove_script_host: true,
                urlconverter_callback: (url) => normalizeEditorUrl(url),
                allow_mathml_annotation_encodings: ['application/json'],
                extended_mathml_elements: ['semantics', 'annotation', 'annotation-xml', 'mstack', 'msline', 'msrow', 'none'],
                extended_mathml_attributes: ['encoding', 'linebreak', 'charalign', 'stackalign'],
                image_title: true,
                image_dimensions: true,
                forced_root_block_attrs: {
                    dir: 'ltr',
                    style: 'text-align: left;',
                },
                images_upload_handler: (blobInfo) => uploadEditorImage(blobInfo, imageUploadUrl, authToken),
                mathTypeParameters: {
                    editorParameters: {
                        language: 'ru',
                    },
                },
                setup: (editor) => {
                    editor.on('init', () => {
                        applyEditorLtr(editor);
                    });

                    editor.on('SetContent', () => {
                        applyEditorLtr(editor);
                    });
                },
                block_formats: 'Paragraph=p; Heading 2=h2; Heading 3=h3; Preformatted=pre',
                content_style:
                    'body { direction: ltr; text-align: left; unicode-bidi: plaintext; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 14px; line-height: 1.6; } p, div, li, td, th, h1, h2, h3, blockquote, pre { direction: ltr; text-align: left; unicode-bidi: plaintext; } pre { white-space: pre; tab-size: 4; -moz-tab-size: 4; } img { max-width: 100%; height: auto; }',
            }}
        />
    );
}
