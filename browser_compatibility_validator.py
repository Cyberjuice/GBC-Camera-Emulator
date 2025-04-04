#!/usr/bin/env python3
"""
GameBoy Color Simulator - Browser Compatibility Validator
This script helps validate cross-browser compatibility by generating test cases
and analyzing the implementation.
"""

import os
import re
import json
import argparse
from pathlib import Path
import webbrowser
import http.server
import socketserver
import threading
import time
from urllib.parse import urlparse

# Import optional dependencies with fallbacks
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False

try:
    from bs4 import BeautifulSoup
    BS4_AVAILABLE = True
except ImportError:
    BS4_AVAILABLE = False

try:
    import matplotlib.pyplot as plt
    import numpy as np
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    MATPLOTLIB_AVAILABLE = False


class BrowserCompatibilityValidator:
    """Validates browser compatibility for the GameBoy Color simulator."""
    
    def __init__(self, base_dir='.'):
        self.base_dir = Path(base_dir)
        self.results = {
            'file_analysis': {},
            'compatibility_issues': [],
            'responsive_design': {},
            'performance_concerns': [],
            'recommendations': []
        }
        
        # Define browser user agents for testing
        self.browser_user_agents = {
            'chrome': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'firefox': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
            'safari': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
            'edge': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
            'ipad': 'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1'
        }
        
        # Define critical browser features to check
        self.critical_features = [
            'MediaDevices API',
            'getUserMedia',
            'Canvas API',
            'Flexbox',
            'Touch Events',
            'requestAnimationFrame'
        ]
        
        # Define responsive breakpoints to check
        self.responsive_breakpoints = [
            {'name': 'mobile', 'width': 375, 'height': 667},
            {'name': 'tablet', 'width': 768, 'height': 1024},
            {'name': 'desktop', 'width': 1366, 'height': 768}
        ]
    
    def analyze_html(self, file_path='index.html'):
        """Analyze HTML file for compatibility issues."""
        try:
            html_path = self.base_dir / file_path
            if not html_path.exists():
                self.results['compatibility_issues'].append(f"HTML file not found: {file_path}")
                return False
            
            with open(html_path, 'r', encoding='utf-8') as f:
                html_content = f.read()
            
            # Check for viewport meta tag
            if not re.search(r'<meta\s+name=["\']viewport["\']', html_content, re.IGNORECASE):
                self.results['compatibility_issues'].append("Missing viewport meta tag for responsive design")
            
            # Check for HTML5 doctype
            if not html_content.strip().startswith('<!DOCTYPE html>'):
                self.results['compatibility_issues'].append("Missing HTML5 doctype declaration")
            
            # Check for language attribute
            if not re.search(r'<html\s+[^>]*lang=["\'][a-z]{2}["\']', html_content, re.IGNORECASE):
                self.results['compatibility_issues'].append("Missing language attribute on html element")
            
            # Check for playsinline attribute on video (iOS compatibility)
            if '<video' in html_content and 'playsinline' not in html_content:
                self.results['compatibility_issues'].append("Missing 'playsinline' attribute on video element for iOS compatibility")
            
            # Check for accessibility attributes
            if not re.search(r'aria-label', html_content, re.IGNORECASE):
                self.results['recommendations'].append("Consider adding ARIA labels for better accessibility")
            
            # Parse with BeautifulSoup if available
            if BS4_AVAILABLE:
                soup = BeautifulSoup(html_content, 'html.parser')
                
                # Check for responsive images
                images = soup.find_all('img')
                for img in images:
                    if not img.get('srcset') and not img.get('loading'):
                        self.results['recommendations'].append("Consider adding 'srcset' or 'loading' attributes to images for better performance")
                        break
                
                # Check for proper button elements
                buttons = soup.find_all(['button', 'a'])
                for button in buttons:
                    if button.name == 'a' and not button.get('role'):
                        self.results['recommendations'].append("Links used as buttons should have role='button' attribute")
                        break
            
            self.results['file_analysis']['html'] = {
                'file': file_path,
                'size': os.path.getsize(html_path),
                'issues_count': len([i for i in self.results['compatibility_issues'] if file_path in i])
            }
            
            return True
        except Exception as e:
            self.results['compatibility_issues'].append(f"Error analyzing HTML: {str(e)}")
            return False
    
    def analyze_css(self, file_path='styles.css'):
        """Analyze CSS file for compatibility issues."""
        try:
            css_path = self.base_dir / file_path
            if not css_path.exists():
                self.results['compatibility_issues'].append(f"CSS file not found: {file_path}")
                return False
            
            with open(css_path, 'r', encoding='utf-8') as f:
                css_content = f.read()
            
            # Check for media queries
            media_queries = re.findall(r'@media\s+[^{]+{', css_content)
            if not media_queries:
                self.results['compatibility_issues'].append("No media queries found for responsive design")
            else:
                self.results['responsive_design']['media_queries'] = len(media_queries)
            
            # Check for flexbox usage
            if 'display: flex' in css_content:
                # Check for flexbox prefixes
                if '-webkit-flex' not in css_content and '-ms-flexbox' not in css_content:
                    self.results['recommendations'].append("Consider adding vendor prefixes for flexbox for better compatibility")
            
            # Check for vendor prefixes in transforms and transitions
            if ('transform:' in css_content and '-webkit-transform:' not in css_content) or \
               ('transition:' in css_content and '-webkit-transition:' not in css_content):
                self.results['recommendations'].append("Consider adding vendor prefixes for transforms/transitions")
            
            # Check for animation performance
            if 'animation:' in css_content or 'transition:' in css_content:
                if 'will-change:' not in css_content:
                    self.results['recommendations'].append("Consider using 'will-change' property for animation performance")
            
            # Check for responsive units
            fixed_units = len(re.findall(r'\d+px', css_content))
            responsive_units = len(re.findall(r'\d+(?:em|rem|%|vh|vw)', css_content))
            
            if fixed_units > responsive_units:
                self.results['recommendations'].append("Consider using more responsive units (em, rem, %, vh, vw) instead of fixed pixels")
            
            self.results['responsive_design']['fixed_units'] = fixed_units
            self.results['responsive_design']['responsive_units'] = responsive_units
            
            self.results['file_analysis']['css'] = {
                'file': file_path,
                'size': os.path.getsize(css_path),
                'media_queries': len(media_queries),
                'fixed_vs_responsive_ratio': f"{fixed_units}:{responsive_units}"
            }
            
            return True
        except Exception as e:
            self.results['compatibility_issues'].append(f"Error analyzing CSS: {str(e)}")
            return False
    
    def analyze_js(self, file_path='script.js'):
        """Analyze JavaScript file for compatibility issues."""
        try:
            js_path = self.base_dir / file_path
            if not js_path.exists():
                self.results['compatibility_issues'].append(f"JavaScript file not found: {file_path}")
                return False
            
            with open(js_path, 'r', encoding='utf-8') as f:
                js_content = f.read()
            
            # Check for feature detection
            if 'navigator.mediaDevices' in js_content:
                if not re.search(r'if\s*\(\s*navigator\.mediaDevices', js_content):
                    self.results['compatibility_issues'].append("Missing feature detection for MediaDevices API")
            
            # Check for error handling
            if 'try' not in js_content or 'catch' not in js_content:
                self.results['compatibility_issues'].append("Missing try/catch blocks for error handling")
            
            # Check for performance concerns
            if 'setInterval(' in js_content and 'requestAnimationFrame' not in js_content:
                self.results['performance_concerns'].append("Consider using requestAnimationFrame instead of setInterval for animations")
            
            # Check for browser compatibility patterns
            compatibility_patterns = [
                ('getUserMedia', r'navigator\.getUserMedia|navigator\.mediaDevices\.getUserMedia'),
                ('Canvas API', r'getContext\s*\(\s*[\'"]2d[\'"]\s*\)'),
                ('Touch Events', r'touchstart|touchmove|touchend'),
                ('Orientation', r'orientation|window\.matchMedia\s*\(\s*[\'"]orientation')
            ]
            
            for feature, pattern in compatibility_patterns:
                if re.search(pattern, js_content):
                    # Check if there's feature detection for this feature
                    if not re.search(r'if\s*\([^)]*' + pattern.split('|')[0], js_content):
                        self.results['recommendations'].append(f"Consider adding feature detection for {feature}")
            
            # Check for polyfills
            if 'polyfill' not in js_content.lower():
                self.results['recommendations'].append("Consider adding polyfills for broader browser support")
            
            self.results['file_analysis']['js'] = {
                'file': file_path,
                'size': os.path.getsize(js_path),
                'has_feature_detection': 'if (navigator.mediaDevices' in js_content,
                'has_error_handling': 'try' in js_content and 'catch' in js_content,
                'uses_animation_frame': 'requestAnimationFrame' in js_content
            }
            
            return True
        except Exception as e:
            self.results['compatibility_issues'].append(f"Error analyzing JavaScript: {str(e)}")
            return False
    
    def generate_compatibility_report(self):
        """Generate a comprehensive compatibility report."""
        report = {
            'summary': {
                'files_analyzed': len(self.results['file_analysis']),
                'issues_found': len(self.results['compatibility_issues']),
                'recommendations': len(self.results['recommendations'])
            },
            'compatibility_issues': self.results['compatibility_issues'],
            'responsive_design': self.results['responsive_design'],
            'performance_concerns': self.results['performance_concerns'],
            'recommendations': self.results['recommendations'],
            'file_analysis': self.results['file_analysis']
        }
        
        # Add overall assessment
        if len(self.results['compatibility_issues']) == 0:
            report['overall_assessment'] = "Excellent - No compatibility issues detected"
        elif len(self.results['compatibility_issues']) <= 2:
            report['overall_assessment'] = "Good - Minor compatibility issues detected"
        elif len(self.results['compatibility_issues']) <= 5:
            report['overall_assessment'] = "Fair - Several compatibility issues detected"
        else:
            report['overall_assessment'] = "Poor - Multiple compatibility issues detected"
        
        return report
    
    def save_report(self, output_file='compatibility_report.json'):
        """Save the compatibility report to a file."""
        report = self.generate_compatibility_report()
        
        output_path = self.base_dir / output_file
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2)
        
        print(f"Report saved to {output_path}")
        return output_path
    
    def visualize_results(self, output_file='compatibility_visualization.png'):
        """Create a visualization of the compatibility results."""
        if not MATPLOTLIB_AVAILABLE:
            print("Matplotlib not available. Skipping visualization.")
            return None
        
        # Create figure with multiple subplots
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 6))
        
        # Plot 1: Issues by category
        categories = ['Compatibility', 'Performance', 'Recommendations']
        values = [
            len(self.results['compatibility_issues']),
            len(self.results['performance_concerns']),
            len(self.results['recommendations'])
        ]
        
        ax1.bar(categories, values, color=['#ff9999', '#66b3ff', '#99ff99'])
        ax1.set_title('Issues by Category')
        ax1.set_ylabel('Count')
        
        # Plot 2: Responsive Design Units
        if 'fixed_units' in self.results['responsive_design'] and 'responsive_units' in self.results['responsive_design']:
            labels = ['Fixed Units (px)', 'Responsive Units\n(em, rem, %, vh, vw)']
            sizes = [
                self.results['responsive_design']['fixed_units'],
                self.results['responsive_design']['responsive_units']
            ]
            
            ax2.pie(sizes, labels=labels, autopct='%1.1f%%', startangle=90, colors=['#ff9999', '#66b3ff'])
            ax2.axis('equal')
            ax2.set_title('CSS Units Distribution')
        
        plt.tight_layout()
        
        # Save figure
        output_path = self.base_dir / output_file
        plt.savefig(output_path)
        plt.close()
        
        print(f"Visualization saved to {output_path}")
        return output_path
    
    def start_test_server(self, port=8000):
        """Start a local server for testing."""
        handler = http.server.SimpleHTTPRequestHandler
        
        class TestServerThread(threading.Thread):
            def __init__(self, port):
                threading.Thread.__init__(self)
                self.port = port
                self.daemon = True
                self.server = socketserver.TCPServer(("", port), handler)
            
            def run(self):
                print(f"Starting test server at http://localhost:{self.port}")
                self.server.serve_forever()
            
            def stop(self):
                self.server.shutdown()
        
        server_thread = TestServerThread(port)
        server_thread.start()
        
        return server_thread
    
    def open_in_browsers(self, url="http://localhost:8000/enhanced_index.html"):
        """Open the application in multiple browsers for testing."""
        # Check if URL is valid
        parsed_url = urlparse(url)
        if not parsed_url.scheme or not parsed_url.netloc:
            print(f"Invalid URL: {url}")
            return False
        
        # Try to open in available browsers
        browsers_to_try = ['chrome', 'firefox', 'safari', 'edge']
        opened_count = 0
        
        for browser in browsers_to_try:
            try:
                # Try to open in the specified browser
                webbrowser.get(browser).open(url)
                print(f"Opened in {browser.capitalize()}")
                opened_count += 1
                time.sleep(2)  # Wait between browser launches
            except webbrowser.Error:
                print(f"{browser.capitalize()} not available")
        
        if opened_count == 0:
            # If no specific browsers worked, try the default
            webbrowser.open(url)
            print("Opened in default browser")
            opened_count = 1
        
        return opened_count > 0
    
    def run_full_analysis(self):
        """Run a full analysis of all files."""
        print("Starting GameBoy Color Simulator compatibility analysis...")
        
        # Analyze HTML files
        self.analyze_html('index.html')
        self.analyze_html('enhanced_index.html')
        
        # Analyze CSS files
        self.analyze_css('styles.css')
        self.analyze_css('enhanced_styles.css')
        
        # Analyze JS files
        self.analyze_js('script.js')
        self.analyze_js('enhanced_script.js')
        
        # Generate and save report
        report_path = self.save_report()
        
        # Create visualization
        viz_path = self.visualize_results()
        
        print("\nAnalysis complete!")
        print(f"Found {len(self.results['compatibility_issues'])} compatibility issues")
        print(f"Generated {len(self.results['recommendations'])} recommendations")
        
        return report_path, viz_path


def main():
    """Main function to run the validator from command line."""
    parser = argparse.ArgumentParser(description='GameBoy Color Simulator Browser Compatibility Validator')
    parser.add_argument('--dir', default='.', help='Base directory containing the files to analyze')
    parser.add_argument('--server', action='store_true', help='Start a test server')
    parser.add_argument('--port', type=int, default=8000, help='Port for the test server')
    parser.add_argument('--open-browsers', action='store_true', help='Open the application in available browsers')
    args = parser.parse_args()
    
    validator = BrowserCompatibilityValidator(args.dir)
    
    if args.server:
        server = validator.start_test_server(args.port)
        
        if args.open_browsers:
            validator.open_in_browsers(f"http://localhost:{args.port}/enhanced_index.html")
        
        try:
            print("Server running. Press Ctrl+C to stop.")
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("Stopping server...")
            server.stop()
    else:
        validator.run_full_analysis()


if __name__ == "__main__":
    main()