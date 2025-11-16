// Alt Text Recommender functionality

class AltTextRecommender {
    constructor() {
        this.imageUpload = document.getElementById('image-upload');
        this.imagePreview = document.getElementById('image-preview');
        this.imagePreviewContainer = document.getElementById('image-preview-container');
        this.altTextInput = document.getElementById('alt-text-input');
        this.submitBtn = document.getElementById('submit-btn');
        this.inlineWarning = document.getElementById('inline-warning');
        this.altTextScore = document.getElementById('alt-text-score');
        this.suggestedAltText = document.getElementById('suggested-alt-text');
        this.suggestedAltTextContainer = document.getElementById('suggested-alt-text-container');
        this.acceptSuggestedAltTextBtn = document.getElementById('accept-suggested-alt-text-btn');
        this.successMessage = document.getElementById('success-message');
        this.resetDemoBtn = document.getElementById('reset-demo-btn');
        this.successTitle = document.getElementById('success-title');
        this.altTextRecommenderWrapper = document.querySelector('.alt-text-recommender-wrapper');
        this.statusMessage = document.getElementById('alt-text-analysis-status');
        
        // Store uploaded image data
        this.uploadedImageData = null;
        this.currentScore = null;
        this.suggestedAltTextValue = null;
        
        // Backend API configuration
        this.apiBaseUrl = window.API_BASE_URL || 'http://localhost:3001';
        
        this.init();
    }

