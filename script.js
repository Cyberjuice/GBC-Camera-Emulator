/**
 * GameBoy Color Camera Simulator
 * A web-based simulator that recreates the GameBoy Camera experience
 * using modern web technologies.
 * 
 * Features:
 * - Webcam access with cross-browser compatibility
 * - GameBoy Color-style filters
 * - Photo capture and download functionality
 * - Responsive design for mobile and desktop
 * - Keyboard and touch controls
 */

// ---- Constants and Configuration ----
const FILTERS = {
    GAMEBOY: 'GameBoy',
    BW: 'Black & White',
    PIXELATED: 'Pixelated',
    ORIGINAL: 'Original'
};

// GameBoy Color palette (based on official specifications)
const GB_PALETTE = [
    [155, 188, 15],   // Light green
    [139, 172, 15],   // Green
    [48, 98, 48],     // Dark green
    [15, 56, 15]      // Very dark green
];

// ---- DOM Elements ----
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const flash = document.getElementById('flash');
const errorMessage = document.getElementById('error-message');
const currentFilterDisplay = document.getElementById('current-filter');
const takePhotoBtn = document.getElementById('take-photo');
const changeFilterBtn = document.getElementById('change-filter');
const downloadPhotoBtn = document.getElementById('download-photo');
const helpBtn = document.getElementById('help-button');
const instructions = document.getElementById('instructions');
const closeInstructionsBtn = document.getElementById('close-instructions');

// ---- State Variables ----
let currentFilter = FILTERS.GAMEBOY;
let stream = null;
let isCapturing = false;
let capturedPhoto = null;
let performanceMode = false;
let isMobile = false;

// ---- Feature Detection ----
const hasGetUserMedia = () => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
};

const isTouchDevice = () => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

const detectMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// ---- Browser Compatibility ----
const checkBrowserCompatibility = () => {
    // Check for required features
    if (!hasGetUserMedia()) {
        showError('Your browser does not support camera access. Please try Chrome, Firefox, Safari, or Edge.');
        return false;
    }
    
    // Check for iOS Safari specific issues
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    if (isIOS && isSafari) {
        // iOS Safari requires special handling
        console.log('iOS Safari detected - applying compatibility fixes');
        performanceMode = true;
    }
    
    // Check for older browsers that might need performance mode
    const isOlderBrowser = () => {
        const chromeMatch = navigator.userAgent.match(/Chrome\/(\d+)/);
        const firefoxMatch = navigator.userAgent.match(/Firefox\/(\d+)/);
        
        if (chromeMatch && parseInt(chromeMatch[1]) < 80) return true;
        if (firefoxMatch && parseInt(firefoxMatch[1]) < 75) return true;
        
        return false;
    };
    
    if (isOlderBrowser()) {
        console.log('Older browser detected - enabling performance mode');
        performanceMode = true;
    }
    
    return true;
};

// ---- Camera Initialization ----
const initCamera = async () => {
    if (!checkBrowserCompatibility()) return;
    
    try {
        // Set up video constraints based on GameBoy Camera resolution
        const constraints = {
            video: {
                width: { ideal: 160 },
                height: { ideal: 144 },
                facingMode: 'user'
            }
        };
        
        // Request camera access
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Connect stream to video element
        video.srcObject = stream;
        
        // Wait for video to be ready
        await new Promise(resolve => {
            video.onloadedmetadata = () => {
                resolve();
            };
        });
        
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Start processing frames
        requestAnimationFrame(processFrame);
        
        console.log('Camera initialized successfully');
    } catch (error) {
        console.error('Camera initialization error:', error);
        
        // Provide user-friendly error messages
        if (error.name === 'NotAllowedError') {
            showError('Camera access denied. Please allow camera access and reload the page.');
        } else if (error.name === 'NotFoundError') {
            showError('No camera found. Please connect a camera and reload the page.');
        } else {
            showError(`Camera error: ${error.message}`);
        }
    }
};

// ---- Video Processing ----
const processFrame = () => {
    if (!stream) return;
    
    // Only process frame if video is playing and not paused
    if (!video.paused && !video.ended) {
        // Draw current video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Apply selected filter
        applyFilter(currentFilter);
    }
    
    // Schedule next frame
    requestAnimationFrame(processFrame);
};

