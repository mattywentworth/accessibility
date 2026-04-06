// Alt Text Recommender — optional alt before submit; generate or evaluate via API

const ALT_SCORE_GOOD_MIN = 6;
const ALT_SCORE_LOW_MAX = 5;

class AltTextRecommender {
    constructor() {
        this.imageUpload = document.getElementById('image-upload');
        this.imagePreview = document.getElementById('image-preview');
        this.imagePreviewContainer = document.getElementById('image-preview-container');
        this.altTextInput = document.getElementById('alt-text-input');
        this.submitBtn = document.getElementById('submit-btn');
        this.inlineWarning = document.getElementById('inline-warning');
        this.inlineWarningHeading = document.getElementById('inline-warning-heading');
        this.inlineWarningBody = document.getElementById('inline-warning-body');
        this.altTextScoreBlock = document.getElementById('alt-text-score-block');
        this.altTextScore = document.getElementById('alt-text-score');
        this.suggestedAltText = document.getElementById('suggested-alt-text');
        this.suggestedAltTextContainer = document.getElementById('suggested-alt-text-container');
        this.suggestionPrimaryActions = document.getElementById('suggestion-primary-actions');
        this.acceptSuggestedAltTextBtn = document.getElementById('accept-suggested-alt-text-btn');
        this.denySuggestedAltTextBtn = document.getElementById('deny-suggested-alt-text-btn');
        this.suggestionDenyPanel = document.getElementById('suggestion-deny-panel');
        this.altSuggestionEdit = document.getElementById('alt-suggestion-edit');
        this.applyEditedAltBtn = document.getElementById('apply-edited-alt-btn');
        this.requestNewAltBtn = document.getElementById('request-new-alt-btn');
        this.cancelDenyAltBtn = document.getElementById('cancel-deny-alt-btn');
        this.suggestedAltLabel = document.getElementById('suggested-alt-label');
        this.successMessage = document.getElementById('success-message');
        this.resetDemoBtn = document.getElementById('reset-demo-btn');
        this.successTitle = document.getElementById('success-title');
        this.altTextRecommenderWrapper = document.querySelector('.alt-text-recommender-wrapper');
        this.statusMessage = document.getElementById('alt-text-analysis-status');

        this.uploadedImageData = null;
        this.currentScore = null;
        this.suggestedAltTextValue = null;
        this.lastAnalysisMode = null;

        this.apiBaseUrl = window.API_BASE_URL || 'http://localhost:3001';

        this.init();
    }

