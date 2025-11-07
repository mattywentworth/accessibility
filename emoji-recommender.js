// Emoji Recommender functionality

class EmojiRecommender {
    constructor() {
        this.postInput = document.getElementById('post-input');
        this.generatePostBtn = document.getElementById('generate-post-btn');
        this.suggestionsList = document.getElementById('suggestions-list');
        this.suggestionsInstruction = document.getElementById('suggestions-instruction');
        this.acceptAllBtn = document.getElementById('accept-all-btn');
        this.submitBtn = document.getElementById('submit-btn');
        this.inlineWarning = document.getElementById('inline-warning');
        this.exampleExcessive = document.getElementById('example-excessive');
        this.exampleRecommended = document.getElementById('example-recommended');
        this.checkboxContainer = document.getElementById('checkbox-container-inline');
        this.acknowledgeCheckbox = document.getElementById('acknowledge-checkbox-inline');
        this.successMessage = document.getElementById('success-message');
        this.resetDemoBtn = document.getElementById('reset-demo-btn');
        this.successTitle = document.getElementById('success-title');
        this.noEmojiWarning = document.getElementById('no-emoji-warning');
        this.emojiRecommenderWrapper = document.querySelector('.hashtag-recommender-wrapper');
        
        // Maps original emoji sequence to array of recommended emojis (1-2 suggestions)
        this.suggestions = new Map(); 
        this.acceptedSuggestions = new Map(); // Maps original sequence to the accepted recommendation
        this.hasAccessibleEmojis = true; // Track if all emojis are accessible
        this.hasAnalyzed = false; // Track if we've already analyzed emojis
        
        // Backend API configuration
        this.apiBaseUrl = window.API_BASE_URL || 'http://localhost:3001';
        
        this.init();
    }

    init() {
        // Check if required elements exist
        if (!this.submitBtn || !this.postInput || !this.acceptAllBtn || !this.acknowledgeCheckbox || !this.resetDemoBtn) {
            console.error('Required DOM elements not found. Make sure the page is fully loaded.');
            return;
        }
        
        // Listen for submit button
        this.submitBtn.addEventListener('click', () => this.handleSubmit());
        
        // Listen for generate post button
        if (this.generatePostBtn) {
            this.generatePostBtn.addEventListener('click', () => this.generatePost());
        }
        
        // Listen for accept all button
        this.acceptAllBtn.addEventListener('click', () => this.acceptAllSuggestions());
        
        // Listen for checkbox changes to enable/disable submit
        this.acknowledgeCheckbox.addEventListener('change', (e) => {
            this.updateSubmitButtonState();
        });
        
        // Listen for input changes to clear analysis state and update button state
        this.postInput.addEventListener('input', () => {
            this.clearAnalysisState();
            this.updateSubmitButtonState();
            // Hide no-emoji warning when user types
            if (this.noEmojiWarning) {
                this.noEmojiWarning.style.display = 'none';
            }
        });
        
        // Listen for reset demo button
        this.resetDemoBtn.addEventListener('click', () => {
            this.resetDemo();
        });
        
        // Initial state: submit button disabled until user enters text with emoji sequences
        this.updateSubmitButtonState();
    }
    
    // Emoji detection regex - matches sequences of 2+ consecutive emojis
    // This pattern matches emoji characters including those with variation selectors and zero-width joiners
    findConsecutiveEmojis(text) {
        if (!text) return [];
        
        // Pattern to match emoji sequences (2 or more consecutive emojis)
        // This regex matches emoji characters including:
        // - Emoticons (😀, 😊, etc.)
        // - Symbols & pictographs (❤️, 🎉, etc.)
        // - Flags
        // - Skin tone modifiers
        // - Zero-width joiner sequences
        // Using a more compatible approach that works across browsers
        try {
            // Try Unicode property escapes first (modern browsers)
            const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Component}){2,}/gu;
            
            const matches = [];
            let match;
            
            while ((match = emojiRegex.exec(text)) !== null) {
                matches.push(match[0]);
            }
            
