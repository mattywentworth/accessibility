/**
 * Applies saved Dyslexia Assist font settings across every page.
 * Settings are stored in localStorage by dyslexia-assist.js on the settings page.
 */
(function () {
    var STORAGE_KEY = 'dyslexiaAssistSettings';
    var FONT_CLASS = 'dyslexia-readable-font';
    var CSS_VAR = '--dyslexia-readable-font-stack';

    var FONT_STACKS = {
        opendyslexic: "'OpenDyslexic', sans-serif",
        lexend: "'Lexend', sans-serif",
        atkinson: "'Atkinson Hyperlegible', sans-serif",
        andika: "'Andika', sans-serif",
        'comic-sans': "'Comic Sans MS', 'Comic Sans', cursive"
    };

    var DEFAULTS = {
        readableFont: 'opendyslexic',
        applyAll: false,
        headers: false,
        paragraphs: false,
        buttons: false,
        links: false,
        labels: false,
        navigation: false,
        inputs: false
    };

    function normalizeReadableFont(id) {
        if (id && Object.prototype.hasOwnProperty.call(FONT_STACKS, id)) {
            return id;
        }
        return 'opendyslexic';
    }

    function applyReadableFontStack(fontId) {
        var id = normalizeReadableFont(fontId);
        var stack = FONT_STACKS[id];
        document.documentElement.style.setProperty(CSS_VAR, stack);
        return id;
    }

    function loadSettings() {
        var settings = Object.assign({}, DEFAULTS);
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                Object.assign(settings, JSON.parse(raw));
            }
        } catch (e) {
            console.warn('Could not load dyslexia settings from localStorage:', e);
        }
        settings.readableFont = normalizeReadableFont(settings.readableFont);
        return settings;
    }

    function applyToDocument(settings) {
        if (!document.body) return;

        applyReadableFontStack(settings.readableFont);

        if (settings.applyAll) {
            document.body.classList.add(FONT_CLASS);
            return;
        }

        document.body.classList.remove(FONT_CLASS);

        function toggleSelector(selector, enabled) {
            document.querySelectorAll(selector).forEach(function (el) {
                if (enabled) {
                    el.classList.add(FONT_CLASS);
                } else {
                    el.classList.remove(FONT_CLASS);
                }
            });
        }

        toggleSelector('h1, h2, h3, h4, h5, h6', !!settings.headers);
        toggleSelector('p', !!settings.paragraphs);
        toggleSelector('button, .btn', !!settings.buttons);
        toggleSelector('a', !!settings.links);
        toggleSelector('label', !!settings.labels);
        toggleSelector('nav, .nav-link, .nav-logo', !!settings.navigation);
        toggleSelector('input, textarea, select', !!settings.inputs);
    }

    function init() {
        applyToDocument(loadSettings());
    }

    window.DyslexiaApply = {
        STORAGE_KEY: STORAGE_KEY,
        FONT_CLASS: FONT_CLASS,
        CSS_VAR: CSS_VAR,
        FONT_STACKS: FONT_STACKS,
        DEFAULTS: DEFAULTS,
        loadSettings: loadSettings,
        applyToDocument: applyToDocument,
        applyReadableFontStack: applyReadableFontStack,
        normalizeReadableFont: normalizeReadableFont
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
