/**
 * MathJax configuration for DeepShare extension
 * This must be loaded BEFORE mathjax4.js
 * 
 * Custom build includes ALL extensions pre-bundled, but only
 * packages listed below will be activated. No dynamic loading.
 * 
 * Available packages in this build:
 *   ams, action, amscd, bbox, boldsymbol, braket, bussproofs,
 *   cancel, cases, centernot, color, colortbl, configmacros,
 *   enclose, extpfeil, gensymb, html, mathtools, mhchem,
 *   newcommand, noerrors, noundefined, physics, tagformat,
 *   textcomp, textmacros, unicode, upgreek, verb
 */
window.MathJax = {
    startup: {
        typeset: false,
        ready: () => {
            MathJax.startup.defaultReady();
            console.debug('DeepShare: MathJax initialized');
        }
    },
    tex: {
        // Select which packages to activate (all are pre-bundled)
        // Modify this array to enable/disable specific extensions
        packages: {
            '[+]': [
                // === Core (always needed) ===
                'ams',           // AMS math symbols & environments
                'newcommand',    // \newcommand, \renewcommand
                'configmacros',  // Pre-configured macros
                
                // === Common extensions ===
                'boldsymbol',    // \boldsymbol for bold math
                'cancel',        // \cancel, \bcancel strikethrough
                'mathtools',     // Enhanced math tools
                'extpfeil',      // Extensible arrows
                
                // === Specialized (enable as needed) ===
                'color',         // \color, \textcolor
                'mhchem',        // Chemistry: \ce{H2O}
                // 'physics',       // Physics notation
                // 'braket',     // Dirac notation: \bra, \ket
                // 'cases',      // Extended cases environment
                // 'enclose',    // \enclose for boxing
                // 'unicode',    // Unicode character input
                // 'amscd',      // Commutative diagrams
                // 'bbox',       // Bounding boxes
                // 'gensymb',    // Generic symbols
                // 'upgreek',    // Upright Greek letters
            ],
            '[-]': ['autoload', 'require']  // Disable dynamic loading
        },
        inlineMath: [],
        displayMath: [],
        processEscapes: false,
        processEnvironments: true,
        processRefs: true
    },
    options: {
        enableMenu: false,
        renderActions: {}
    },
    chtml: {
        adaptiveCSS: false
    }
};
