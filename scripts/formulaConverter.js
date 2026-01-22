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

    function cleanMathML(mathmlString) {
        // Parse the MathML string
        const parser = new DOMParser();
        const doc = parser.parseFromString(mathmlString, 'text/xml');
        const mathElement = doc.querySelector('math');
        
        if (!mathElement) return mathmlString;
        
        // Remove all data-semantic-* and data-latex attributes
        const allElements = mathElement.querySelectorAll('*');
        allElements.forEach(el => {
            Array.from(el.attributes).forEach(attr => {
                if (attr.name.startsWith('data-semantic') || attr.name === 'data-latex') {
                    el.removeAttribute(attr.name);
                }
            });
        });
        
        // Remove invisible operators (&#x2062; = invisible times, &#x2061; = apply function)
        const operators = mathElement.querySelectorAll('mo');
        operators.forEach(mo => {
            const content = mo.textContent;
            // Check for invisible operators: U+2061 (function application), U+2062 (invisible times), 
            // U+2063 (invisible separator), U+2064 (invisible plus)
            if (content === '\u2061' || content === '\u2062' || content === '\u2063' || content === '\u2064') {
                mo.remove();
            }
        });
        
        // Serialize back to string
        const serializer = new XMLSerializer();
        return serializer.serializeToString(mathElement);
    }

    function convertWithMathJax(latexCode, displayMode) {
        try {
            if (window.MathJax && window.MathJax.tex2mml) {
                const mathml = MathJax.tex2mml(latexCode, { display: displayMode });
                if (mathml) {
                    const cleanedMathML = cleanMathML(mathml);
                    return { success: true, mathml: cleanedMathML };
                }
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
        const engine = options.engine || 'mathjax';

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