    init() {
        // Check if required elements exist
        if (!this.submitBtn || !this.altTextInput || !this.imageUpload || !this.resetDemoBtn) {
            console.error('Required DOM elements not found. Make sure the page is fully loaded.');
            return;
        }
        
        // Listen for image upload
        this.imageUpload.addEventListener('change', (e) => {
            this.handleImageUpload(e);
        });
        
        // Listen for alt text input changes
        this.altTextInput.addEventListener('input', () => {
            this.updateSubmitButtonState();
            // Clear warning when user starts editing
            if (this.inlineWarning) {
                this.inlineWarning.style.display = 'none';
            }
        });
        
        // Listen for submit button
        this.submitBtn.addEventListener('click', () => this.handleSubmit());
        
        // Listen for accept suggested alt text button
        if (this.acceptSuggestedAltTextBtn) {
            this.acceptSuggestedAltTextBtn.addEventListener('click', () => {
                this.acceptSuggestedAltText();
            });
        }
        
        // Listen for reset demo button
        this.resetDemoBtn.addEventListener('click', () => {
            this.resetDemo();
        });
        
        // Initial state: submit button disabled
        this.updateSubmitButtonState();
    }
    
    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) {
            this.imagePreviewContainer.style.display = 'none';
            this.uploadedImageData = null;
            this.updateSubmitButtonState();
            return;
        }
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file.');
            event.target.value = '';
            return;
        }
        
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('Image file is too large. Please upload an image smaller than 10MB.');
            event.target.value = '';
            return;
        }
        
        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            this.imagePreview.src = e.target.result;
            this.imagePreviewContainer.style.display = 'block';
            
            // Convert to base64 for API
            this.uploadedImageData = e.target.result;
            this.updateSubmitButtonState();
            this.updateStatusMessage('Image uploaded. Enter alt text and submit to analyze.');
        };
        reader.readAsDataURL(file);
    }
    
    updateSubmitButtonState() {
        const hasImage = this.uploadedImageData !== null;
        const hasAltText = this.altTextInput.value.trim().length > 0;
        
        if (this.submitBtn) {
            this.submitBtn.disabled = !(hasImage && hasAltText);
        }
    }
    
    async handleSubmit() {
        if (!this.uploadedImageData) {
            alert('Please upload an image first.');
            return;
        }
        
        const altText = this.altTextInput.value.trim();
        if (!altText) {
            alert('Please enter alt text for the image.');
            this.altTextInput.focus();
            return;
        }
        
        // Show loading state
        this.showLoadingState();
        this.updateStatusMessage('Analyzing alt text quality...');
        
        try {
            const result = await this.analyzeAltTextWithAI(this.uploadedImageData, altText);
            
            this.currentScore = result.score;
            this.suggestedAltTextValue = result.suggestedAltText;
            
            if (result.score >= 7 && result.score <= 10) {
                // Score is good - allow submission
                this.inlineWarning.style.display = 'none';
                this.doSubmit(false);
            } else if (result.score >= 1 && result.score <= 6) {
                // Score is too low - prevent submission and show warning
                this.altTextScore.textContent = result.score;
                this.suggestedAltText.textContent = result.suggestedAltText;
                this.suggestedAltTextContainer.style.display = 'block';
                this.inlineWarning.style.display = 'block';
                this.updateStatusMessage(`Alt text quality score: ${result.score}/10. Please improve your alt text or accept the suggested alt text.`);
                
                // Scroll warning into view
                this.inlineWarning.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                throw new Error('Invalid score returned from API');
            }
        } catch (error) {
            console.error('Error in handleSubmit:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.updateStatusMessage('An error occurred while analyzing alt text. Please try again.');
            
            // Check if it's a connection error and provide helpful message
            if (error.name === 'ConnectionError' || errorMessage.includes('Cannot connect to backend') || errorMessage.includes('Failed to fetch') || errorMessage.includes('CORS') || errorMessage.includes('NetworkError')) {
                alert('Cannot connect to the backend server. Please check your connection and ensure the backend is running.');
            } else {
                alert(`An error occurred while analyzing alt text: ${errorMessage}. Please try again.`);
            }
        } finally {
            this.endLoadingState();
        }
    }
    
    async analyzeAltTextWithAI(imageData, userAltText) {
        if (!this.apiBaseUrl) {
            throw new Error('Backend API URL is not configured. Please set window.API_BASE_URL.');
        }
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/analyze-alt-text`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image: imageData, // base64 encoded image
                    altText: userAltText
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { error: errorText || `HTTP ${response.status}` };
                }
                
                if (response.status === 404) {
                    throw new Error('Backend endpoint not found. Please check your API URL.');
                } else if (response.status === 500) {
                    throw new Error(errorData.error || 'Server error occurred while analyzing alt text.');
                } else {
                    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
                }
            }
            
            const data = await response.json();
            
            if (!data.score || typeof data.score !== 'number' || data.score < 1 || data.score > 10) {
                throw new Error('Invalid response from server: score must be between 1 and 10');
            }
            
            if (!data.suggestedAltText || typeof data.suggestedAltText !== 'string') {
                throw new Error('Invalid response from server: suggestedAltText is required');
            }
            
            return {
                score: data.score,
                suggestedAltText: data.suggestedAltText
            };
        } catch (error) {
            // Handle network errors
            if (error instanceof TypeError && error.message.includes('fetch')) {
                const connectionError = new Error('Cannot connect to backend server. Please check your connection.');
                connectionError.name = 'ConnectionError';
                throw connectionError;
            }
            
            // Re-throw other errors
            throw error;
        }
    }
    
    acceptSuggestedAltText() {
        if (this.suggestedAltTextValue) {
            this.altTextInput.value = this.suggestedAltTextValue;
            this.inlineWarning.style.display = 'none';
            this.updateStatusMessage('Suggested alt text accepted. You can now submit your post.');
            this.updateSubmitButtonState();
            
            // Focus on the input so user can see the change
            this.altTextInput.focus();
        }
    }
    
    doSubmit(hasUnacceptedSuggestions) {
        // Hide main interface
        if (this.altTextRecommenderWrapper) {
            this.altTextRecommenderWrapper.style.display = 'none';
        }
        this.endLoadingState();
        
        // Update success message
        if (hasUnacceptedSuggestions) {
            // This shouldn't happen for alt text (we prevent submission), but handle it anyway
            this.successTitle.textContent = 'Please include high-quality alt text in your next post.';
            this.successMessage.classList.add('success-message-points-lost');
            this.successMessage.classList.remove('success-message-success');
        } else {
            // Success - show positive message
            this.successTitle.textContent = 'Thank you for contributing to a more inclusive Internet.';
            this.successMessage.classList.add('success-message-success');
            this.successMessage.classList.remove('success-message-points-lost');
        }
        
        // Show success message
        this.successMessage.style.display = 'block';
        this.updateStatusMessage('Post submitted successfully.');
        if (this.submitBtn) {
            this.submitBtn.textContent = 'Submit Post';
            this.submitBtn.disabled = false;
        }
        if (this.successMessage) {
            this.successMessage.focus();
        }
        
        // In a real app, this would send to server here
    }
    
    showLoadingState() {
        if (this.submitBtn) {
            this.submitBtn.classList.add('btn-loading');
            this.submitBtn.disabled = true;
        }
    }
    
    endLoadingState() {
        if (this.submitBtn) {
            this.submitBtn.classList.remove('btn-loading');
            this.updateSubmitButtonState();
        }
    }
    
    updateStatusMessage(message) {
        if (this.statusMessage) {
            this.statusMessage.textContent = message || '';
        }
    }
    
    resetDemo() {
        // Reset all state
        this.imageUpload.value = '';
        this.imagePreviewContainer.style.display = 'none';
        this.uploadedImageData = null;
        this.altTextInput.value = '';
        this.inlineWarning.style.display = 'none';
        this.suggestedAltTextContainer.style.display = 'none';
        this.successMessage.style.display = 'none';
        this.currentScore = null;
        this.suggestedAltTextValue = null;
        
        // Show main interface again
        if (this.altTextRecommenderWrapper) {
            this.altTextRecommenderWrapper.style.display = 'block';
        }
        
        // Reset button state
        this.updateSubmitButtonState();
        this.updateStatusMessage('');
        
        // Focus on image upload
        this.imageUpload.focus();
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new AltTextRecommender();
    });
} else {
    new AltTextRecommender();
}

