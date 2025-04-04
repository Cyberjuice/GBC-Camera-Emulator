/**
 * GameBoy Color Simulator - Enhanced Script with Cross-Browser Compatibility
 * This script extends the original functionality with improved browser support
 */

// MediaDevices API Polyfill
(function() {
    // Check if we need to polyfill
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // Modern browsers already support this
        return;
    }
    
    // Older browsers might not have mediaDevices at all
    navigator.mediaDevices = navigator.mediaDevices || {};
    
    // Some browsers partially implement mediaDevices
    // We need a consistent getUserMedia function
    navigator.mediaDevices.getUserMedia = function(constraints) {
        // First, get the legacy getUserMedia if it exists
        const getUserMedia = navigator.getUserMedia ||
                            navigator.webkitGetUserMedia ||
                            navigator.mozGetUserMedia ||
                            navigator.msGetUserMedia;
        
        // If no getUserMedia exists, return a rejected promise
        if (!getUserMedia) {
            return Promise.reject(new Error('getUserMedia is not supported in this browser'));
        }
        
        // Otherwise, wrap the legacy getUserMedia call in a Promise
        return new Promise(function(resolve, reject) {
            getUserMedia.call(navigator, constraints, resolve, reject);
        });
    };
})();

// Browser feature detection
const browserSupport = {
    // Check if running on iOS
    isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
    
    // Check if running on Safari
    isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
    
    // Check if this is a mobile device
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    
    // Check for canvas support
    hasCanvas: function() {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext && canvas.getContext('2d'));
    },
    
    // Check for MediaDevices API support
    hasMediaDevices: function() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    },
    
    // Check for touch support
    hasTouch: function() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
    },
    
    // Check for orientation support
    hasOrientation: function() {
        return typeof window.orientation !== 'undefined' || 
               typeof window.screen.orientation !== 'undefined' ||
               typeof window.matchMedia('(orientation: portrait)').matches !== 'undefined';
    }
};

// Performance monitoring
const performanceMonitor = {
    frameRates: [],
    lastFrameTime: 0,
    
    // Start monitoring frame rate
    startMonitoring: function() {
        this.frameRates = [];
        this.lastFrameTime = performance.now();
        this.isMonitoring = true;
    },
    
    // Record a frame
    recordFrame: function() {
        if (!this.isMonitoring) return;
        
        const now = performance.now();
        const frameTime = now - this.lastFrameTime;
        const fps = 1000 / frameTime;
        
        this.frameRates.push(fps);
        
        // Keep only the last 60 frames
        if (this.frameRates.length > 60) {
            this.frameRates.shift();
        }
        
        this.lastFrameTime = now;
    },
    
    // Get average frame rate
    getAverageFrameRate: function() {
        if (this.frameRates.length === 0) return 0;
        
        const sum = this.frameRates.reduce((a, b) => a + b, 0);
        return Math.round(sum / this.frameRates.length);
    },
    
    // Stop monitoring
    stopMonitoring: function() {
        this.isMonitoring = false;
    }
};

// Enhanced error handling
function showCompatibilityError(message, critical = false) {
    const errorMessage = document.getElementById('errorMessage');
    const notification = document.getElementById('notification');
    
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        errorMessage.className = critical ? 'error-message critical' : 'error-message';
    }
    
    if (notification) {
        notification.textContent = message;
        notification.className = 'notification show';
        
        // Hide notification after 5 seconds
        setTimeout(() => {
            notification.className = 'notification';
        }, 5000);
    }
    
    // Log to console as well
    console.error(`GameBoy Simulator Error: ${message}`);
}

// Device orientation handler
function handleOrientation() {
    // Check if we're on a mobile or tablet device
    if (browserSupport.isMobile) {
        const isPortrait = window.matchMedia("(orientation: portrait)").matches;
        const orientationWarning = document.getElementById('orientationWarning');
        
        // Create orientation warning if it doesn't exist
        if (!orientationWarning && isPortrait) {
            const warning = document.createElement('div');
            warning.id = 'orientationWarning';
            warning.className = 'orientation-warning';
            warning.innerHTML = `
                <div class="orientation-content">
                    <div class="rotate-icon">↻</div>
                    <p>Please rotate your device to landscape mode for the best experience</p>
                </div>
            `;
            document.body.appendChild(warning);
        } else if (orientationWarning && !isPortrait) {
            orientationWarning.style.display = 'none';
        } else if (orientationWarning && isPortrait) {
            orientationWarning.style.display = 'flex';
        }
    }
}

