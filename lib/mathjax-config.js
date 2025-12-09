/**
 * MathJax configuration for DeepShare extension
 * This must be loaded BEFORE mathjax.min.js
 */
window.MathJax = {
    // Disable automatic typesetting - we only use tex2mml programmatically
    startup: {
        typeset: false,
        ready: () => {
            MathJax.startup.defaultReady();
            console.debug('DeepShare: MathJax initialized');
        }
    },
    // TeX input processor configuration
    tex: {
        // Common packages for math rendering
        packages: ['base', 'ams', 'newcommand', 'configmacros', 'action', 'boldsymbol', 'braket', 'cancel', 'color', 'enclose', 'extpfeil', 'mhchem', 'physics', 'unicode'],
        // Don't process $ delimiters automatically
        inlineMath: [],
        displayMath: [],
        processEscapes: false,
        processEnvironments: true,
        processRefs: true
    },
    // MathML output configuration
    options: {
        enableMenu: false,
        renderActions: {}
    },
    // Don't add any CSS
    chtml: {
        adaptiveCSS: false
    }
};

