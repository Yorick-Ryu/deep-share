/**
 * Offscreen document for LaTeX to MathML conversion
 * Supports both MathJax and KaTeX engines
 */

// Engine ready states
let mathJaxReady = false;
let katexReady = false;

function waitForMathJax() {
    return new Promise((resolve) => {
        if (window.MathJax && window.MathJax.tex2mml) {
            mathJaxReady = true;
            resolve();
            return;
        }
        
        const checkMathJax = setInterval(() => {
            if (window.MathJax && window.MathJax.tex2mml) {
                clearInterval(checkMathJax);
                mathJaxReady = true;
                console.debug('DeepShare Offscreen: MathJax ready');
                resolve();
            }
        }, 100);
        
        // Timeout after 10 seconds
        setTimeout(() => {
            clearInterval(checkMathJax);
            if (!mathJaxReady) {
                console.error('DeepShare Offscreen: MathJax failed to load');
            }
            resolve();
        }, 10000);
    });
}

function waitForKaTeX() {
    return new Promise((resolve) => {
        if (window.katex) {
            katexReady = true;
            console.debug('DeepShare Offscreen: KaTeX ready');
            resolve();
            return;
        }
        
        const checkKaTeX = setInterval(() => {
            if (window.katex) {
                clearInterval(checkKaTeX);
                katexReady = true;
                console.debug('DeepShare Offscreen: KaTeX ready');
                resolve();
            }
        }, 100);
        
        // Timeout after 5 seconds
        setTimeout(() => {
            clearInterval(checkKaTeX);
            if (!katexReady) {
                console.error('DeepShare Offscreen: KaTeX failed to load');
            }
            resolve();
        }, 5000);
    });
}

// Convert LaTeX to MathML using MathJax
function convertWithMathJax(latexCode, displayMode = true) {
    try {
        if (window.MathJax && window.MathJax.tex2mml) {
            const mathml = MathJax.tex2mml(latexCode, {
                display: displayMode
            });
            
            if (mathml) {
                return { success: true, mathml: mathml };
            }
        }
        
        return { success: false, error: 'MathJax not available', fallback: latexCode };
    } catch (error) {
        console.error('MathJax conversion error:', error);
        return { success: false, error: error.message, fallback: latexCode };
    }
}

// Convert LaTeX to MathML using KaTeX
function convertWithKaTeX(latexCode, displayMode = true) {
    try {
        if (window.katex) {
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
        console.error('KaTeX conversion error:', error);
        return { success: false, error: error.message, fallback: latexCode };
    }
}

// Convert LaTeX to MathML using specified engine
function convertLatexToMathML(latexCode, displayMode = true, engine = 'mathjax') {
    if (engine === 'katex') {
        const result = convertWithKaTeX(latexCode, displayMode);
        // Fallback to MathJax if KaTeX fails
        if (!result.success && mathJaxReady) {
            return convertWithMathJax(latexCode, displayMode);
        }
        return result;
    } else {
        // Default to MathJax
        const result = convertWithMathJax(latexCode, displayMode);
        // Fallback to KaTeX if MathJax fails
        if (!result.success && katexReady) {
            return convertWithKaTeX(latexCode, displayMode);
        }
        return result;
    }
}

// Listen for messages - only handle messages targeted at offscreen
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Only handle messages targeted at offscreen document
    if (message.target !== 'offscreen') {
        return false;
    }
    
    if (message.action === 'convertLatexToMathML') {
        const { latex, displayMode, engine } = message;
        
        // Ensure engines are ready before converting
        const engineToUse = engine || 'mathjax';
        const waitPromise = engineToUse === 'katex' 
            ? (katexReady ? Promise.resolve() : waitForKaTeX())
            : (mathJaxReady ? Promise.resolve() : waitForMathJax());
        
        waitPromise.then(() => {
            const result = convertLatexToMathML(latex, displayMode, engineToUse);
            sendResponse(result);
        });
        
        return true; // Keep the message channel open for async response
    }
    
    if (message.action === 'ping') {
        sendResponse({ 
            mathJaxReady: mathJaxReady,
            katexReady: katexReady
        });
        return true;
    }
    
    return false;
});

// Initialize both engines
Promise.all([waitForMathJax(), waitForKaTeX()]).then(() => {
    console.debug('DeepShare Offscreen: Initialized (MathJax:', mathJaxReady, ', KaTeX:', katexReady, ')');
});
