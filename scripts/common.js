/**
 * DeepShare common utilities shared by content scripts.
 */
(function () {
    'use strict';

    const DEFAULT_TIMESTAMP_OPTIONS = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };

    function getTimestamp(options = {}) {
        const locale = options.locale || 'zh-CN';
        const formatOptions = Object.assign({}, DEFAULT_TIMESTAMP_OPTIONS);
        if (options.timeZone) {
            formatOptions.timeZone = options.timeZone;
        }

        return new Date()
            .toLocaleString(locale, formatOptions)
            .replace(/[\/\s:]/g, '-')
            .replace(',', '');
    }

    function sanitizeFilename(name, options = {}) {
        const allowHyphen = options.allowHyphen !== false;
        const pattern = allowHyphen
            ? /[^a-zA-Z0-9_\u4e00-\u9fa5\-]/g
            : /[^a-zA-Z0-9_\u4e00-\u9fa5]/g;
        return String(name || '').replace(pattern, '');
    }

    function getContentFilenameSeed(content, options = {}) {
        if (!content || typeof content !== 'string') {
            return '';
        }

        const lines = content.split('\n')
            .map(line => line.trim())
            .filter(Boolean);
        let seed = lines[0] || '';
        if (options.stripMarkdownHeading) {
            seed = seed.replace(/^#+\s*/, '');
        }

        return sanitizeFilename(
            seed.substring(0, options.contentMaxLength || 10).trim(),
            { allowHyphen: options.allowHyphen }
        );
    }

    function generateFilename(content, options = {}) {
        const timestamp = getTimestamp(options);
        const fallback = options.fallbackPrefix || 'document';

        if (options.title && typeof options.title === 'string') {
            const titleSeed = sanitizeFilename(
                options.title.trim().substring(0, options.titleMaxLength || 50).trim(),
                { allowHyphen: options.allowHyphen }
            );
            if (titleSeed) {
                return `${titleSeed}_${timestamp}`;
            }
        }

        const contentSeed = getContentFilenameSeed(content, options);
        return `${contentSeed || fallback}_${timestamp}`;
    }

    window.DeepShareUtils = Object.assign(window.DeepShareUtils || {}, {
        generateFilename,
        getTimestamp,
        sanitizeFilename
    });
})();
