window.captureMessages = async function() {
    const container = document.querySelector('.dad65929');
    if (!container) return null;

    try {
        if (typeof html2canvas === 'undefined') {
            throw new Error('html2canvas not loaded');
        }

        const canvas = await html2canvas(container, {
            backgroundColor: null,
            useCORS: true,
            scale: window.devicePixelRatio,
            allowTaint: true
        });
        
        return canvas.toDataURL('image/png');
    } catch (error) {
        console.error('Screenshot failed:', error);
        return null;
    }
};
