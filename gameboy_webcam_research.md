# GameBoy Color and Webcam Integration Research

## 1. GameBoy Color Specifications (Green Version)

### Physical Dimensions
- Height: 133.5 mm (5.8")
- Width: 78 mm (3.5")
- Depth: 27.4 mm (1.3")
- Weight: 138 g (0.22 kg)

### Screen Specifications
- Resolution: 160 × 144 pixels
- Aspect Ratio: 10:9
- Screen Size: 44 × 39 mm (1.7" × 1.5")
- Display Type: Sharp color LCD
- Pixel Density: 93 pixels per inch (ppi)

### Color Palette
- Total Available Colors: 32,768 (15-bit color depth)
- Simultaneous Colors: 56 on screen at once
- Green Version (Kiwi) Color Palette:
  - Light Green: #9bbc0f
  - Green: #8bac0f
  - Dark Green: #306230
  - Very Dark Green/Black: #0f380f

### Technical Specifications
- CPU: 8-bit Z80 processor
- Clock Speed: 4.194 MHz (single mode) or 8.388 MHz (double mode)
- Memory: 32 KB RAM, 96 KB VRAM, 256 KB External WRAM
- Power: 70-80 mA hr, powered by 2 AA batteries (1.5V)

## 2. HTML5/JavaScript Methods for Webcam Access

### Primary Method: getUserMedia API
```javascript
// Basic webcam access
navigator.mediaDevices.getUserMedia({
  video: true,  // Enable video
  audio: false  // Disable audio
})
.then(stream => {
  // Success: Attach stream to video element
  const videoElement = document.getElementById('webcam');
  videoElement.srcObject = stream;
})
.catch(error => {
  // Handle errors: permission denied, hardware unavailable, etc.
  console.error("Error accessing webcam:", error);
});
```

### Advanced Configuration Options
```javascript
// With constraints for specific camera requirements
navigator.mediaDevices.getUserMedia({
  video: {
    width: { ideal: 160 },      // Match GameBoy resolution width
    height: { ideal: 144 },     // Match GameBoy resolution height
    facingMode: "user"          // Use front camera (for mobile)
  }
})
```

### Device Enumeration
```javascript
// List available camera devices
navigator.mediaDevices.enumerateDevices()
  .then(devices => {
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    console.log('Available cameras:', videoDevices);
  });
```

## 3. Retro Pixel/Black-and-White Filter Techniques

### Basic Canvas Setup
```javascript
// Set up canvas for processing video frames
const video = document.getElementById('webcam');
const canvas = document.getElementById('processed-output');
const ctx = canvas.getContext('2d');

// Match canvas to video dimensions
canvas.width = 160;  // GameBoy resolution
canvas.height = 144; // GameBoy resolution

// Process frames on animation loop
function processFrame() {
  // Draw current video frame to canvas
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  // Get pixel data for manipulation
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  // Apply filter
  applyRetroFilter(imageData);
  
  // Put modified pixels back
  ctx.putImageData(imageData, 0, 0);
  
  // Continue processing frames
  requestAnimationFrame(processFrame);
}
```

### GameBoy Color Filter Implementation
```javascript
function applyGameBoyFilter(imageData) {
  const data = imageData.data;
  
  // GameBoy Color green palette
  const gbPalette = [
    [155, 188, 15],  // Light green #9bbc0f
    [139, 172, 15],  // Green #8bac0f
    [48, 98, 48],    // Dark green #306230
    [15, 56, 15]     // Very dark green #0f380f
  ];
  
  // Process each pixel
  for (let i = 0; i < data.length; i += 4) {
    // Get RGB values
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Calculate brightness (0-255)
    const brightness = (r + g + b) / 3;
    
    // Map brightness to one of 4 GameBoy colors
    let colorIndex;
    if (brightness > 192) {
      colorIndex = 0; // Lightest
    } else if (brightness > 128) {
      colorIndex = 1;
    } else if (brightness > 64) {
      colorIndex = 2;
    } else {
      colorIndex = 3; // Darkest
    }
    
    // Apply GameBoy color
    data[i] = gbPalette[colorIndex][0];     // R
    data[i + 1] = gbPalette[colorIndex][1]; // G
    data[i + 2] = gbPalette[colorIndex][2]; // B
    // Alpha remains unchanged
  }
}
```

### Pixelation Effect
```javascript
function pixelateImage(imageData, blockSize = 4) {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  
  // Temporary canvas for pixelation
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  tempCanvas.width = width;
  tempCanvas.height = height;
  
  // Put original image data
  tempCtx.putImageData(imageData, 0, 0);
  
  // Clear original canvas
  const ctx = document.getElementById('processed-output').getContext('2d');
  ctx.clearRect(0, 0, width, height);
  
  // Draw pixelated version
  for (let y = 0; y < height; y += blockSize) {
    for (let x = 0; x < width; x += blockSize) {
      // Get the color of the first pixel in the block
      const pixelData = tempCtx.getImageData(x, y, 1, 1).data;
      
      // Draw a block using that color
      ctx.fillStyle = `rgba(${pixelData[0]}, ${pixelData[1]}, ${pixelData[2]}, ${pixelData[3] / 255})`;
      ctx.fillRect(x, y, blockSize, blockSize);
    }
  }
}
```

## 4. Image Download Functionality

### Basic Download Implementation
```javascript
function captureAndDownload() {
  const canvas = document.getElementById('processed-output');
  
  // Create download link
  const link = document.createElement('a');
  link.download = `gameboy-capture-${new Date().toISOString()}.png`;
  
  // Convert canvas to data URL
  link.href = canvas.toDataURL('image/png');
  
  // Trigger download
  link.click();
}
```

### Enhanced Download with UI Feedback
```javascript
function captureWithFeedback() {
  const canvas = document.getElementById('processed-output');
  const downloadBtn = document.getElementById('download-btn');
  
  // Disable button during processing
  downloadBtn.disabled = true;
  downloadBtn.textContent = 'Processing...';
  
  // Add visual feedback (flash effect)
  const flashElement = document.createElement('div');
  flashElement.style.position = 'fixed';
  flashElement.style.top = '0';
  flashElement.style.left = '0';
  flashElement.style.width = '100%';
  flashElement.style.height = '100%';
  flashElement.style.backgroundColor = 'white';
  flashElement.style.opacity = '0.7';
  flashElement.style.transition = 'opacity 0.5s';
  document.body.appendChild(flashElement);
  
  // Process download after visual effect
  setTimeout(() => {
    // Remove flash effect
    flashElement.style.opacity = '0';
    setTimeout(() => document.body.removeChild(flashElement), 500);
    
    // Create and trigger download
    const link = document.createElement('a');
    link.download = `gameboy-capture-${new Date().toISOString()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    // Reset button
    downloadBtn.disabled = false;
    downloadBtn.textContent = 'Capture';
  }, 300);
}
```

### Multiple Format Options
```javascript
function downloadWithOptions(format = 'png', quality = 0.92) {
  const canvas = document.getElementById('processed-output');
  const link = document.createElement('a');
  
  // Set file extension and MIME type based on format
  let mimeType, extension;
  switch (format.toLowerCase()) {
    case 'jpeg':
    case 'jpg':
      mimeType = 'image/jpeg';
      extension = 'jpg';
      break;
    case 'webp':
      mimeType = 'image/webp';
      extension = 'webp';
      break;
    case 'png':
    default:
      mimeType = 'image/png';
      extension = 'png';
      break;
  }
  
  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  link.download = `gameboy-capture-${timestamp}.${extension}`;
  
  // Convert canvas to data URL with specified format and quality
  link.href = canvas.toDataURL(mimeType, quality);
  
  // Trigger download
  link.click();
}
```

## 5. Browser Compatibility Considerations

### Desktop Browser Compatibility
| Browser | getUserMedia Support | Notes |
|---------|---------------------|-------|
| Chrome  | Full support        | Requires HTTPS for production |
| Firefox | Full support        | Requires HTTPS for production |
| Safari  | Full support        | Since Safari 11 |
| Edge    | Full support        | Modern versions (Chromium-based) |
| Opera   | Full support        | Requires HTTPS for production |

### Mobile/iPad Compatibility
| Platform | Browser | Support Level | Notes |
|----------|---------|--------------|-------|
| iOS/iPad | Safari  | Full support | iOS 11.1+ |
| iOS/iPad | Chrome  | Limited      | Uses Safari's WebView engine |
| iOS/iPad | Firefox | Limited      | Uses Safari's WebView engine |
| Android  | Chrome  | Full support | Android 5.0+ |
| Android  | Firefox | Full support | Recent versions |

### Feature Detection Implementation
```javascript
function checkWebcamCompatibility() {
  // Check if getUserMedia is supported
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    // Fallback for older browsers
    navigator.getUserMedia = navigator.getUserMedia ||
                            navigator.webkitGetUserMedia ||
                            navigator.mozGetUserMedia ||
                            navigator.msGetUserMedia;
                            
    if (!navigator.getUserMedia) {
      return {
        supported: false,
        error: 'Your browser does not support webcam access.'
      };
    }
  }
  
  // Check if running in secure context (HTTPS or localhost)
  if (window.location.protocol !== 'https:' && 
      window.location.hostname !== 'localhost' && 
      window.location.hostname !== '127.0.0.1') {
    return {
      supported: false,
      error: 'Webcam access requires HTTPS for this browser.'
    };
  }
  
  return {
    supported: true
  };
}
```

### iOS-Specific Considerations
```javascript
// iOS requires user interaction to start video
document.getElementById('start-btn').addEventListener('click', () => {
  startWebcam();
});

// iOS may require playsinline attribute
const videoElement = document.getElementById('webcam');
videoElement.setAttribute('playsinline', true);
videoElement.setAttribute('webkit-playsinline', true);
```

## Summary and Recommendations

1. **GameBoy Color Emulation**:
   - Use the exact color palette from the green version for authentic look
   - Match the 160×144 pixel resolution for accurate representation

2. **Webcam Implementation**:
   - Always use feature detection before attempting webcam access
   - Implement proper error handling for permission denials
   - Consider iOS-specific requirements (user interaction, playsinline attribute)

3. **Filter Processing**:
   - Use requestAnimationFrame for smooth processing
   - Consider performance optimizations for mobile devices
   - Implement multiple filter options (GameBoy green, black & white, pixelated)

4. **Download Functionality**:
   - Provide visual feedback during capture process
   - Offer multiple format options (PNG recommended for pixel art)
   - Generate meaningful filenames with timestamps

5. **Browser Compatibility**:
   - Test thoroughly across platforms, especially iOS devices
   - Provide clear error messages for unsupported browsers
   - Ensure HTTPS deployment for production environments