            return matches;
        } catch (e) {
            // Fallback for browsers that don't support Unicode property escapes
            // This simplified pattern matches most common emojis
            const fallbackRegex = /([\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F1E0}-\u{1F1FF}]){2,}/gu;
            
            const matches = [];
            let match;
            
            while ((match = fallbackRegex.exec(text)) !== null) {
                matches.push(match[0]);
            }
            
            return matches;
        }
    }
    
    hasEmojiSequences(text) {
        // Check if text contains at least one sequence of 2+ consecutive emojis
        const sequences = this.findConsecutiveEmojis(text);
        return sequences.length > 0;
    }
    
    generatePost() {
        // Populate the input field with the generated post
        const generatedPost = "I'm so excited! 🎉🎊🎈 Flying to NYC for vacation tomorrow 🛫🛬🗽🍕🍜  I hope I get to see some of the city's greatest non-human living things 🐀🎄";
        this.postInput.value = generatedPost;
        
        // Trigger input event to update state
        this.postInput.dispatchEvent(new Event('input'));
        
        // Focus on the input
        this.postInput.focus();
    }
    
    updateWarningExamples(pendingSuggestions) {
        // Update the inline warning examples with user's actual emoji sequences
        if (pendingSuggestions.length > 0) {
            // Get the first pending suggestion
            const [originalSequence, suggestions] = pendingSuggestions[0];
            const firstSuggestion = suggestions && suggestions.length > 0 ? suggestions[0] : null;
            
            // Update the example spans
            if (this.exampleExcessive) {
                this.exampleExcessive.textContent = originalSequence;
            }
            if (this.exampleRecommended && firstSuggestion) {
                this.exampleRecommended.textContent = firstSuggestion;
            }
        }
    }
    
    resetDemo() {
        // Reset everything back to initial state
        this.postInput.value = '';
        this.suggestions.clear();
        this.acceptedSuggestions.clear();
        this.hasAccessibleEmojis = true;
        this.hasAnalyzed = false;
        this.acknowledgeCheckbox.checked = false;
        
        // Hide success message and warnings
        this.successMessage.style.display = 'none';
        this.noEmojiWarning.style.display = 'none';
        this.inlineWarning.style.display = 'none';
        
        // Reset success message state
        this.successTitle.textContent = 'Thank you for contributing to a more inclusive Internet.';
        this.successMessage.classList.remove('success-message-points-lost');
        this.successMessage.classList.add('success-message-success');
        
        // Reset warning examples to defaults
        if (this.exampleExcessive) {
            this.exampleExcessive.textContent = '🎉🎊🎈';
        }
        if (this.exampleRecommended) {
            this.exampleRecommended.textContent = '🎉';
        }
        
        // Show main interface
        this.emojiRecommenderWrapper.style.display = 'flex';
        
        // Reset UI elements
        this.renderSuggestions();
        this.updateSubmitButtonState();
        
        // Focus on input
        this.postInput.focus();
    }
    
    clearAnalysisState() {
        // Clear previous analysis when user types
        this.suggestions.clear();
        this.acceptedSuggestions.clear();
        this.hasAccessibleEmojis = true;
        this.hasAnalyzed = false;
        this.inlineWarning.style.display = 'none';
        // Checkbox is inside inline-warning, so it's hidden automatically
        this.acknowledgeCheckbox.checked = false;
        this.renderSuggestions();
        this.updateSubmitButtonState();
    }
    
    updateSubmitButtonState() {
        if (!this.submitBtn || !this.postInput) {
            return;
        }
        
        const text = this.postInput.value.trim();
        const hasEmojiSequencesInInput = this.hasEmojiSequences(text);
        
        // First check: input must have text and at least one emoji sequence
        if (!text || !hasEmojiSequencesInInput) {
            this.submitBtn.disabled = true;
            return;
        }
        
        // If we haven't analyzed yet, button can be enabled (user can click to analyze)
        if (!this.hasAnalyzed) {
            this.submitBtn.disabled = false;
            return;
        }
        
        // After analysis, check if we can submit
        if (this.hasAccessibleEmojis) {
            // All emojis are accessible - button enabled
            this.submitBtn.disabled = false;
            return;
        }
        
        // Check pending suggestions
        const pendingSuggestions = Array.from(this.suggestions.entries()).filter(
            ([original]) => !this.acceptedSuggestions.has(original)
        );
        
        if (pendingSuggestions.length === 0) {
            // All suggestions accepted - button enabled
            this.submitBtn.disabled = false;
            return;
        }
        
        // Has unaccepted suggestions - button enabled only if acknowledged
        if (this.acknowledgeCheckbox) {
            this.submitBtn.disabled = !this.acknowledgeCheckbox.checked;
        } else {
            this.submitBtn.disabled = true;
        }
    }

    async analyzeEmojisWithAI() {
        if (!this.postInput) {
            throw new Error('Post input element not found');
        }
        
        const text = this.postInput.value;
        const emojiSequences = this.findConsecutiveEmojis(text);
        
        if (emojiSequences.length === 0) {
            return {
                hasAccessibleEmojis: true,
                suggestions: {}
            };
        }
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/analyze-emojis`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    emojiSequences: emojiSequences
                })
            });

            if (!response.ok) {
                let errorData = null;
                try {
                    errorData = await response.json();
                } catch (e) {
                    // If response is not JSON, create error object
                    errorData = { error: `Server error: ${response.statusText}` };
                }
                const errorMessage = (errorData && errorData.error) ? errorData.error : `Server error: ${response.statusText}`;
                throw new Error(errorMessage);
            }

            const result = await response.json();
            console.log('Backend response:', result); // Debug log
            return result;
        } catch (error) {
            console.error('Error calling backend:', error);
            
            // Check if it's a CORS or connection error
            if (error.message.includes('Failed to fetch') || 
                error.message.includes('CORS') || 
                error.message.includes('NetworkError') ||
                error.name === 'TypeError') {
                const connectionError = new Error(`Cannot connect to backend API at ${this.apiBaseUrl}.\n\nPlease ensure:\n1. The backend server is running\n2. The API_BASE_URL is correct\n3. CORS is properly configured`);
                connectionError.name = 'ConnectionError';
                throw connectionError;
            }
            
            // Re-throw with a more descriptive message if needed
            if (error instanceof Error) {
                throw error;
            } else {
                throw new Error(String(error));
            }
        }
    }

    renderSuggestions() {
        // Filter out accepted suggestions
        const pendingSuggestions = Array.from(this.suggestions.entries()).filter(
            ([original]) => !this.acceptedSuggestions.has(original)
        );

        if (pendingSuggestions.length === 0) {
            this.suggestionsList.innerHTML = '<div class="no-suggestions">No recommendations at this time. Great job using accessible emojis!</div>';
            this.acceptAllBtn.style.display = 'none';
            if (this.suggestionsInstruction) {
                this.suggestionsInstruction.style.display = 'none';
            }
            return;
        }

        this.suggestionsList.innerHTML = '';
        this.acceptAllBtn.style.display = 'block';
        
        // Show instructional text when there are suggestions
        if (this.suggestionsInstruction) {
            this.suggestionsInstruction.style.display = 'block';
        }

        pendingSuggestions.forEach(([original, recommendations]) => {
            // recommendations is now an array of 1-2 suggestions
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'suggestion-item';
            
            // Build recommendations HTML
            let recommendationsHtml = '';
            recommendations.forEach((rec, index) => {
                recommendationsHtml += `
                    <button class="btn-accept btn-accept-option" 
                            data-original="${original.replace(/"/g, '&quot;')}" 
                            data-recommended="${rec.replace(/"/g, '&quot;')}">
                        ${rec}
                    </button>
                `;
            });

            suggestionItem.innerHTML = `
                <div class="suggestion-text">
                    <div class="suggestion-original">Current: <strong>${original}</strong></div>
                    <div class="suggestion-recommended">Recommended:</div>
                </div>
                <div class="suggestion-actions">
                    ${recommendationsHtml}
                </div>
            `;

            // Add click handlers for each accept button
            suggestionItem.querySelectorAll('.btn-accept-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    const originalSequence = btn.getAttribute('data-original');
                    const recommendedEmoji = btn.getAttribute('data-recommended');
                    this.acceptSuggestion(originalSequence, recommendedEmoji);
                });
            });

            this.suggestionsList.appendChild(suggestionItem);
        });
    }

    acceptSuggestion(original, recommended) {
        // Replace ALL occurrences of the original emoji sequence with the recommended one in the text
        const text = this.postInput.value;
        // Use a regex to replace all occurrences, matching the exact sequence
        // Escape special regex characters in the emoji sequence
        const escapedOriginal = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedOriginal, 'g');
        const updatedText = text.replace(regex, recommended);
        this.postInput.value = updatedText;

        // Mark as accepted (store which recommendation was chosen)
        this.acceptedSuggestions.set(original, recommended);

        // Remove from suggestions since it's been accepted
        this.suggestions.delete(original);
        this.renderSuggestions();
        
        // Check if all suggestions are now accepted - hide warning if so
        const remainingPending = Array.from(this.suggestions.entries()).filter(
            ([orig]) => !this.acceptedSuggestions.has(orig)
        );
        if (remainingPending.length === 0) {
            this.inlineWarning.style.display = 'none';
        }
        
        // Update submit button state
        this.updateSubmitButtonState();
    }

    acceptAllSuggestions() {
        const text = this.postInput.value;
        let updatedText = text;

        // Replace all pending suggestions - use the first recommendation for each sequence
        Array.from(this.suggestions.entries()).forEach(([original, recommendations]) => {
            if (!this.acceptedSuggestions.has(original) && recommendations.length > 0) {
                // Use the first suggestion as the default
                const recommended = recommendations[0];
                // Use regex to replace all occurrences
                const escapedOriginal = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(escapedOriginal, 'g');
                updatedText = updatedText.replace(regex, recommended);
                this.acceptedSuggestions.set(original, recommended);
            }
        });

        this.postInput.value = updatedText;
        this.suggestions.clear();
        this.renderSuggestions();
        
        // Update submit button state and hide warning
        this.inlineWarning.style.display = 'none';
        // Checkbox is inside inline-warning, so it's hidden automatically
        this.acknowledgeCheckbox.checked = false;
        this.updateSubmitButtonState();
    }

    async handleSubmit() {
        const text = this.postInput.value.trim();
        
        // First check: validate that input has text and emoji sequences
        if (!text || !this.hasEmojiSequences(text)) {
            // Show warning message
            this.noEmojiWarning.style.display = 'block';
            // Scroll warning into view if needed
            this.noEmojiWarning.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return;
        }
        
        // Hide no-emoji warning if it was showing
        this.noEmojiWarning.style.display = 'none';
        
        // Check if we've already analyzed and user is ready to submit
        const pendingSuggestions = Array.from(this.suggestions.entries()).filter(
            ([original]) => !this.acceptedSuggestions.has(original)
        );
        
        // If already analyzed and ready to submit (all accessible OR acknowledged OR all accepted)
        if (this.hasAnalyzed && (this.hasAccessibleEmojis || this.acknowledgeCheckbox.checked || pendingSuggestions.length === 0)) {
            // Already analyzed - submit now
            const hasUnacceptedSuggestions = pendingSuggestions.length > 0;
            
            if (this.hasAccessibleEmojis) {
                this.doSubmit(false); // All accessible
            } else if (pendingSuggestions.length === 0) {
                this.doSubmit(false); // All accepted
            } else if (this.acknowledgeCheckbox.checked) {
                this.doSubmit(true); // Has unaccepted suggestions, acknowledged
            }
            return;
        }
        
        // Otherwise, analyze emojis first
        // Disable submit button while analyzing
        if (!this.submitBtn) {
            console.error('Submit button not found');
            return;
        }
        
        const originalButtonText = this.submitBtn.textContent;
        this.submitBtn.disabled = true;
        this.submitBtn.textContent = 'Analyzing Post Content...';

        try {
            // Call OpenAI API to analyze emojis
            const result = await this.analyzeEmojisWithAI();
            
            // Check if result is valid
            if (!result || typeof result !== 'object') {
                throw new Error('Invalid response from server');
            }
            
            // Store accessibility status
            this.hasAccessibleEmojis = result.hasAccessibleEmojis || false;
            this.hasAnalyzed = true;
            
            // Process the suggestions
            this.suggestions.clear();
            
            // Get emoji sequences from text
            const emojiSequences = this.findConsecutiveEmojis(this.postInput.value);
            
            console.log('Original emoji sequences:', emojiSequences); // Debug log
            console.log('AI suggestions:', result.suggestions); // Debug log
            console.log('Has accessible emojis:', this.hasAccessibleEmojis); // Debug log
            
            // Map AI suggestions to original sequences
            emojiSequences.forEach(originalSequence => {
                let suggestions = result.suggestions[originalSequence];
                
                if (suggestions && Array.isArray(suggestions)) {
                    // Remove duplicate suggestions (preserve first occurrence)
                    const uniqueSuggestions = [];
                    const seen = new Set();
                    for (const suggestion of suggestions) {
                        if (!seen.has(suggestion)) {
                            seen.add(suggestion);
                            uniqueSuggestions.push(suggestion);
                        }
                    }
                    
                    this.suggestions.set(originalSequence, uniqueSuggestions);
                }
            });

            // Render the suggestions
            this.renderSuggestions();
            
            // Check if there are unaccepted suggestions
            const newPendingSuggestions = Array.from(this.suggestions.entries()).filter(
                ([original]) => !this.acceptedSuggestions.has(original)
            );

            if (this.hasAccessibleEmojis) {
                // All emojis are accessible - submit immediately
                this.inlineWarning.style.display = 'none';
                // Checkbox is inside inline-warning, so it's hidden automatically
                this.acknowledgeCheckbox.checked = false;
                this.doSubmit(false); // All accessible
            } else if (newPendingSuggestions.length === 0) {
                // All suggestions were accepted
                this.inlineWarning.style.display = 'none';
                // Checkbox is inside inline-warning, so it's hidden automatically
                this.doSubmit(false); // All accepted
            } else {
                // Show inline warning (checkbox is inside, so it's automatically visible)
                this.inlineWarning.style.display = 'block';
                this.acknowledgeCheckbox.checked = false;
                // Update examples with user's actual emoji sequences
                this.updateWarningExamples(newPendingSuggestions);
                // Don't submit yet - user needs to accept suggestions or acknowledge
            }
            
            // Update submit button state
            this.updateSubmitButtonState();
        } catch (error) {
            console.error('Error in handleSubmit:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            // Check if it's a connection error and provide helpful message
            if (error.name === 'ConnectionError' || errorMessage.includes('Cannot connect to backend')) {
                alert(errorMessage);
            } else {
                alert(`An error occurred while analyzing emojis: ${errorMessage}. Please try again.`);
            }
        } finally {
            // Restore button text (state will be managed by updateSubmitButtonState)
            if (this.submitBtn) {
                this.submitBtn.textContent = originalButtonText;
            }
            this.updateSubmitButtonState();
        }
    }
    
    doSubmit(hasUnacceptedSuggestions) {
        // Hide main interface
        this.emojiRecommenderWrapper.style.display = 'none';
        
        // Update success message based on whether there are unaccepted suggestions
        if (hasUnacceptedSuggestions) {
            // User submitted with unaccepted suggestions - show warning message
            this.successTitle.textContent = 'Please include accessible emojis in your next post.';
            // Change border to red
            this.successMessage.classList.add('success-message-points-lost');
            this.successMessage.classList.remove('success-message-success');
        } else {
            // All accessible or all accepted - show success message
            this.successTitle.textContent = 'Thank you for contributing to a more inclusive Internet.';
            // Change border to green
            this.successMessage.classList.add('success-message-success');
            this.successMessage.classList.remove('success-message-points-lost');
        }
        
        // Show success message
        this.successMessage.style.display = 'block';
        
        // In a real app, this would send to server here
        // You could also: fetch('/api/submit', { method: 'POST', body: JSON.stringify({ post: this.postInput.value }) })
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new EmojiRecommender();
});

