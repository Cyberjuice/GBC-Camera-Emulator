/**
 * GameBoy Color Simulator - Browser Compatibility Test
 * This script tests browser compatibility for key features used in the simulator
 */

// Create a test report object to store results
const compatibilityReport = {
    browser: {
        name: '',
        version: '',
        userAgent: '',
        platform: '',
        mobile: false,
        tablet: false
    },
    features: {
        mediaDevices: false,
        getUserMedia: false,
        canvas: false,
        canvasImageData: false,
        flexbox: false,
        touchEvents: false,
        orientation: false
    },
    performance: {
        canvasRenderingSpeed: 0,
        filterProcessingTime: 0
    },
    issues: []
};

// Detect browser information
function detectBrowser() {
    const ua = navigator.userAgent;
    compatibilityReport.browser.userAgent = ua;
    compatibilityReport.browser.platform = navigator.platform;
    
    // Detect if mobile or tablet
    const isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(ua);
    
    compatibilityReport.browser.mobile = isMobile && !isTablet;
    compatibilityReport.browser.tablet = isTablet;
    
    // Detect browser name and version
    if (ua.indexOf("Edge") > -1 || ua.indexOf("Edg") > -1) {
        compatibilityReport.browser.name = "Edge";
    } else if (ua.indexOf("Firefox") > -1) {
        compatibilityReport.browser.name = "Firefox";
    } else if (ua.indexOf("Safari") > -1 && ua.indexOf("Chrome") === -1) {
        compatibilityReport.browser.name = "Safari";
    } else if (ua.indexOf("Chrome") > -1) {
        compatibilityReport.browser.name = "Chrome";
    } else {
        compatibilityReport.browser.name = "Unknown";
    }
    
    // Extract version (simplified)
    const versionMatch = ua.match(/(Chrome|Safari|Firefox|Edge|Edg)\/(\d+\.\d+)/);
    compatibilityReport.browser.version = versionMatch ? versionMatch[2] : "Unknown";
}

// Test MediaDevices API support
function testMediaDevices() {
    // Check if MediaDevices API is supported
    if (navigator.mediaDevices) {
        compatibilityReport.features.mediaDevices = true;
        
        // Check if getUserMedia is supported
        if (navigator.mediaDevices.getUserMedia) {
            compatibilityReport.features.getUserMedia = true;
        } else {
            compatibilityReport.issues.push("MediaDevices API is available but getUserMedia is not supported");
        }
    } else {
        compatibilityReport.issues.push("MediaDevices API is not supported");
    }
    
    // Check for older getUserMedia implementations
    if (!compatibilityReport.features.getUserMedia) {
        if (navigator.getUserMedia || navigator.webkitGetUserMedia || 
            navigator.mozGetUserMedia || navigator.msGetUserMedia) {
            compatibilityReport.issues.push("Only legacy getUserMedia API is available (non-promise based)");
        }
    }
}

// Test Canvas support
function testCanvas() {
    try {
        const canvas = document.createElement('canvas');
        if (canvas.getContext) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                compatibilityReport.features.canvas = true;
                
                // Test image data manipulation
                canvas.width = 100;
                canvas.height = 100;
                const imageData = ctx.getImageData(0, 0, 10, 10);
                if (imageData && imageData.data) {
                    compatibilityReport.features.canvasImageData = true;
                } else {
                    compatibilityReport.issues.push("Canvas ImageData manipulation is not fully supported");
                }
            } else {
                compatibilityReport.issues.push("Canvas 2D context is not supported");
            }
        } else {
            compatibilityReport.issues.push("Canvas is not supported");
        }
    } catch (e) {
        compatibilityReport.issues.push(`Canvas error: ${e.message}`);
    }
}

// Test CSS features (flexbox)
function testCSSFeatures() {
    const testEl = document.createElement('div');
    
    // Test flexbox support
    if ('flexBasis' in testEl.style || 
        'webkitFlexBasis' in testEl.style || 
        'mozFlexBasis' in testEl.style) {
        compatibilityReport.features.flexbox = true;
    } else {
        compatibilityReport.issues.push("Flexbox is not fully supported");
    }
}

// Test touch events
function testTouchEvents() {
    compatibilityReport.features.touchEvents = 'ontouchstart' in window || 
        navigator.maxTouchPoints > 0 || 
        navigator.msMaxTouchPoints > 0;
        
    if (!compatibilityReport.features.touchEvents && 
        (compatibilityReport.browser.mobile || compatibilityReport.browser.tablet)) {
        compatibilityReport.issues.push("Touch events not detected on a mobile/tablet device");
    }
}

// Test orientation support
function testOrientation() {
    compatibilityReport.features.orientation = 
        typeof window.orientation !== 'undefined' || 
        typeof window.screen.orientation !== 'undefined' ||
        typeof window.matchMedia('(orientation: portrait)').matches !== 'undefined';
        
    if (!compatibilityReport.features.orientation && 
        (compatibilityReport.browser.mobile || compatibilityReport.browser.tablet)) {
        compatibilityReport.issues.push("Screen orientation detection not fully supported");
    }
}