// ---- Filter Application ----
const applyFilter = (filter) => {
    // Skip processing if we're in the middle of capturing
    if (isCapturing) return;
    
    // Get image data from canvas
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    switch (filter) {
        case FILTERS.GAMEBOY:
            applyGameBoyFilter(data);
            break;
        case FILTERS.BW:
            applyBlackAndWhiteFilter(data);
            break;
        case FILTERS.PIXELATED:
            applyPixelatedFilter(data, imageData.width, imageData.height);
            break;
        case FILTERS.ORIGINAL:
            // No processing needed for original
            break;
    }
    
    // Put processed image data back to canvas
    ctx.putImageData(imageData, 0, 0);
};

// ---- Specific Filter Implementations ----
const applyGameBoyFilter = (data) => {
    // Performance optimization for mobile devices
    const stride = performanceMode ? 4 : 1;
    
    for (let i = 0; i < data.length; i += 4 * stride) {
        // Calculate grayscale value
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        
        // Map to GameBoy Color palette
        let colorIndex;
        if (avg < 64) {
            colorIndex = 3; // Very dark green
        } else if (avg < 128) {
            colorIndex = 2; // Dark green
        } else if (avg < 192) {
            colorIndex = 1; // Green
        } else {
            colorIndex = 0; // Light green
        }
        
        // Apply color from palette
        data[i] = GB_PALETTE[colorIndex][0];     // R
        data[i + 1] = GB_PALETTE[colorIndex][1]; // G
        data[i + 2] = GB_PALETTE[colorIndex][2]; // B
        
        // If in performance mode, copy this pixel to the next few pixels
        if (performanceMode && stride > 1) {
            for (let j = 1; j < stride; j++) {
                if (i + j * 4 < data.length) {
                    data[i + j * 4] = data[i];
                    data[i + j * 4 + 1] = data[i + 1];
                    data[i + j * 4 + 2] = data[i + 2];
                }
            }
        }
    }
};

const applyBlackAndWhiteFilter = (data) => {
    const stride = performanceMode ? 4 : 1;
    
    for (let i = 0; i < data.length; i += 4 * stride) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = data[i + 1] = data[i + 2] = avg;
        
        // Performance optimization
        if (performanceMode && stride > 1) {
            for (let j = 1; j < stride; j++) {
                if (i + j * 4 < data.length) {
                    data[i + j * 4] = data[i + j * 4 + 1] = data[i + j * 4 + 2] = avg;
                }
            }
        }
    }
};

const applyPixelatedFilter = (data, width, height) => {
    // Create a temporary canvas for pixelation
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = width;
    tempCanvas.height = height;
    
    // Draw current image data to temp canvas
    const tempImageData = new ImageData(data, width, height);
    tempCtx.putImageData(tempImageData, 0, 0);
    
    // Clear original canvas
    ctx.clearRect(0, 0, width, height);
    
    // Define pixel size (larger = more pixelated)
    const pixelSize = 4;
    
    // Draw pixelated version
    for (let y = 0; y < height; y += pixelSize) {
        for (let x = 0; x < width; x += pixelSize) {
            // Get the color of the first pixel in this block
            const pixelData = tempCtx.getImageData(x, y, 1, 1).data;
            
            // Use that color to paint a square
            ctx.fillStyle = `rgb(${pixelData[0]}, ${pixelData[1]}, ${pixelData[2]})`;
            ctx.fillRect(x, y, pixelSize, pixelSize);
        }
    }
    
    // Get the pixelated image data
    return ctx.getImageData(0, 0, width, height);
};

// ---- Photo Capture ----
const takePhoto = () => {
    if (!stream) return;
    
    isCapturing = true;
    
    // Create flash effect
    flash.style.opacity = '1';
    setTimeout(() => {
        flash.style.opacity = '0';
    }, 100);
    
    // Store the current canvas content as the captured photo
    capturedPhoto = canvas.toDataURL('image/png');
    
    // Enable download button
    downloadPhotoBtn.disabled = false;
    
    isCapturing = false;
    
    // Play camera shutter sound
    playShutterSound();
};

// ---- Filter Cycling ----
const cycleFilter = () => {
    const filters = Object.values(FILTERS);
    const currentIndex = filters.indexOf(currentFilter);
    const nextIndex = (currentIndex + 1) % filters.length;
    currentFilter = filters[nextIndex];
    
    // Update filter display
    currentFilterDisplay.textContent = currentFilter;
};

