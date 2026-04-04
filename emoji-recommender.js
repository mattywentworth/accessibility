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
        this.statusMessage = document.getElementById('emoji-analysis-status');
        this.inlineWarningCopyPerCluster = document.getElementById('inline-warning-recommendation-copy-per-cluster');
        this.inlineWarningCopyTrailing = document.getElementById('inline-warning-recommendation-copy-trailing');

        // Maps original emoji sequence to array of recommended emojis (1-2 suggestions)
        this.suggestions = new Map();
        this.acceptedSuggestions = new Map(); // Maps original sequence to the accepted recommendation
        this.hasAccessibleEmojis = true; // Track if all emojis are accessible
        this.hasAnalyzed = false; // Track if we've already analyzed emojis
        /** @type {'trailing' | 'perCluster' | null} */
        this.activeRecommendationMode = null;
        /** @type {{ primary: string, alternates: string[] } | null} */
        this.trailingProposal = null;
        
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
        
        // Listen for input changes to update recommendations without clearing the panel
        this.postInput.addEventListener('input', () => {
            this.handleManualInputChange();
        });
        
        // Listen for reset demo button
        this.resetDemoBtn.addEventListener('click', () => {
            this.resetDemo();
        });

        document.querySelectorAll('input[name="emoji-recommendation-mode"]').forEach((radio) => {
            radio.addEventListener('change', () => {
                if (this.hasAnalyzed) {
                    this.clearAnalysisState();
                }
                this.updateStatusMessage('Recommendation style updated. Click Submit to analyze your post.');
            });
        });

        // Initial state: submit button disabled until user enters text with emoji sequences
        this.updateSubmitButtonState();
    }

    getRecommendationMode() {
        const checked = document.querySelector('input[name="emoji-recommendation-mode"]:checked');
        return checked && checked.value === 'perCluster' ? 'perCluster' : 'trailing';
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

    /**
     * Removes every run of 2+ consecutive emojis from text (iteratively).
     */
    removeConsecutiveEmojiSequences(text) {
        let result = text;
        let guard = 0;
        while (guard++ < 64) {
            const seqs = this.findConsecutiveEmojis(result);
            if (seqs.length === 0) break;
            const seq = seqs[0];
            const escaped = seq.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            result = result.replace(new RegExp(escaped, 'g'), '');
        }
        return result.replace(/\s{2,}/g, ' ').trim();
    }
    
    generatePost() {
        // Populate the input field with the generated post
        const generatedPost = "I'm so excited! 🎉🎊🎈 Flying to NYC for vacation tomorrow 🛫🛬🗽🍕🍜  I hope I get to see some of the city's greatest non-human living things 🐀🎄";
        this.postInput.value = generatedPost;
        
        // Trigger input event to update state
        this.postInput.dispatchEvent(new Event('input'));
        
        // Focus on the input
        this.postInput.focus();
        this.updateStatusMessage('Sample post generated. Submit to analyze emojis.');
    }
    
    handleManualInputChange() {
        const text = this.postInput.value;
        if (this.noEmojiWarning) {
            this.noEmojiWarning.style.display = 'none';
        }
        this.hasAnalyzed = false;
        this.trailingProposal = null;
        this.activeRecommendationMode = null;
        this.endLoadingState();

        if (!text.trim()) {
            this.suggestions.clear();
            this.acceptedSuggestions.clear();
            this.inlineWarning.style.display = 'none';
            this.acknowledgeCheckbox.checked = false;
            this.renderSuggestions();
            this.updateSubmitButtonState();
            this.updateStatusMessage('');
            return;
        }
        
        const updatedSuggestions = new Map();
        
        this.suggestions.forEach((recommendations, original) => {
            const hasOriginal = text.includes(original);
            const matchedRecommendation = recommendations.find(rec => text.includes(rec));
            
            if (hasOriginal) {
                updatedSuggestions.set(original, recommendations);
                this.acceptedSuggestions.delete(original);
            } else if (matchedRecommendation) {
                this.acceptedSuggestions.set(original, matchedRecommendation);
            } else {
                this.acceptedSuggestions.delete(original);
            }
        });
        
        this.suggestions = updatedSuggestions;
        
        if (this.suggestions.size > 0) {
            this.inlineWarning.style.display = 'block';
            const pendingArray = Array.from(this.suggestions.entries());
            this.updateWarningExamples(pendingArray);
            this.updateInlineWarningCopyVisibility();
            this.updateStatusMessage('Post updated. Review remaining recommendations or click Submit to re-run analysis.');
        } else {
            this.inlineWarning.style.display = 'none';
            this.acknowledgeCheckbox.checked = false;
            this.updateStatusMessage('Post updated. Click Submit to re-run analysis and confirm accessibility.');
        }
        
        this.renderSuggestions();
        this.updateSubmitButtonState();
    }
    
    showLoadingState(message) {
        if (this.submitBtn) {
            this.submitBtn.classList.add('btn-loading');
        }
        if (this.emojiRecommenderWrapper) {
            this.emojiRecommenderWrapper.setAttribute('aria-busy', 'true');
        }
        this.updateStatusMessage(message);
    }

    endLoadingState() {
        if (this.submitBtn) {
            this.submitBtn.classList.remove('btn-loading');
        }
        if (this.emojiRecommenderWrapper) {
            this.emojiRecommenderWrapper.removeAttribute('aria-busy');
        }
    }

    updateStatusMessage(message) {
        if (this.statusMessage) {
            this.statusMessage.textContent = message || '';
        }
    }
    
    updateWarningExamples(pendingSuggestions) {
        if (this.activeRecommendationMode === 'trailing' && this.trailingProposal) {
            const text = this.postInput.value;
            const seqs = this.findConsecutiveEmojis(text);
            if (this.exampleExcessive) {
                this.exampleExcessive.textContent = seqs.length > 0 ? seqs[0] : '🎉🎊🎈';
            }
            if (this.exampleRecommended) {
                this.exampleRecommended.textContent = this.trailingProposal.primary;
            }
            return;
        }
        if (pendingSuggestions.length > 0) {
            const [originalSequence, suggestions] = pendingSuggestions[0];
            const firstSuggestion = suggestions && suggestions.length > 0 ? suggestions[0] : null;

            if (this.exampleExcessive) {
                this.exampleExcessive.textContent = originalSequence;
            }
            if (this.exampleRecommended && firstSuggestion) {
                this.exampleRecommended.textContent = firstSuggestion;
            }
        }
    }

    updateInlineWarningCopyVisibility() {
        if (!this.inlineWarningCopyPerCluster || !this.inlineWarningCopyTrailing) return;
        if (this.activeRecommendationMode === 'trailing') {
            this.inlineWarningCopyPerCluster.style.display = 'none';
            this.inlineWarningCopyTrailing.style.display = 'block';
        } else {
            this.inlineWarningCopyPerCluster.style.display = 'block';
            this.inlineWarningCopyTrailing.style.display = 'none';
        }
    }
    
    resetDemo() {
        // Reset everything back to initial state
        this.postInput.value = '';
        this.suggestions.clear();
        this.acceptedSuggestions.clear();
        this.hasAccessibleEmojis = true;
        this.hasAnalyzed = false;
        this.trailingProposal = null;
        this.activeRecommendationMode = null;
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
        if (this.submitBtn) {
            this.submitBtn.textContent = 'Submit Post';
            this.submitBtn.disabled = true;
        }
        this.renderSuggestions();
        this.updateSubmitButtonState();
        
        // Focus on input
        this.postInput.focus();
        this.endLoadingState();
        this.updateStatusMessage('');
    }
    
    clearAnalysisState() {
        // Clear previous analysis when user types
        this.suggestions.clear();
        this.acceptedSuggestions.clear();
        this.trailingProposal = null;
        this.activeRecommendationMode = null;
        this.hasAccessibleEmojis = true;
        this.hasAnalyzed = false;
        this.inlineWarning.style.display = 'none';
        // Checkbox is inside inline-warning, so it's hidden automatically
        this.acknowledgeCheckbox.checked = false;
        if (this.submitBtn) {
            this.submitBtn.textContent = 'Submit Post';
        }
        this.renderSuggestions();
        this.updateSubmitButtonState();
        this.endLoadingState();
        this.updateStatusMessage('');
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
            this.submitBtn.disabled = false;
            return;
        }

        const trailingPending =
            this.activeRecommendationMode === 'trailing' && this.trailingProposal !== null;
        const pendingSuggestions = Array.from(this.suggestions.entries()).filter(
            ([original]) => !this.acceptedSuggestions.has(original)
        );

        if (!trailingPending && pendingSuggestions.length === 0) {
            this.submitBtn.disabled = false;
            return;
        }

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
                    emojiSequences: emojiSequences,
                    recommendationMode: this.getRecommendationMode()
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
        if (this.activeRecommendationMode === 'trailing' && this.trailingProposal) {
            const { primary, alternates } = this.trailingProposal;
            this.suggestionsList.innerHTML = '';
            if (this.suggestionsInstruction) {
                this.suggestionsInstruction.textContent =
                    'Pick one emoji. Applying it removes every cluster of multiple emojis from your post and adds that emoji at the end.';
                this.suggestionsInstruction.style.display = 'block';
            }

            const item = document.createElement('div');
            item.className = 'suggestion-item';
            const choices = [primary, ...alternates].filter(Boolean);
            let buttonsHtml = '';
            choices.forEach((em, i) => {
                const labelPlain =
                    i === 0 ? `Apply suggested emoji at end of post (primary)` : `Apply alternate emoji at end of post`;
                const safeLabel = labelPlain.replace(/"/g, '&quot;');
                buttonsHtml += `
                    <button class="btn-accept btn-accept-option emoji-btn" type="button"
                            aria-label="${safeLabel}">
                        ${em}
                    </button>
                `;
            });
            item.innerHTML = `
                <div class="suggestion-text">
                    <div class="suggestion-original">Style: <strong>One emoji at the end</strong></div>
                    <div class="suggestion-recommended">Suggested emoji to append after your text:</div>
                </div>
                <div class="suggestion-actions">${buttonsHtml}</div>
            `;
            const emojiButtons = item.querySelectorAll('.emoji-btn');
            emojiButtons.forEach((btn) => {
                btn.addEventListener('click', () => {
                    const em = btn.textContent.trim();
                    if (em) this.acceptTrailingEmoji(em);
                });
            });
            this.suggestionsList.appendChild(item);
            this.acceptAllBtn.style.display = 'block';
            this.acceptAllBtn.textContent = 'Apply primary emoji at end';
            return;
        }

        this.acceptAllBtn.textContent = 'Accept All Recommendations';

        const pendingSuggestions = Array.from(this.suggestions.entries()).filter(
            ([original]) => !this.acceptedSuggestions.has(original)
        );

        if (pendingSuggestions.length === 0) {
            this.suggestionsList.innerHTML =
                '<div class="no-suggestions" role="note">No recommendations at this time. Great job using accessible emojis!</div>';
            this.acceptAllBtn.style.display = 'none';
            if (this.suggestionsInstruction) {
                this.suggestionsInstruction.style.display = 'none';
            }
            return;
        }

        this.suggestionsList.innerHTML = '';
        this.acceptAllBtn.style.display = 'block';
        if (this.suggestionsInstruction) {
            this.suggestionsInstruction.textContent =
                'Click a suggestion to replace that emoji cluster in your post, or use “Accept All Recommendations”.';
            this.suggestionsInstruction.style.display = 'block';
        }
        
        pendingSuggestions.forEach(([original, recommendations]) => {
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'suggestion-item';
            
            let recommendationsHtml = '';
            recommendations.forEach((rec) => {
                const safeOriginal = original.replace(/"/g, '&quot;');
                const safeRec = rec.replace(/"/g, '&quot;');
                recommendationsHtml += `
                    <button class="btn-accept btn-accept-option emoji-btn" 
                            type="button"
                            aria-label="Replace emoji sequence ${safeOriginal} with ${safeRec}"
                            data-original="${safeOriginal}" 
                            data-recommended="${safeRec}">
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

    acceptTrailingEmoji(emoji) {
        if (!emoji) return;
        let t = this.removeConsecutiveEmojiSequences(this.postInput.value);
        t = t.replace(/\s{2,}/g, ' ').trim();
        this.postInput.value = t.length ? `${t} ${emoji}` : emoji;
        this.trailingProposal = null;
        this.hasAccessibleEmojis = true;
        this.inlineWarning.style.display = 'none';
        this.acknowledgeCheckbox.checked = false;
        this.renderSuggestions();
        this.updateSubmitButtonState();
        this.updateStatusMessage('Emoji applied at the end of your post. You can submit.');
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
        
        if (remainingPending.length === 0) {
            this.updateStatusMessage('All recommendations have been applied. You can submit your post.');
        } else {
            this.updateStatusMessage('Emoji applied. Review remaining recommendations before submitting.');
        }
    }

    acceptAllSuggestions() {
        if (this.activeRecommendationMode === 'trailing' && this.trailingProposal) {
            this.acceptTrailingEmoji(this.trailingProposal.primary);
            return;
        }

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
        this.updateStatusMessage('All recommendations have been applied. You can submit your post.');
    }

    async handleSubmit() {
        const text = this.postInput.value.trim();
        
        // First check: validate that input has text and emoji sequences
        if (!text || !this.hasEmojiSequences(text)) {
            // Show warning message
            this.noEmojiWarning.style.display = 'block';
            // Scroll warning into view if needed
            this.noEmojiWarning.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            this.updateStatusMessage('Please include multiple consecutive emojis to run this demo.');
            return;
        }
        
        // Hide no-emoji warning if it was showing
        this.noEmojiWarning.style.display = 'none';
        this.updateStatusMessage('');
        
        const pendingSuggestions = Array.from(this.suggestions.entries()).filter(
            ([original]) => !this.acceptedSuggestions.has(original)
        );
        const trailingStillPending =
            this.hasAnalyzed &&
            this.activeRecommendationMode === 'trailing' &&
            this.trailingProposal !== null;

        if (
            this.hasAnalyzed &&
            this.acknowledgeCheckbox.checked &&
            (pendingSuggestions.length > 0 || trailingStillPending)
        ) {
            this.showLoadingState('Submitting post. Please wait.');
            const originalButtonText = this.submitBtn ? this.submitBtn.textContent : 'Submit Post';
            if (this.submitBtn) {
                this.submitBtn.disabled = true;
                this.submitBtn.textContent = 'Submitting Post...';
            }
            // Already analyzed - submit now
            this.doSubmit(true); // Has unaccepted suggestions, acknowledged
            if (this.submitBtn) {
                this.submitBtn.textContent = originalButtonText;
                this.submitBtn.disabled = false;
            }
            return;
        }
        
        // Otherwise, analyze emojis first
        // Disable submit button while analyzing
        this.acceptedSuggestions.clear();
        this.suggestions.clear();
        this.trailingProposal = null;
        this.hasAccessibleEmojis = false;

        if (!this.submitBtn) {
            console.error('Submit button not found');
            return;
        }
        
        const originalButtonText = this.submitBtn.textContent;
        this.submitBtn.disabled = true;
        this.submitBtn.textContent = 'Analyzing Post Content...';
        this.showLoadingState('Analyzing emojis. Please wait.');

        try {
            // Call OpenAI API to analyze emojis
            const result = await this.analyzeEmojisWithAI();
            
            // Check if result is valid
            if (!result || typeof result !== 'object') {
                throw new Error('Invalid response from server');
            }
            
            this.hasAccessibleEmojis = result.hasAccessibleEmojis || false;
            this.hasAnalyzed = true;

            this.suggestions.clear();

            if (result.recommendationMode === 'trailing' && result.trailingEmoji) {
                this.activeRecommendationMode = 'trailing';
                this.trailingProposal = {
                    primary: result.trailingEmoji,
                    alternates: Array.isArray(result.alternateTrailingEmojis)
                        ? result.alternateTrailingEmojis
                        : []
                };
            } else {
                this.activeRecommendationMode = 'perCluster';
                this.trailingProposal = null;
                const emojiSequences = this.findConsecutiveEmojis(this.postInput.value);

                console.log('Original emoji sequences:', emojiSequences);
                console.log('AI suggestions:', result.suggestions);
                console.log('Has accessible emojis:', this.hasAccessibleEmojis);

                emojiSequences.forEach((originalSequence) => {
                    let sug = result.suggestions[originalSequence];

                    if (sug && Array.isArray(sug)) {
                        const uniqueSuggestions = [];
                        const seen = new Set();
                        for (const suggestion of sug) {
                            if (!seen.has(suggestion)) {
                                seen.add(suggestion);
                                uniqueSuggestions.push(suggestion);
                            }
                        }

                        this.suggestions.set(originalSequence, uniqueSuggestions);
                    }
                });
            }

            this.renderSuggestions();

            const newPendingTrailing =
                this.activeRecommendationMode === 'trailing' && this.trailingProposal !== null;
            const newPendingSuggestions = Array.from(this.suggestions.entries()).filter(
                ([original]) => !this.acceptedSuggestions.has(original)
            );

            if (this.hasAccessibleEmojis) {
                this.inlineWarning.style.display = 'none';
                this.acknowledgeCheckbox.checked = false;
                this.doSubmit(false);
            } else if (!newPendingTrailing && newPendingSuggestions.length === 0) {
                this.inlineWarning.style.display = 'none';
                this.acknowledgeCheckbox.checked = false;
                this.doSubmit(false);
            } else {
                this.inlineWarning.style.display = 'block';
                this.acknowledgeCheckbox.checked = false;
                if (newPendingTrailing) {
                    this.updateWarningExamples([]);
                } else {
                    this.updateWarningExamples(newPendingSuggestions);
                }
                this.updateInlineWarningCopyVisibility();
                this.updateStatusMessage('Review the emoji recommendations before submitting your post.');
            }
            
            // Update submit button state
            this.updateSubmitButtonState();
        } catch (error) {
            console.error('Error in handleSubmit:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.updateStatusMessage('An error occurred while analyzing emojis. Please try again.');
            
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
            this.endLoadingState();
        }
    }
    
    doSubmit(hasUnacceptedSuggestions) {
        // Hide main interface
        this.emojiRecommenderWrapper.style.display = 'none';
        this.endLoadingState();
        
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
        this.updateStatusMessage('Post submitted. Analysis complete.');
        if (this.submitBtn) {
            this.submitBtn.textContent = 'Submit Post';
            this.submitBtn.disabled = false;
        }
        if (this.successMessage) {
            this.successMessage.focus();
        }
        
        // In a real app, this would send to server here
        // You could also: fetch('/api/submit', { method: 'POST', body: JSON.stringify({ post: this.postInput.value }) })
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new EmojiRecommender();
});

