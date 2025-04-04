/**
 * GameBoy Color Simulator - Final Script with Complete Cross-Browser Compatibility
 * This script addresses all identified compatibility issues and implements best practices
 */

// Immediately-invoked function expression for encapsulation
(function() {
    'use strict';
    
    // Global state
    const state = {
        cameraActive: false,
        currentFilter: 'gameboy',
        performanceMode: false,
        showInstructions: true,
        capturedPhotos: [],
        animationFrameId: null,
        lastFrameTime: 0
    };
    
    // DOM elements
    let elements = {};
    
    // Feature detection object
    const features = {
        // Check if canvas is supported
        hasCanvas: function() {
            try {
                const canvas = document.createElement('canvas');
                return !!(canvas.getContext && canvas.getContext('2d'));
            } catch (e) {
                return false;
            }
        },
        
        // Check if MediaDevices API is supported
        hasMediaDevices: function() {
            return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
        },
        
        // Check for legacy getUserMedia
        hasLegacyGetUserMedia: function() {
            return !!(navigator.getUserMedia || 
                     navigator.webkitGetUserMedia || 
                     navigator.mozGetUserMedia || 
                     navigator.msGetUserMedia);
        },
        
        // Check for touch support
        hasTouch: function() {
            return 'ontouchstart' in window || 
                   navigator.maxTouchPoints > 0 || 
                   navigator.msMaxTouchPoints > 0;
        },
        
        // Check for screen orientation API
        hasOrientationAPI: function() {
            return typeof window.orientation !== 'undefined' || 
                   typeof window.screen.orientation !== 'undefined';
        },
        
        // Check for requestAnimationFrame
        hasRequestAnimationFrame: function() {
            return !!(window.requestAnimationFrame || 
                     window.webkitRequestAnimationFrame || 
                     window.mozRequestAnimationFrame);
        },
        
        // Check if this is iOS
        isIOS: function() {
            return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        },
        
        // Check if this is Safari
        isSafari: function() {
            return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        },
        
        // Check if this is a mobile device
        isMobile: function() {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        }
    };
    
    // MediaDevices API Polyfill
    function polyfillMediaDevices() {
        // Check if we need to polyfill
        if (features.hasMediaDevices()) {
            return true; // Modern browsers already support this
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
        
        return features.hasMediaDevices(); // Check if polyfill worked
    }
    
    // RequestAnimationFrame polyfill
    function polyfillRequestAnimationFrame() {
        if (features.hasRequestAnimationFrame()) {
            return true; // Already supported
        }
        
        let lastTime = 0;
        window.requestAnimationFrame = function(callback) {
            const currTime = new Date().getTime();
            const timeToCall = Math.max(0, 16 - (currTime - lastTime));
            const id = window.setTimeout(function() {
                callback(currTime + timeToCall);
            }, timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
        
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
        
        return true;
    }
    
    // Initialize polyfills
    function initPolyfills() {
        const mediaDevicesPolyfilled = polyfillMediaDevices();
        const rafPolyfilled = polyfillRequestAnimationFrame();
        
        if (!mediaDevicesPolyfilled) {
            showError("Your browser doesn't support camera access. Please try a modern browser like Chrome, Firefox, or Safari.");
        }
        
        return {
            mediaDevicesPolyfilled,
            rafPolyfilled
        };
    }
    
    // Show error message
    function showError(message, critical = false) {
        if (elements.errorMessage) {
            elements.errorMessage.textContent = message;
            elements.errorMessage.style.display = 'block';
            elements.errorMessage.className = critical ? 'error-message critical' : 'error-message';
        }
        
        if (elements.notification) {
            elements.notification.textContent = message;
            elements.notification.className = 'notification show';
            
            // Hide notification after 5 seconds
            setTimeout(() => {
                if (elements.notification) {
                    elements.notification.className = 'notification';
                }
            }, 5000);
        }
        
        // Log to console as well
        console.error(`GameBoy Simulator Error: ${message}`);
    }
    
    // Show notification
    function showNotification(message, duration = 3000) {
        if (elements.notification) {
            elements.notification.textContent = message;
            elements.notification.className = 'notification show';
            
            // Hide notification after specified duration
            setTimeout(() => {
                if (elements.notification) {
                    elements.notification.className = 'notification';
                }
            }, duration);
        }
    }
    
    // Initialize camera
    async function initializeCamera() {
        try {
            // Update status
            if (elements.statusIndicator) {
                elements.statusIndicator.textContent = 'Initializing camera...';
            }
            
            // Check for canvas support first
            if (!features.hasCanvas()) {
                showError('Your browser does not support canvas, which is required for this application.', true);
                return false;
            }
            
            // Check for MediaDevices API support
            if (!features.hasMediaDevices()) {
                showError('Your browser does not support camera access. Try using Chrome, Firefox, or Safari.', true);
                return false;
            }
            
            // Request camera with fallback options
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            });
            
            // Connect the stream to the video element
            elements.video.srcObject = stream;
            
            // Set playsinline attribute for iOS compatibility
            elements.video.setAttribute('playsinline', '');
            elements.video.setAttribute('webkit-playsinline', '');
            
            // Wait for video to be ready
            await new Promise((resolve) => {
                elements.video.onloadedmetadata = () => {
                    resolve();
                };
            });
            
            // Start playing the video
            await elements.video.play();
            
            // Update canvas dimensions based on video
            elements.canvas.width = elements.video.videoWidth;
            elements.canvas.height = elements.video.videoHeight;
            
            // Update status
            if (elements.statusIndicator) {
                elements.statusIndicator.textContent = 'Camera active';
            }
            
            // Start rendering frames
            state.cameraActive = true;
            elements.video.classList.remove('hidden');
            
            // Start animation loop
            startAnimationLoop();
            
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
            
            showError(errorMessage, true);
            
            // Update status
            if (elements.statusIndicator) {
                elements.statusIndicator.textContent = 'Camera error';
            }
            
            return false;
        }
    }
    
    // Stop camera
    function stopCamera() {
        try {
            // Stop animation loop
            if (state.animationFrameId) {
                cancelAnimationFrame(state.animationFrameId);
                state.animationFrameId = null;
            }
            
            // Stop video tracks
            if (elements.video && elements.video.srcObject) {
                const tracks = elements.video.srcObject.getTracks();
                tracks.forEach(track => track.stop());
                elements.video.srcObject = null;
            }
            
            // Hide video
            elements.video.classList.add('hidden');
            
            // Update status
            state.cameraActive = false;
            if (elements.statusIndicator) {
                elements.statusIndicator.textContent = 'Camera off';
            }
            
            return true;
        } catch (error) {
            console.error('Error stopping camera:', error);
            return false;
        }
    }
    
    // Start animation loop using requestAnimationFrame
    function startAnimationLoop() {
        // Cancel any existing animation frame
        if (state.animationFrameId) {
            cancelAnimationFrame(state.animationFrameId);
        }
        
        // Function to render a frame
        function renderFrame(timestamp) {
            // Calculate delta time for consistent animations
            if (!state.lastFrameTime) {
                state.lastFrameTime = timestamp;
            }
            const deltaTime = timestamp - state.lastFrameTime;
            state.lastFrameTime = timestamp;
            
            // Only process if camera is active
            if (state.cameraActive) {
                // Draw video to canvas
                const ctx = elements.canvas.getContext('2d');
                ctx.drawImage(elements.video, 0, 0, elements.canvas.width, elements.canvas.height);
                
                // Apply current filter
                applyFilter(ctx, state.currentFilter, elements.canvas.width, elements.canvas.height, state.performanceMode);
                
                // Continue animation loop
                state.animationFrameId = requestAnimationFrame(renderFrame);
            }
        }
        
        // Start the animation loop
        state.animationFrameId = requestAnimationFrame(renderFrame);
    }
    
    // Apply filter to canvas
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
    
    // Capture photo
    function capturePhoto() {
        if (!state.cameraActive) {
            showNotification('Camera is not active. Press START first.');
            return;
        }
        
        try {
            // Create flash effect
            if (elements.flash) {
                elements.flash.classList.add('active');
                setTimeout(() => {
                    elements.flash.classList.remove('active');
                }, 500);
            }
            
            // Capture current canvas state
            const capturedImage = elements.canvas.toDataURL('image/png');
            state.capturedPhotos.push(capturedImage);
            
            // Show notification
            showNotification('Photo captured!');
            
            return capturedImage;
        } catch (error) {
            showError('Failed to capture photo: ' + error.message);
            return null;
        }
    }
    
    // Toggle instructions visibility
    function toggleInstructions() {
        state.showInstructions = !state.showInstructions;
        
        if (elements.instructions) {
            elements.instructions.style.display = state.showInstructions ? 'block' : 'none';
        }
    }
    
    // Change filter
    function changeFilter(direction) {
        const filters = ['gameboy', 'bw', 'pixelated', 'original'];
        const currentIndex = filters.indexOf(state.currentFilter);
        
        let newIndex;
        switch (direction) {
            case 'up':
                newIndex = 0; // GameBoy
                break;
            case 'right':
                newIndex = 1; // Black & White
                break;
            case 'down':
                newIndex = 2; // Pixelated
                break;
            case 'left':
                newIndex = 3; // Original
                break;
            default:
                // Cycle through filters
                newIndex = (currentIndex + 1) % filters.length;
        }
        
        state.currentFilter = filters[newIndex];
        
        // Update filter select if it exists
        if (elements.filterSelect) {
            elements.filterSelect.value = state.currentFilter;
        }
        
        // Show notification
        showNotification(`Filter: ${state.currentFilter.charAt(0).toUpperCase() + state.currentFilter.slice(1)}`);
    }
    
    // Handle D-pad button press
    function handleDpadPress(direction) {
        // Change filter based on direction
        changeFilter(direction);
        
        // Add active class to button
        const dpadButton = document.querySelector(`.dpad-button.${direction}`);
        if (dpadButton) {
            dpadButton.classList.add('active');
            
            // Remove active class after a short delay
            setTimeout(() => {
                dpadButton.classList.remove('active');
            }, 200);
        }
    }
    
    // Handle orientation changes
    function handleOrientation() {
        // Check if we're on a mobile or tablet device
        if (features.isMobile()) {
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
    
    // Handle responsive layout
    function handleResponsiveLayout() {
        const gameboy = document.querySelector('.gameboy-container');
        
        if (!gameboy) return;
        
        // Check if we're on a mobile device
        if (features.isMobile()) {
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
    
    // Setup performance mode toggle
    function setupPerformanceMode() {
        // Create performance toggle if it doesn't exist
        if (!document.getElementById('performanceToggle')) {
            const controlsContainer = document.querySelector('.controls-container');
            
            if (controlsContainer) {
                const performanceControl = document.createElement('div');
                performanceControl.className = 'performance-control';
                performanceControl.innerHTML = `
                    <label class="performance-label">
                        <input type="checkbox" id="performanceToggle" aria-label="Performance Mode"> Performance Mode
                    </label>
                `;
                
                controlsContainer.appendChild(performanceControl);
                
                // Add event listener
                document.getElementById('performanceToggle').addEventListener('change', function(e) {
                    state.performanceMode = e.target.checked;
                    
                    // Show notification
                    showNotification(e.target.checked ? 
                        'Performance mode enabled' : 
                        'Performance mode disabled');
                });
            }
        }
    }
    
    // Setup event listeners
    function setupEventListeners() {
        // Start button
        elements.startButton.addEventListener('click', async function() {
            this.classList.add('active');
            setTimeout(() => this.classList.remove('active'), 200);
            
            if (state.cameraActive) {
                stopCamera();
                elements.instructions.style.display = 'block';
                state.showInstructions = true;
            } else {
                elements.instructions.style.display = 'none';
                state.showInstructions = false;
                await initializeCamera();
            }
        });
        
        // Select button
        elements.selectButton.addEventListener('click', function() {
            this.classList.add('active');
            setTimeout(() => this.classList.remove('active'), 200);
            
            toggleInstructions();
        });
        
        // Capture button
        elements.captureButton.addEventListener('click', function() {
            this.classList.add('active');
            setTimeout(() => this.classList.remove('active'), 200);
            
            capturePhoto();
        });
        
        // Restart button
        elements.restartButton.addEventListener('click', async function() {
            this.classList.add('active');
            setTimeout(() => this.classList.remove('active'), 200);
            
            if (state.cameraActive) {
                stopCamera();
                await initializeCamera();
            } else {
                showNotification('Camera is not active. Press START first.');
            }
        });
        
        // D-pad buttons
        document.querySelectorAll('.dpad-button').forEach(button => {
            button.addEventListener('click', function() {
                const direction = this.getAttribute('data-direction');
                handleDpadPress(direction);
            });
        });
        
        // Filter select (hidden)
        if (elements.filterSelect) {
            elements.filterSelect.addEventListener('change', function() {
                state.currentFilter = this.value;
            });
        }
        
        // Keyboard controls
        document.addEventListener('keydown', function(e) {
            switch (e.key) {
                case 'ArrowUp':
                    handleDpadPress('up');
                    break;
                case 'ArrowRight':
                    handleDpadPress('right');
                    break;
                case 'ArrowDown':
                    handleDpadPress('down');
                    break;
                case 'ArrowLeft':
                    handleDpadPress('left');
                    break;
                case 'z':
                case 'Z':
                    // A button
                    elements.captureButton.click();
                    break;
                case 'x':
                case 'X':
                    // B button
                    elements.restartButton.click();
                    break;
                case 'Enter':
                    // Start button
                    elements.startButton.click();
                    break;
                case ' ':
                    // Select button
                    elements.selectButton.click();
                    break;
            }
        });
        
        // Touch events for mobile
        if (features.hasTouch()) {
            // Add touch event listeners with passive option for better performance
            document.querySelectorAll('.dpad-button, .action-button, .menu-button').forEach(button => {
                button.addEventListener('touchstart', function(e) {
                    e.preventDefault();
                    this.classList.add('active');
                }, { passive: false });
                
                button.addEventListener('touchend', function(e) {
                    e.preventDefault();
                    this.classList.remove('active');
                    
                    // Trigger click event
                    this.click();
                }, { passive: false });
            });
        }
        
        // Orientation change
        window.addEventListener('orientationchange', function() {
            handleOrientation();
            handleResponsiveLayout();
        });
        
        // Resize event
        window.addEventListener('resize', function() {
            handleOrientation();
            handleResponsiveLayout();
        });
    }
    
    // Initialize the application
    function init() {
        console.log('Initializing GameBoy Color Camera Simulator...');
        
        try {
            // Cache DOM elements
            elements = {
                video: document.getElementById('video'),
                canvas: document.getElementById('canvas'),
                flash: document.getElementById('flash'),
                notification: document.getElementById('notification'),
                instructions: document.getElementById('instructions'),
                errorMessage: document.getElementById('errorMessage'),
                statusIndicator: document.getElementById('statusIndicator'),
                startButton: document.getElementById('startButton'),
                selectButton: document.getElementById('selectButton'),
                captureButton: document.getElementById('captureButton'),
                restartButton: document.getElementById('restartButton'),
                filterSelect: document.getElementById('filterSelect')
            };
            
            // Check if required elements exist
            const requiredElements = ['video', 'canvas', 'notification', 'instructions', 'statusIndicator'];
            const missingElements = requiredElements.filter(id => !elements[id]);
            
            if (missingElements.length > 0) {
                console.error(`Missing required elements: ${missingElements.join(', ')}`);
                return false;
            }
            
            // Initialize polyfills
            const polyfillStatus = initPolyfills();
            console.log('Polyfill status:', polyfillStatus);
            
            // Set up event listeners
            setupEventListeners();
            
            // Set up performance mode toggle
            setupPerformanceMode();
            
            // Initial orientation and layout check
            handleOrientation();
            handleResponsiveLayout();
            
            // Add browser info to footer
            const footer = document.querySelector('.page-footer');
            if (footer) {
                const browserInfo = document.createElement('p');
                browserInfo.className = 'browser-info';
                
                // Get browser name and version
                const ua = navigator.userAgent;
                let browserName = 'Unknown';
                let browserVersion = '';
                
                if (ua.indexOf("Edge") > -1 || ua.indexOf("Edg") > -1) {
                    browserName = "Edge";
                } else if (ua.indexOf("Firefox") > -1) {
                    browserName = "Firefox";
                } else if (ua.indexOf("Safari") > -1 && ua.indexOf("Chrome") === -1) {
                    browserName = "Safari";
                } else if (ua.indexOf("Chrome") > -1) {
                    browserName = "Chrome";
                }
                
                // Extract version (simplified)
                const versionMatch = ua.match(/(Chrome|Safari|Firefox|Edge|Edg)\/(\d+\.\d+)/);
                browserVersion = versionMatch ? versionMatch[2] : "";
                
                browserInfo.textContent = `Browser: ${browserName} ${browserVersion}`;
                footer.appendChild(browserInfo);
            }
            
            console.log('GameBoy Color Camera Simulator initialized successfully');
            return true;
        } catch (error) {
            console.error('Initialization error:', error);
            showError(`Initialization failed: ${error.message}`, true);
            return false;
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();