// ---- Photo Download ----
const downloadPhoto = () => {
    if (!capturedPhoto) return;
    
    // Create a temporary link element
    const link = document.createElement('a');
    link.href = capturedPhoto;
    link.download = `gameboy-photo-${new Date().getTime()}.png`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// ---- UI Helpers ----
const showError = (message) => {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
};

const hideError = () => {
    errorMessage.classList.add('hidden');
};

const toggleInstructions = () => {
    instructions.classList.toggle('hidden');
};

const playShutterSound = () => {
    // Create a simple camera shutter sound
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
        console.log('Audio not supported');
    }
};

// ---- Event Listeners ----
// Button click handlers
takePhotoBtn.addEventListener('click', takePhoto);
changeFilterBtn.addEventListener('click', cycleFilter);
downloadPhotoBtn.addEventListener('click', downloadPhoto);
helpBtn.addEventListener('click', toggleInstructions);
closeInstructionsBtn.addEventListener('click', toggleInstructions);

// GameBoy button handlers
document.querySelector('.btn-a').addEventListener('click', takePhoto);
document.querySelector('.btn-b').addEventListener('click', cycleFilter);
document.querySelector('.btn-start').addEventListener('click', downloadPhoto);
document.querySelector('.btn-select').addEventListener('click', toggleInstructions);

// Keyboard controls
document.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'a':
            takePhoto();
            break;
        case 'b':
            cycleFilter();
            break;
        case 'Enter':
            downloadPhoto();
            break;
        case 'Shift':
            toggleInstructions();
            break;
    }
});

// D-pad controls (for demonstration)
const dpadButtons = document.querySelectorAll('.d-pad-up, .d-pad-right, .d-pad-down, .d-pad-left');
dpadButtons.forEach(button => {
    button.addEventListener('click', () => {
        const key = button.getAttribute('data-key');
        console.log(`D-pad ${key} pressed`);
    });
});

// Touch event handling for mobile
if (isTouchDevice()) {
    // Add touch feedback to buttons
    const allButtons = document.querySelectorAll('.btn-a, .btn-b, .btn-start, .btn-select, .d-pad-up, .d-pad-right, .d-pad-down, .d-pad-left');
    
    allButtons.forEach(button => {
        button.addEventListener('touchstart', () => {
            button.classList.add('active');
        });
        
        button.addEventListener('touchend', () => {
            button.classList.remove('active');
        });
    });
}

// Handle orientation changes
window.addEventListener('resize', () => {
    // Adjust UI based on orientation if needed
    const isLandscape = window.innerWidth > window.innerHeight;
    
    if (isMobile) {
        document.body.classList.toggle('landscape', isLandscape);
    }
});

// ---- Initialization ----
window.addEventListener('DOMContentLoaded', () => {
    // Check if running on mobile
    isMobile = detectMobile();
    if (isMobile) {
        document.body.classList.add('mobile');
        performanceMode = true;
    }
    
    // Initialize camera
    initCamera();
    
    // Show instructions on first load
    setTimeout(() => {
        if (!localStorage.getItem('instructionsShown')) {
            toggleInstructions();
            localStorage.setItem('instructionsShown', 'true');
        }
    }, 1000);
});

// ---- Polyfills and Browser Compatibility ----
// Polyfill for older browsers
if (!navigator.mediaDevices) {
    navigator.mediaDevices = {};
}

if (!navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia = function(constraints) {
        const getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
        
        if (!getUserMedia) {
            return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
        }
        
        return new Promise((resolve, reject) => {
            getUserMedia.call(navigator, constraints, resolve, reject);
        });
    };
}

// Canvas toBlob polyfill for older browsers
if (!HTMLCanvasElement.prototype.toBlob) {
    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
        value: function(callback, type, quality) {
            const dataURL = this.toDataURL(type, quality);
            const binStr = atob(dataURL.split(',')[1]);
            const len = binStr.length;
            const arr = new Uint8Array(len);
            
            for (let i = 0; i < len; i++) {
                arr[i] = binStr.charCodeAt(i);
            }
            
            callback(new Blob([arr], { type: type || 'image/png' }));
        }
    });
}