    init() {
        if (!this.submitBtn || !this.altTextInput || !this.imageUpload || !this.resetDemoBtn) {
            console.error('Required DOM elements not found. Make sure the page is fully loaded.');
            return;
        }

        this.imageUpload.addEventListener('change', (e) => {
            this.handleImageUpload(e);
        });

        this.altTextInput.addEventListener('input', () => {
            this.updateSubmitButtonState();
            this.hideInlineReview();
        });

        this.submitBtn.addEventListener('click', () => this.handleSubmit());

        if (this.acceptSuggestedAltTextBtn) {
            this.acceptSuggestedAltTextBtn.addEventListener('click', () => this.approveSuggestedAlt());
        }
        if (this.denySuggestedAltTextBtn) {
            this.denySuggestedAltTextBtn.addEventListener('click', () => this.openDenyPanel());
        }
        if (this.applyEditedAltBtn) {
            this.applyEditedAltBtn.addEventListener('click', () => this.applyEditedDescription());
        }
        if (this.requestNewAltBtn) {
            this.requestNewAltBtn.addEventListener('click', () => this.requestNewAiDescription());
        }
        if (this.cancelDenyAltBtn) {
            this.cancelDenyAltBtn.addEventListener('click', () => this.closeDenyPanel());
        }

        this.resetDemoBtn.addEventListener('click', () => {
            this.resetDemo();
        });

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

        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file.');
            event.target.value = '';
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            alert('Image file is too large. Please upload an image smaller than 10MB.');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.imagePreview.src = e.target.result;
            this.imagePreviewContainer.style.display = 'block';
            this.uploadedImageData = e.target.result;
            this.updateSubmitButtonState();
            this.updateStatusMessage(
                'Image uploaded. You can submit with or without alt text, or add a description first.'
            );
        };
        reader.readAsDataURL(file);
    }

    updateSubmitButtonState() {
        const hasImage = this.uploadedImageData !== null;
        if (this.submitBtn) {
            this.submitBtn.disabled = !hasImage;
        }
    }

    hideInlineReview() {
        if (this.inlineWarning) {
            this.inlineWarning.style.display = 'none';
        }
        if (this.suggestedAltTextContainer) {
            this.suggestedAltTextContainer.style.display = 'none';
        }
        this.closeDenyPanel(true);
        if (this.suggestionPrimaryActions) {
            this.suggestionPrimaryActions.style.display = 'flex';
        }
    }

    openDenyPanel() {
        if (!this.suggestionDenyPanel || !this.altSuggestionEdit) return;
        this.altSuggestionEdit.value = this.suggestedAltTextValue || '';
        this.suggestionDenyPanel.style.display = 'block';
        if (this.suggestionPrimaryActions) {
            this.suggestionPrimaryActions.style.display = 'none';
        }
        this.altSuggestionEdit.focus();
        this.updateStatusMessage('Edit the suggestion or request a new AI description.');
    }

    closeDenyPanel(clearEdit = true) {
        if (this.suggestionDenyPanel) {
            this.suggestionDenyPanel.style.display = 'none';
        }
        if (clearEdit && this.altSuggestionEdit) {
            this.altSuggestionEdit.value = '';
        }
        const containerVisible =
            this.suggestedAltTextContainer &&
            this.suggestedAltTextContainer.style.display === 'block';
        if (this.suggestionPrimaryActions && containerVisible) {
            this.suggestionPrimaryActions.style.display = 'flex';
        }
    }

    async handleSubmit() {
        if (!this.uploadedImageData) {
            alert('Please upload an image first.');
            return;
        }

        const altText = this.altTextInput.value.trim();

        this.showLoadingState();
        this.updateStatusMessage('Analyzing image…');

        try {
            const result = await this.analyzeAltTextWithAI(this.uploadedImageData, altText);

            this.lastAnalysisMode = result.mode;
            this.currentScore = result.score;
            this.suggestedAltTextValue = result.suggestedAltText;

            if (result.mode === 'evaluate' && result.score >= ALT_SCORE_GOOD_MIN) {
                this.hideInlineReview();
                this.altTextInput.value = altText;
                this.doSubmit(false);
                return;
            }

            if (result.mode === 'generate') {
                this.showReviewUI({
                    mode: 'generate',
                    score: null,
                    suggested: result.suggestedAltText
                });
                return;
            }

            if (
                result.mode === 'evaluate' &&
                result.score >= 1 &&
                result.score <= ALT_SCORE_LOW_MAX
            ) {
                this.showReviewUI({
                    mode: 'evaluate',
                    score: result.score,
                    suggested: result.suggestedAltText
                });
                return;
            }

            throw new Error('Unexpected response from server');
        } catch (error) {
            console.error('Error in handleSubmit:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.updateStatusMessage('An error occurred while analyzing. Please try again.');

            if (
                error.name === 'ConnectionError' ||
                errorMessage.includes('Cannot connect to backend') ||
                errorMessage.includes('Failed to fetch') ||
                errorMessage.includes('CORS') ||
                errorMessage.includes('NetworkError')
            ) {
                alert(
                    'Cannot connect to the backend server. Please check your connection and ensure the backend is running.'
                );
            } else {
                alert(`An error occurred: ${errorMessage}`);
            }
        } finally {
            this.endLoadingState();
        }
    }

    showReviewUI({ mode, score, suggested }) {
        this.suggestedAltTextValue = suggested;
        if (this.suggestedAltText) {
            this.suggestedAltText.textContent = suggested;
        }
        if (this.suggestedAltLabel) {
            this.suggestedAltLabel.textContent =
                mode === 'generate' ? 'AI-generated alt text' : 'Suggested improved alt text';
        }

        if (mode === 'generate') {
            if (this.inlineWarningHeading) {
                this.inlineWarningHeading.textContent = '✨ AI-generated alt text';
            }
            if (this.inlineWarningBody) {
                this.inlineWarningBody.textContent =
                    'Review the description below. Approve to submit your post with this alt text, or deny to edit it yourself or request a different AI description.';
            }
            if (this.altTextScoreBlock) {
                this.altTextScoreBlock.style.display = 'none';
            }
        } else {
            if (this.inlineWarningHeading) {
                this.inlineWarningHeading.textContent = '⚠️ Alt text could be stronger';
            }
            if (this.inlineWarningBody) {
                this.inlineWarningBody.textContent =
                    'Your description only scored in the 1–5 range for accuracy vs. the image. You can approve the improved suggestion below, or deny to edit it or request a new AI description.';
            }
            if (this.altTextScoreBlock && this.altTextScore) {
                this.altTextScore.textContent = String(score);
                this.altTextScoreBlock.style.display = 'block';
            }
        }

        if (this.inlineWarning) {
            this.inlineWarning.style.display = 'block';
        }
        if (this.suggestedAltTextContainer) {
            this.suggestedAltTextContainer.style.display = 'block';
        }
        if (this.suggestionPrimaryActions) {
            this.suggestionPrimaryActions.style.display = 'flex';
        }
        this.closeDenyPanel(true);

        this.inlineWarning.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        this.updateStatusMessage('Review the suggested alt text.');
    }

    async analyzeAltTextWithAI(imageData, userAltText) {
        if (!this.apiBaseUrl) {
            throw new Error('Backend API URL is not configured. Please set window.API_BASE_URL.');
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/analyze-alt-text`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    image: imageData,
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
                }
                if (response.status === 500) {
                    throw new Error(errorData.error || 'Server error while analyzing alt text.');
                }
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.suggestedAltText || typeof data.suggestedAltText !== 'string') {
                throw new Error('Invalid response from server: suggestedAltText is required');
            }

            if (data.mode === 'generate') {
                return {
                    mode: 'generate',
                    score: null,
                    suggestedAltText: data.suggestedAltText.trim()
                };
            }

            if (data.mode === 'evaluate') {
                if (typeof data.score !== 'number' || data.score < 1 || data.score > 10) {
                    throw new Error('Invalid response from server: score must be between 1 and 10');
                }
                return {
                    mode: 'evaluate',
                    score: data.score,
                    suggestedAltText: data.suggestedAltText.trim()
                };
            }

            throw new Error('Invalid response from server: unknown mode');
        } catch (error) {
            if (error instanceof TypeError && error.message.includes('fetch')) {
                const connectionError = new Error('Cannot connect to backend server. Please check your connection.');
                connectionError.name = 'ConnectionError';
                throw connectionError;
            }
            throw error;
        }
    }

    approveSuggestedAlt() {
        if (!this.suggestedAltTextValue) return;
        this.altTextInput.value = this.suggestedAltTextValue;
        this.hideInlineReview();
        this.doSubmit(false);
    }

    applyEditedDescription() {
        if (!this.altSuggestionEdit) return;
        const edited = this.altSuggestionEdit.value.trim();
        if (!edited) {
            alert('Please enter a description, or use “Request new AI description”.');
            this.altSuggestionEdit.focus();
            return;
        }
        this.altTextInput.value = edited;
        this.suggestedAltTextValue = edited;
        this.hideInlineReview();
        this.doSubmit(false);
    }

    async requestNewAiDescription() {
        if (!this.uploadedImageData) return;

        this.showLoadingState();
        this.updateStatusMessage('Requesting a new AI description…');

        try {
            const result = await this.analyzeAltTextWithAI(this.uploadedImageData, '');
            if (result.mode !== 'generate') {
                throw new Error('Expected a fresh generated description');
            }
            this.suggestedAltTextValue = result.suggestedAltText;
            if (this.suggestedAltText) {
                this.suggestedAltText.textContent = result.suggestedAltText;
            }
            this.lastAnalysisMode = 'generate';
            this.closeDenyPanel(true);
            if (this.suggestionPrimaryActions) {
                this.suggestionPrimaryActions.style.display = 'flex';
            }
            if (this.inlineWarningHeading) {
                this.inlineWarningHeading.textContent = '✨ New AI-generated alt text';
            }
            if (this.altTextScoreBlock) {
                this.altTextScoreBlock.style.display = 'none';
            }
            this.updateStatusMessage('New suggestion ready. Approve or deny.');
        } catch (error) {
            console.error('requestNewAiDescription:', error);
            const msg = error instanceof Error ? error.message : String(error);
            alert(`Could not get a new description: ${msg}`);
            this.updateStatusMessage('Request failed. Try again.');
        } finally {
            this.endLoadingState();
        }
    }

    doSubmit(hasUnacceptedSuggestions) {
        if (this.altTextRecommenderWrapper) {
            this.altTextRecommenderWrapper.style.display = 'none';
        }
        this.endLoadingState();

        if (hasUnacceptedSuggestions) {
            this.successTitle.textContent = 'Please include high-quality alt text in your next post.';
            this.successMessage.classList.add('success-message-points-lost');
            this.successMessage.classList.remove('success-message-success');
        } else {
            this.successTitle.textContent = 'Thank you for contributing to a more inclusive Internet.';
            this.successMessage.classList.add('success-message-success');
            this.successMessage.classList.remove('success-message-points-lost');
        }

        this.successMessage.style.display = 'block';
        this.updateStatusMessage('Post submitted successfully.');
        if (this.submitBtn) {
            this.submitBtn.textContent = 'Submit Post';
            this.submitBtn.disabled = false;
        }
        if (this.successMessage) {
            this.successMessage.focus();
        }
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
        this.imageUpload.value = '';
        this.imagePreviewContainer.style.display = 'none';
        this.uploadedImageData = null;
        this.altTextInput.value = '';
        this.hideInlineReview();
        this.successMessage.style.display = 'none';
        this.currentScore = null;
        this.suggestedAltTextValue = null;
        this.lastAnalysisMode = null;

        if (this.altTextRecommenderWrapper) {
            this.altTextRecommenderWrapper.style.display = 'block';
        }

        this.updateSubmitButtonState();
        this.updateStatusMessage('');
        this.imageUpload.focus();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new AltTextRecommender();
    });
} else {
    new AltTextRecommender();
}
