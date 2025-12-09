/**
 * DeepShare Formula Converter
 * Converts LaTeX to MathML using MathJax or KaTeX in the page context.
 * Exposes window.deepShareFormulaConverter.convertLatexToMathML
 */

const deepShareFormulaConverter = (() => {
    let mathJaxReady = false;
    let katexReady = typeof katex !== 'undefined';

    function waitForMathJax() {
        return new Promise((resolve) => {
            if (window.MathJax && window.MathJax.tex2mml) {
                mathJaxReady = true;
                resolve();
                return;
            }
            const check = setInterval(() => {
                if (window.MathJax && window.MathJax.tex2mml) {
                    clearInterval(check);
                    mathJaxReady = true;
                    resolve();
                }
            }, 100);
            setTimeout(() => {
                clearInterval(check);
                resolve();
            }, 8000);
        });
    }

    function waitForKaTeX() {
        return new Promise((resolve) => {
            if (typeof katex !== 'undefined') {
                katexReady = true;
                resolve();
                return;
            }
            const check = setInterval(() => {
                if (typeof katex !== 'undefined') {
                    clearInterval(check);
                    katexReady = true;
                    resolve();
                }
            }, 100);
            setTimeout(() => {
                clearInterval(check);
                resolve();
            }, 5000);
        });
    }

    function convertWithMathJax(latexCode, displayMode) {
        try {
            if (window.MathJax && window.MathJax.tex2mml) {
                const mathml = MathJax.tex2mml(latexCode, { display: displayMode });
                if (mathml) return { success: true, mathml };
            }
            return { success: false, error: 'MathJax not available', fallback: latexCode };
        } catch (error) {
            return { success: false, error: error.message, fallback: latexCode };
        }
    }

    function convertWithKaTeX(latexCode, displayMode) {
        try {
            if (typeof katex !== 'undefined') {
                const container = document.createElement('div');
                katex.render(latexCode, container, {
                    output: 'mathml',
                    throwOnError: false,
                    displayMode: displayMode
                });
                const mathmlElement = container.querySelector('math');
                if (mathmlElement) {
                    return { success: true, mathml: mathmlElement.outerHTML };
                }
            }
            return { success: false, error: 'KaTeX not available', fallback: latexCode };
        } catch (error) {
            return { success: false, error: error.message, fallback: latexCode };
        }
    }

    async function convertLatexToMathML(latexCode, options = {}) {
        const displayMode = options.displayMode !== false;
        const engine = options.engine || 'katex';

        if (engine === 'katex') {
            await waitForKaTeX();
            const res = convertWithKaTeX(latexCode, displayMode);
            if (res.success) return res.mathml;
            // fallback to MathJax
            await waitForMathJax();
            const mj = convertWithMathJax(latexCode, displayMode);
            return mj.success ? mj.mathml : mj.fallback || latexCode;
        }

        // default MathJax
        await waitForMathJax();
        const res = convertWithMathJax(latexCode, displayMode);
        if (res.success) return res.mathml;
        // fallback to KaTeX
        await waitForKaTeX();
        const kt = convertWithKaTeX(latexCode, displayMode);
        return kt.success ? kt.mathml : kt.fallback || latexCode;
    }

    return { convertLatexToMathML };
})();

window.deepShareFormulaConverter = deepShareFormulaConverter;