// Test canvas rendering performance
function testCanvasPerformance() {
    return new Promise(resolve => {
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 288;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
            compatibilityReport.issues.push("Cannot test canvas performance - context not available");
            resolve();
            return;
        }
        
        // Test basic rendering speed
        const pixelCount = 320 * 288;
        const imageData = ctx.createImageData(320, 288);
        const data = imageData.data;
        
        const startTime = performance.now();
        let frames = 0;
        const testDuration = 1000; // 1 second test
        
        function renderFrame() {
            // Simple pixel manipulation (similar to GameBoy filters)
            for (let i = 0; i < pixelCount * 4; i += 4) {
                data[i] = Math.random() * 255;     // R
                data[i + 1] = Math.random() * 255; // G
                data[i + 2] = Math.random() * 255; // B
                data[i + 3] = 255;                 // A
            }
            
            ctx.putImageData(imageData, 0, 0);
            frames++;
            
            const elapsed = performance.now() - startTime;
            if (elapsed < testDuration) {
                requestAnimationFrame(renderFrame);
            } else {
                compatibilityReport.performance.canvasRenderingSpeed = Math.round((frames / elapsed) * 1000);
                
                // Test filter processing time (GameBoy-like filter)
                const filterStart = performance.now();
                applyGameboyFilter(imageData);
                const filterEnd = performance.now();
                
                compatibilityReport.performance.filterProcessingTime = Math.round(filterEnd - filterStart);
                
                if (compatibilityReport.performance.canvasRenderingSpeed < 30) {
                    compatibilityReport.issues.push(`Low canvas rendering performance: ${compatibilityReport.performance.canvasRenderingSpeed} FPS`);
                }
                
                if (compatibilityReport.performance.filterProcessingTime > 50) {
                    compatibilityReport.issues.push(`Slow filter processing: ${compatibilityReport.performance.filterProcessingTime}ms`);
                }
                
                resolve();
            }
        }
        
        renderFrame();
    });
}

// Apply a GameBoy-like filter (simplified version for testing)
function applyGameboyFilter(imageData) {
    const data = imageData.data;
    const gameboyPalette = [
        [15, 56, 15],    // Darkest green
        [48, 98, 48],    // Dark green
        [139, 172, 15],  // Light green
        [155, 188, 15]   // Lightest green
    ];
    
    for (let i = 0; i < data.length; i += 4) {
        // Convert to grayscale first
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        
        // Map to GameBoy palette (4 shades)
        let colorIndex;
        if (avg < 64) {
            colorIndex = 0;
        } else if (avg < 128) {
            colorIndex = 1;
        } else if (avg < 192) {
            colorIndex = 2;
        } else {
            colorIndex = 3;
        }
        
        // Apply GameBoy color
        data[i] = gameboyPalette[colorIndex][0];
        data[i + 1] = gameboyPalette[colorIndex][1];
        data[i + 2] = gameboyPalette[colorIndex][2];
    }
}

// Run all tests and generate report
async function runCompatibilityTests() {
    detectBrowser();
    testMediaDevices();
    testCanvas();
    testCSSFeatures();
    testTouchEvents();
    testOrientation();
    
    // Run performance tests
    await testCanvasPerformance();
    
    // Generate summary
    const summary = {
        browser: `${compatibilityReport.browser.name} ${compatibilityReport.browser.version} on ${compatibilityReport.browser.platform}`,
        deviceType: compatibilityReport.browser.mobile ? "Mobile" : 
                   compatibilityReport.browser.tablet ? "Tablet" : "Desktop",
        supportLevel: compatibilityReport.issues.length === 0 ? "Full Support" : 
                     compatibilityReport.issues.length <= 2 ? "Partial Support" : "Limited Support",
        criticalIssues: compatibilityReport.features.canvas && compatibilityReport.features.mediaDevices ? 
                       "None" : "Critical features missing",
        performance: compatibilityReport.performance.canvasRenderingSpeed >= 50 ? "Excellent" :
                    compatibilityReport.performance.canvasRenderingSpeed >= 30 ? "Good" :
                    compatibilityReport.performance.canvasRenderingSpeed >= 15 ? "Fair" : "Poor"
    };
    
    compatibilityReport.summary = summary;
    
    // Output report to console
    console.log("GameBoy Color Simulator - Browser Compatibility Report");
    console.log("=====================================================");
    console.log(`Browser: ${summary.browser}`);
    console.log(`Device Type: ${summary.deviceType}`);
    console.log(`Support Level: ${summary.supportLevel}`);
    console.log(`Critical Issues: ${summary.criticalIssues}`);
    console.log(`Performance: ${summary.performance}`);
    console.log("\nFeature Support:");
    console.log(compatibilityReport.features);
    console.log("\nPerformance Metrics:");
    console.log(compatibilityReport.performance);
    console.log("\nIssues Detected:");
    if (compatibilityReport.issues.length > 0) {
        compatibilityReport.issues.forEach((issue, i) => {
            console.log(`${i+1}. ${issue}`);
        });
    } else {
        console.log("No issues detected");
    }
    
    // Return the report object for further processing
    return compatibilityReport;
}

// Export the test function
window.runGameBoyCompatibilityTest = runCompatibilityTests;