// Enhanced camera initialization with fallbacks
async function initializeCamera(videoElement, canvasElement, statusIndicator) {
    // Update status
    if (statusIndicator) {
        statusIndicator.textContent = 'Initializing camera...';
    }
    
    // Check for canvas support first
    if (!browserSupport.hasCanvas()) {
        showCompatibilityError('Your browser does not support canvas, which is required for this application.', true);
        return false;
    }
    
    // Check for MediaDevices API support
    if (!browserSupport.hasMediaDevices()) {
        showCompatibilityError('Your browser does not support camera access. Try using Chrome, Firefox, or Safari.', true);
        return false;
    }
    
    try {
        // Request camera with fallback options
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user'
            }
        });
        
        // Connect the stream to the video element
        videoElement.srcObject = stream;
        
        // Wait for video to be ready
        await new Promise((resolve) => {
            videoElement.onloadedmetadata = () => {
                resolve();
            };
        });
        
        // Start playing the video
        await videoElement.play();
        
        // Update canvas dimensions based on video
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
        
        // Update status
        if (statusIndicator) {
            statusIndicator.textContent = 'Camera active';
        }
        
        return true;
    } catch (error) {
        // Handle specific error types
        let errorMessage = 'Camera access failed: ';
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            errorMessage += 'Permission denied. Please allow camera access and try again.';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            errorMessage += 'No camera found on your device.';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            errorMessage += 'Camera is already in use by another application.';
        } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
            errorMessage += 'Camera constraints not satisfied. Try a different camera.';
        } else {
            errorMessage += error.message || 'Unknown error occurred.';
        }
        
        showCompatibilityError(errorMessage, true);
        
        // Update status
        if (statusIndicator) {
            statusIndicator.textContent = 'Camera error';
        }
        
        return false;
    }
}

// Optimized filter processing
function applyFilter(canvasContext, filterType, width, height, performanceMode = false) {
    // Get image data from canvas
    const imageData = canvasContext.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Performance mode uses lower quality but faster processing
    const skipFactor = performanceMode ? 2 : 1;
    
    // GameBoy Color palette
    const gameboyPalette = [
        [15, 56, 15],    // Darkest green
        [48, 98, 48],    // Dark green
        [139, 172, 15],  // Light green
        [155, 188, 15]   // Lightest green
    ];
    
    // Process the image based on filter type
    switch (filterType) {
        case 'gameboy':
            // Apply GameBoy filter (4 shades of green)
            for (let i = 0; i < data.length; i += 4 * skipFactor) {
                // Calculate grayscale value
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
                
                // If in performance mode, copy the pixel to adjacent pixels
                if (performanceMode && i + 4 < data.length) {
                    data[i + 4] = data[i];
                    data[i + 5] = data[i + 1];
                    data[i + 6] = data[i + 2];
                }
            }
            break;
            
        case 'bw':
            // Apply black and white filter
            for (let i = 0; i < data.length; i += 4 * skipFactor) {
                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                data[i] = avg;
                data[i + 1] = avg;
                data[i + 2] = avg;
                
                // If in performance mode, copy the pixel to adjacent pixels
                if (performanceMode && i + 4 < data.length) {
                    data[i + 4] = avg;
                    data[i + 5] = avg;
                    data[i + 6] = avg;
                }
            }
            break;
            
        case 'pixelated':
            // Apply pixelated filter
            const pixelSize = performanceMode ? 8 : 4;
            
            // Process in blocks
            for (let y = 0; y < height; y += pixelSize) {
                for (let x = 0; x < width; x += pixelSize) {
                    // Get the color of the first pixel in the block
                    const baseIndex = (y * width + x) * 4;
                    const r = data[baseIndex];
                    const g = data[baseIndex + 1];
                    const b = data[baseIndex + 2];
                    
                    // Apply this color to all pixels in the block
                    for (let blockY = 0; blockY < pixelSize && y + blockY < height; blockY++) {
                        for (let blockX = 0; blockX < pixelSize && x + blockX < width; blockX++) {
                            const idx = ((y + blockY) * width + (x + blockX)) * 4;
                            data[idx] = r;
                            data[idx + 1] = g;
                            data[idx + 2] = b;
                        }
                    }
                }
            }
            break;
            
        case 'original':
            // No filter, keep original
            break;
    }
    
    // Put the modified image data back on the canvas
    canvasContext.putImageData(imageData, 0, 0);
}

// Responsive layout handler
function handleResponsiveLayout() {
    const gameboy = document.querySelector('.gameboy-container');
    const gameScreen = document.getElementById('gameScreen');
    
    if (!gameboy || !gameScreen) return;
    
    // Check if we're on a mobile device
    if (browserSupport.isMobile) {
        // Adjust layout based on orientation
        const isLandscape = window.matchMedia("(orientation: landscape)").matches;
        
        if (isLandscape) {
            // Optimize for landscape on mobile
            gameboy.classList.add('landscape-mode');
            gameboy.classList.remove('portrait-mode');
        } else {
            // Optimize for portrait on mobile
            gameboy.classList.add('portrait-mode');
            gameboy.classList.remove('landscape-mode');
        }
    } else {
        // Desktop layout
        gameboy.classList.remove('landscape-mode', 'portrait-mode');
    }
    
    // Handle iPad-specific adjustments
    if (/iPad/.test(navigator.userAgent)) {
        gameboy.classList.add('ipad-device');
    }
}

// Performance mode toggle
function setupPerformanceMode() {
    // Create performance toggle if it doesn't exist
    if (!document.getElementById('performanceToggle')) {
        const controlsContainer = document.querySelector('.controls-container');
        
        if (controlsContainer) {
            const performanceControl = document.createElement('div');
            performanceControl.className = 'performance-control';
            performanceControl.innerHTML = `
                <label class="performance-label">
                    <input type="checkbox" id="performanceToggle"> Performance Mode
                </label>
            `;
            
            controlsContainer.appendChild(performanceControl);
            
            // Add event listener
            document.getElementById('performanceToggle').addEventListener('change', function(e) {
                window.gameboy = window.gameboy || {};
                window.gameboy.performanceMode = e.target.checked;
                
                // Show notification
                const notification = document.getElementById('notification');
                if (notification) {
                    notification.textContent = e.target.checked ? 
                        'Performance mode enabled' : 
                        'Performance mode disabled';
                    notification.className = 'notification show';
                    
                    setTimeout(() => {
                        notification.className = 'notification';
                    }, 3000);
                }
            });
        }
    }
}

// Initialize enhanced features
function initEnhancedFeatures() {
    // Set up event listeners for orientation changes
    window.addEventListener('orientationchange', function() {
        handleOrientation();
        handleResponsiveLayout();
    });
    
    // Also listen for resize events
    window.addEventListener('resize', function() {
        handleOrientation();
        handleResponsiveLayout();
    });
    
    // Initial check
    handleOrientation();
    handleResponsiveLayout();
    
    // Set up performance mode
    setupPerformanceMode();
    
    // Add browser info to footer
    const footer = document.querySelector('.page-footer');
    if (footer) {
        const browserInfo = document.createElement('p');
        browserInfo.className = 'browser-info';
        browserInfo.textContent = `Detected browser: ${navigator.userAgent.match(/(?:Chrome|Firefox|Safari|Edge|MSIE|Trident)[\/\s](\d+)/)[0] || 'Unknown'}`;
        footer.appendChild(browserInfo);
    }
    
    // Initialize global gameboy object
    window.gameboy = window.gameboy || {};
    window.gameboy.performanceMode = false;
    window.gameboy.browserSupport = browserSupport;
    window.gameboy.performanceMonitor = performanceMonitor;
    window.gameboy.initializeCamera = initializeCamera;
    window.gameboy.applyFilter = applyFilter;
    
    console.log('Enhanced features initialized');
}

// Call initialization when the DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEnhancedFeatures);
} else {
    initEnhancedFeatures();
}