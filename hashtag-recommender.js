// Hashtag Recommender functionality

class HashtagRecommender {
    constructor() {
        this.postInput = document.getElementById('post-input');
        this.generatePostBtn = document.getElementById('generate-post-btn');
        this.suggestionsList = document.getElementById('suggestions-list');
        this.suggestionsInstruction = document.getElementById('suggestions-instruction');
        this.acceptAllBtn = document.getElementById('accept-all-btn');
        this.submitBtn = document.getElementById('submit-btn');
        this.inlineWarning = document.getElementById('inline-warning');
        this.exampleInaccessible = document.getElementById('example-inaccessible');
        this.exampleAccessible = document.getElementById('example-accessible');
        this.checkboxContainer = document.getElementById('checkbox-container-inline');
        this.acknowledgeCheckbox = document.getElementById('acknowledge-checkbox-inline');
        this.successMessage = document.getElementById('success-message');
        this.resetDemoBtn = document.getElementById('reset-demo-btn');
        this.successTitle = document.getElementById('success-title');
        this.noHashtagWarning = document.getElementById('no-hashtag-warning');
        this.hashtagRecommenderWrapper = document.querySelector('.hashtag-recommender-wrapper');
        this.statusMessage = document.getElementById('hashtag-analysis-status');
        
        // Maps original hashtag to array of recommended hashtags (1-3 suggestions)
        this.suggestions = new Map(); 
        this.acceptedSuggestions = new Map(); // Maps original hashtag to the accepted recommendation
        this.hasAccessibleHashtags = true; // Track if all hashtags are accessible
        this.hasAnalyzed = false; // Track if we've already analyzed hashtags
        
        // Backend API configuration
        // Set this to your backend URL (e.g., 'http://localhost:3001' for local dev, or your deployed URL)
        this.apiBaseUrl = window.API_BASE_URL || 'http://localhost:3001';
        
        this.init();
    }

    init() {
        // Listen for submit button
        this.submitBtn.addEventListener('click', () => this.handleSubmit());
        
        // Listen for generate post button
        this.generatePostBtn.addEventListener('click', () => this.generatePost());
        
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
        
        // Initial state: submit button disabled until user enters text with hashtag
        this.updateSubmitButtonState();
    }
    
    hasHashtag(text) {
        // Check if text contains at least one hashtag
        const hashtagRegex = /#[\w]+/g;
        return hashtagRegex.test(text);
    }
    
    generatePost() {
        // Populate the input field with the generated post
        const generatedPost = "Let's work together to make the Internet more accessible! #digitalaccessibility #inclusionmatters #theinternetisforeveryone";
        this.postInput.value = generatedPost;
        
        // Trigger input event to update state
        this.postInput.dispatchEvent(new Event('input'));
        
        // Focus on the input
        this.postInput.focus();
        this.updateStatusMessage('Sample post generated. Submit to analyze hashtags.');
    }
    
    handleManualInputChange() {
        const text = this.postInput.value;
        this.noHashtagWarning.style.display = 'none';
        this.hasAnalyzed = false;
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
        
        const lowerText = text.toLowerCase();
        const updatedSuggestions = new Map();
        
        this.suggestions.forEach((recommendations, original) => {
            const originalLower = original.toLowerCase();
            const hasOriginal = lowerText.includes(originalLower);
            const matchedRecommendation = recommendations.find(rec => lowerText.includes(rec.toLowerCase()));
            
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
        if (this.hashtagRecommenderWrapper) {
            this.hashtagRecommenderWrapper.setAttribute('aria-busy', 'true');
        }
        this.updateStatusMessage(message);
    }

    endLoadingState() {
        if (this.submitBtn) {
            this.submitBtn.classList.remove('btn-loading');
        }
        if (this.hashtagRecommenderWrapper) {
            this.hashtagRecommenderWrapper.removeAttribute('aria-busy');
        }
    }

    updateStatusMessage(message) {
        if (this.statusMessage) {
            this.statusMessage.textContent = message || '';
        }
    }
    
    updateWarningExamples(pendingSuggestions) {
        // Update the inline warning examples with user's actual hashtags
        if (pendingSuggestions.length > 0) {
            // Get the first pending suggestion
            const [originalHashtag, suggestions] = pendingSuggestions[0];
            const firstSuggestion = suggestions && suggestions.length > 0 ? suggestions[0] : null;
            
            // Update the example spans
            if (this.exampleInaccessible) {
                this.exampleInaccessible.textContent = originalHashtag;
            }
            if (this.exampleAccessible && firstSuggestion) {
                this.exampleAccessible.textContent = firstSuggestion;
            }
        }
    }
    
    resetDemo() {
        // Reset everything back to initial state
        this.postInput.value = '';
        this.suggestions.clear();
        this.acceptedSuggestions.clear();
        this.hasAccessibleHashtags = true;
        this.hasAnalyzed = false;
        this.acknowledgeCheckbox.checked = false;
        
        // Hide success message and warnings
        this.successMessage.style.display = 'none';
        this.noHashtagWarning.style.display = 'none';
        this.inlineWarning.style.display = 'none';
        
        // Reset success message state
        this.successTitle.textContent = 'Thank you for contributing to a more inclusive Internet.';
        this.successMessage.classList.remove('success-message-points-lost');
        this.successMessage.classList.add('success-message-success');
        
        // Reset warning examples to defaults
        if (this.exampleInaccessible) {
            this.exampleInaccessible.textContent = '#socialmedia';
        }
        if (this.exampleAccessible) {
            this.exampleAccessible.textContent = '#SocialMedia';
        }
        
        // Show main interface
        this.hashtagRecommenderWrapper.style.display = 'flex';
        
        // Reset UI elements
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
        this.hasAccessibleHashtags = true;
        this.hasAnalyzed = false;
        this.inlineWarning.style.display = 'none';
        // Checkbox is inside inline-warning, so it's hidden automatically
        this.acknowledgeCheckbox.checked = false;
        this.renderSuggestions();
        this.updateSubmitButtonState();
        this.endLoadingState();
        this.updateStatusMessage('');
    }
    
    updateSubmitButtonState() {
        const text = this.postInput.value.trim();
        const hasHashtagInInput = this.hasHashtag(text);
        
        // First check: input must have text and at least one hashtag
        if (!text || !hasHashtagInInput) {
            this.submitBtn.disabled = true;
            return;
        }
        
        // If we haven't analyzed yet, button can be enabled (user can click to analyze)
        if (!this.hasAnalyzed) {
            this.submitBtn.disabled = false;
            return;
        }
        
        // After analysis, check suggestion/acknowledgment status
        const pendingSuggestions = Array.from(this.suggestions.entries()).filter(
            ([original]) => !this.acceptedSuggestions.has(original)
        );
        
        // Enable submit if:
        // 1. All hashtags are accessible (no suggestions needed), OR
        // 2. All suggestions have been accepted (no pending suggestions), OR
        // 3. User has acknowledged inaccessible hashtags (checkbox checked)
        if (this.hasAccessibleHashtags) {
            // All hashtags are already accessible
            this.submitBtn.disabled = false;
        } else if (pendingSuggestions.length === 0) {
            // All suggestions have been accepted
            this.submitBtn.disabled = false;
        } else if (pendingSuggestions.length > 0 && this.acknowledgeCheckbox.checked) {
            // There are unaccepted suggestions BUT user has acknowledged
            this.submitBtn.disabled = false;
        } else {
            // There are unaccepted suggestions AND checkbox is not checked
            // Button must be disabled
            this.submitBtn.disabled = true;
        }
    }

    async analyzeHashtagsWithAI() {
        const text = this.postInput.value;
        // Extract all hashtags from the text
        const hashtagRegex = /#[\w]+/g;
        // Send hashtags WITH the # symbol and preserve original casing
        const hashtags = [...new Set((text.match(hashtagRegex) || []).map(h => h.trim()))];
        
        if (hashtags.length === 0) {
            return { suggestions: {} };
        }

        // Hide API key notice (not needed with backend)
        const notice = document.getElementById('api-key-notice');
        if (notice) {
            notice.style.display = 'none';
        }

        try {
            // Call backend API instead of OpenAI directly
            const response = await fetch(`${this.apiBaseUrl}/api/analyze-hashtags`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ hashtags })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(errorData.error || `Server error: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Backend response:', data); // Debug log
            return data;
        } catch (error) {
            console.error('Error calling backend API:', error);
            
            // Check if it's a CORS or connection error
            if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
                alert(`Cannot connect to backend API at ${this.apiBaseUrl}.\n\nPlease ensure:\n1. The backend server is running\n2. The API_BASE_URL is correct\n3. CORS is properly configured`);
            } else {
                alert(`Error analyzing hashtags: ${error.message}`);
            }
            
            return { suggestions: {} };
        }
    }

    needsCapitalization(text) {
        // A hashtag needs capitalization if:
        // 1. It's all lowercase or mixed case but not properly capitalized
        // 2. It contains multiple words (detected by capital letter transitions or common word patterns)
        
        // If it's already properly capitalized (PascalCase), it doesn't need suggestion
        if (this.isPascalCase(text)) {
            return false;
        }

        // Check if it contains multiple words by looking for:
        // - Transitions from lowercase to uppercase (already capitalized words)
        // - Or by attempting to split into common words
        
        return this.hasMultipleWords(text);
    }

    isPascalCase(text) {
        // Check if text is in PascalCase (first letter capitalized, word boundaries at capital letters)
        if (text.length === 0) return false;
        // Single letter words don't need capitalization suggestions
        if (text.length <= 1) return false;
        if (text[0] !== text[0].toUpperCase()) return false;
        
        // Check for lowercase-to-uppercase transitions (word boundaries)
        let hasWordBoundary = false;
        for (let i = 1; i < text.length; i++) {
            if (text[i-1] === text[i-1].toLowerCase() && text[i] === text[i].toUpperCase()) {
                hasWordBoundary = true;
                break;
            }
        }
        
        return hasWordBoundary;
    }

    getCommonWords() {
        // Shared dictionary of common words used in hashtags
        return [
            'social', 'media', 'web', 'accessibility', 'tech', 'technology', 'digital',
            'online', 'design', 'develop', 'development', 'developer', 'code', 'coding',
            'app', 'application', 'mobile', 'desktop', 'website', 'site', 'internet',
            'for', 'good', 'help', 'support', 'learn', 'learning', 'teach', 'teaching',
            'study', 'work', 'working', 'team', 'community', 'people', 'user', 'users',
            'open', 'source', 'free', 'make', 'build', 'create', 'creative', 'innovation',
            'innovative', 'future', 'today', 'now', 'new', 'best', 'top', 'great',
            'world', 'global', 'local', 'business', 'marketing', 'email', 'brand', 'content',
            'blog', 'blogger', 'writer', 'writing', 'art', 'artist', 'photography',
            'photo', 'video', 'music', 'film', 'movie', 'game', 'gaming', 'sport', 'sports',
            'health', 'fitness', 'food', 'travel', 'fashion', 'style', 'beauty', 'life',
            'love', 'happy', 'inspiration', 'motivation', 'success', 'mind', 'mindset'
        ].sort((a, b) => b.length - a.length); // Sort by length (longest first)
    }

    hasMultipleWords(text) {
        // Try to detect if hashtag contains multiple words
        // This is a heuristic approach - we'll look for common patterns
        
        // Method 1: Check if there are transitions from lowercase to uppercase (word boundaries)
        for (let i = 1; i < text.length; i++) {
            if (text[i-1] === text[i-1].toLowerCase() && text[i] === text[i].toUpperCase()) {
                return true;
            }
        }

        // Method 2: Try to match against common words dictionary (same approach as splitAndCapitalize)
        const commonWords = this.getCommonWords();
        const lowerText = text.toLowerCase();
        let matchedLength = 0;
        let wordCount = 0;

        // Greedily try to match words from the dictionary
        while (matchedLength < lowerText.length) {
            let foundMatch = false;
            
            for (const word of commonWords) {
                if (lowerText.substring(matchedLength).startsWith(word)) {
                    matchedLength += word.length;
                    wordCount++;
                    foundMatch = true;
                    break;
                }
            }
            
            if (!foundMatch) {
                // Couldn't match a word - might be a single word or unknown word
                // If we've matched at least one word, it's likely multiple words
                if (matchedLength > 0 && matchedLength < lowerText.length) {
                    return true; // Partially matched - likely multiple words
                }
                break;
            }
        }

        // If we matched 2+ words from the dictionary, it's definitely multiple words
        if (wordCount >= 2) {
            return true;
        }

        // If we matched most of the text with dictionary words and it's long enough, likely multiple words
        if (matchedLength >= lowerText.length * 0.8 && lowerText.length > 6 && wordCount >= 1) {
            return true;
        }

        // Also check if there are capital letters in the middle (indicating multiple words)
        if (text.length > 3) {
            const hasInternalCapital = /[a-z][A-Z]/.test(text);
            if (hasInternalCapital) return true;
        }

        // If text is long enough, assume it might have multiple words (heuristic)
        return text.length > 8 && this.hasVowelConsonantPattern(text);
    }

    hasVowelConsonantPattern(text) {
        // Check for alternating vowel-consonant patterns which suggest multiple words
        const vowels = 'aeiou';
        let transitions = 0;
        let prevIsVowel = vowels.includes(text[0].toLowerCase());

        for (let i = 1; i < text.length; i++) {
            const isVowel = vowels.includes(text[i].toLowerCase());
            if (isVowel !== prevIsVowel) {
                transitions++;
                prevIsVowel = isVowel;
            }
        }

        // Multiple transitions suggest multiple words
        return transitions > 4;
    }

    capitalizeWords(text) {
        // Split text into words and capitalize each word
        // This is a heuristic - we'll try to identify word boundaries
        
        // Strategy: Look for places where we can insert word boundaries
        // Common pattern: lowercase followed by uppercase (already has boundary)
        // Or: try to identify word boundaries using common patterns
        
        let result = '';
        let currentWord = '';
        let foundBoundaries = false;
        
        // First, handle existing word boundaries (lowercase to uppercase transitions)
        let lastWasLower = false;
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const isLower = char === char.toLowerCase();
            const isUpper = char === char.toUpperCase();
            
            if (i > 0 && lastWasLower && isUpper) {
                // Word boundary detected
                result += this.capitalizeWord(currentWord);
                currentWord = char;
                foundBoundaries = true;
            } else {
                currentWord += char;
            }
            
            lastWasLower = isLower;
        }
        
        if (currentWord) {
            result += this.capitalizeWord(currentWord);
        }
        
        // If no boundaries found (all lowercase or all uppercase), try to split by common word patterns
        if (!foundBoundaries) {
            result = this.splitAndCapitalize(text);
        }
        
        return result;
    }

    capitalizeWord(word) {
        if (word.length === 0) return '';
        return word[0].toUpperCase() + word.slice(1).toLowerCase();
    }

    splitAndCapitalize(text) {
        // Use the shared common words dictionary
        const commonWords = this.getCommonWords();
        
        const lowerText = text.toLowerCase();
        const words = [];
        let remaining = text;
        let remainingLower = lowerText;
        
        // Greedily match longest words first
        while (remainingLower.length > 0) {
            let matched = false;
            
            // Try to match from dictionary
            for (const word of commonWords) {
                if (remainingLower.startsWith(word)) {
                    // Check if this match makes sense (word boundary conditions)
                    const matchLength = word.length;
                    
                    // Extract the matched portion from original text (preserving case)
                    const matchedText = remaining.substring(0, matchLength);
                    words.push(matchedText);
                    
                    remaining = remaining.substring(matchLength);
                    remainingLower = remainingLower.substring(matchLength);
                    matched = true;
                    break;
                }
            }
            
            if (!matched) {
                // If we can't find a word match, try to find a reasonable split point
                // Look for common patterns that suggest word boundaries
                
                // Check if there's a vowel followed by consonants (common word ending pattern)
                let splitPoint = -1;
                for (let i = 3; i < Math.min(remaining.length, 10); i++) {
                    const char = remainingLower[i];
                    const prevChar = remainingLower[i - 1];
                    const nextChar = remainingLower[i + 1] || '';
                    
                    // Pattern: consonant-vowel-consonant might indicate a word boundary
                    const isVowel = 'aeiou'.includes(char);
                    const prevIsVowel = 'aeiou'.includes(prevChar);
                    
                    if (isVowel && !prevIsVowel && nextChar && !'aeiou'.includes(nextChar)) {
                        // Potential word boundary
                        if (i >= 3 && remaining.length - i >= 3) {
                            splitPoint = i;
                            break;
                        }
                    }
                }
                
                if (splitPoint > 0) {
                    words.push(remaining.substring(0, splitPoint));
                    remaining = remaining.substring(splitPoint);
                    remainingLower = remainingLower.substring(splitPoint);
                } else {
                    // Can't split intelligently, just take the rest as one word
                    if (remaining.length > 0) {
                        words.push(remaining);
                    }
                    break;
                }
            }
        }
        
        // Capitalize each word
        return words.map(word => this.capitalizeWord(word)).join('');
    }

    renderSuggestions() {
        // Filter out accepted suggestions
        const pendingSuggestions = Array.from(this.suggestions.entries()).filter(
            ([original]) => !this.acceptedSuggestions.has(original)
        );

        if (pendingSuggestions.length === 0) {
            this.suggestionsList.innerHTML = '<div class="no-suggestions" role="note">No suggestions at this time. Great job using accessible hashtags!</div>';
            this.acceptAllBtn.style.display = 'none';
            if (this.suggestionsInstruction) {
                this.suggestionsInstruction.style.display = 'none';
            }
            return;
        }

        this.suggestionsList.innerHTML = '';
        this.acceptAllBtn.style.display = 'block';
        if (this.suggestionsInstruction) {
            this.suggestionsInstruction.style.display = 'block';
        }
        
        // Show instructional text when there are suggestions
        pendingSuggestions.forEach(([original, recommendations]) => {
            // recommendations is now an array of 1-3 suggestions
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'suggestion-item';
            
            // Build recommendations HTML
            let recommendationsHtml = '';
            recommendations.forEach((rec) => {
                const safeOriginal = original.replace(/"/g, '&quot;');
                const safeRec = rec.replace(/"/g, '&quot;');
                recommendationsHtml += `
                    <button class="btn-accept btn-accept-option" 
                            type="button"
                            aria-label="Replace ${safeOriginal} with ${safeRec}"
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

            // Add click handlers for each accept button
            suggestionItem.querySelectorAll('.btn-accept-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    const originalHashtag = btn.getAttribute('data-original');
                    const recommendedHashtag = btn.getAttribute('data-recommended');
                    this.acceptSuggestion(originalHashtag, recommendedHashtag);
                });
            });

            this.suggestionsList.appendChild(suggestionItem);
        });
    }

    acceptSuggestion(original, recommended) {
        // Replace ALL occurrences of the original hashtag with the recommended one in the text
        const text = this.postInput.value;
        // Use a regex to replace all occurrences, matching the exact hashtag (case-insensitive for safety)
        const regex = new RegExp(original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
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
            this.updateStatusMessage('Suggestion applied. Review remaining recommendations before submitting.');
        }
    }

    acceptAllSuggestions() {
        const text = this.postInput.value;
        let updatedText = text;

        // Replace all pending suggestions - use the first recommendation for each hashtag
        Array.from(this.suggestions.entries()).forEach(([original, recommendations]) => {
            if (!this.acceptedSuggestions.has(original) && recommendations.length > 0) {
                // Use the first suggestion as the default
                const recommended = recommendations[0];
                // Use regex to replace all occurrences
                const regex = new RegExp(original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
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
        
        // First check: validate that input has text and hashtag
        if (!text || !this.hasHashtag(text)) {
            // Show warning message
            this.noHashtagWarning.style.display = 'block';
            // Scroll warning into view if needed
            this.noHashtagWarning.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            this.updateStatusMessage('Please include a hashtag in your text in order to run the demo.');
            return;
        }
        
        // Hide no-hashtag warning if it was showing
        this.noHashtagWarning.style.display = 'none';
        this.updateStatusMessage('');
        
        // Check if we've already analyzed and user has acknowledged remaining issues
        const pendingSuggestions = Array.from(this.suggestions.entries()).filter(
            ([original]) => !this.acceptedSuggestions.has(original)
        );
        
        if (this.hasAnalyzed && this.acknowledgeCheckbox.checked && pendingSuggestions.length > 0) {
            this.showLoadingState('Submitting post. Please wait.');
            const originalButtonText = this.submitBtn.textContent;
            this.submitBtn.disabled = true;
            this.submitBtn.textContent = 'Submitting Post...';
            // Already analyzed - submit now
            this.doSubmit(true); // submitting with acknowledgement
            this.submitBtn.textContent = originalButtonText;
            this.submitBtn.disabled = false;
            return;
        }
        
        // Otherwise, analyze hashtags first
        // Disable submit button while analyzing
        this.acceptedSuggestions.clear();
        this.suggestions.clear();
        this.hasAccessibleHashtags = false;

        const originalButtonText = this.submitBtn.textContent;
        this.submitBtn.disabled = true;
        this.submitBtn.textContent = 'Analyzing Post Content...';
        this.showLoadingState('Analyzing post content. Please wait.');

        try {
            // Call OpenAI API to analyze hashtags
            const result = await this.analyzeHashtagsWithAI();
            
            // Store accessibility status
            this.hasAccessibleHashtags = result.hasAccessibleHashtags || false;
            this.hasAnalyzed = true;
            
            // Process the suggestions
            this.suggestions.clear();
            
            // Convert lowercase hashtags from AI to original case hashtags from text
            const text = this.postInput.value;
            const hashtagRegex = /#[\w]+/g;
            const originalHashtags = text.match(hashtagRegex) || [];
            
            console.log('Original hashtags:', originalHashtags); // Debug log
            console.log('AI suggestions:', result.suggestions); // Debug log
            console.log('Has accessible hashtags:', this.hasAccessibleHashtags); // Debug log
            
            // Map AI suggestions (lowercase keys) to original hashtags
            // AI might return keys with or without #, so check both
            originalHashtags.forEach(originalHashtag => {
                const lowerHashtag = originalHashtag.toLowerCase(); // e.g., "#socialmedia"
                const lowerHashtagNoHash = lowerHashtag.substring(1); // e.g., "socialmedia"
                
                // Check for hashtag with # first, then without #
                let suggestions = result.suggestions[lowerHashtag] || result.suggestions[lowerHashtagNoHash];
                
                if (suggestions && Array.isArray(suggestions)) {
                    // Ensure all suggestions have # prefix
                    suggestions = suggestions.map(s => 
                        s.startsWith('#') ? s : `#${s}`
                    );
                    
                    // Remove duplicate suggestions (case-insensitive, preserve first occurrence)
                    const uniqueSuggestions = [];
                    const seen = new Set();
                    for (const suggestion of suggestions) {
                        const normalized = suggestion.toLowerCase();
                        if (!seen.has(normalized)) {
                            seen.add(normalized);
                            uniqueSuggestions.push(suggestion);
                        }
                    }
                    
                    this.suggestions.set(originalHashtag, uniqueSuggestions);
                }
            });

            // Render the suggestions
            this.renderSuggestions();
            
            // Check if there are unaccepted suggestions
            const newPendingSuggestions = Array.from(this.suggestions.entries()).filter(
                ([original]) => !this.acceptedSuggestions.has(original)
            );

            if (this.hasAccessibleHashtags) {
                // All hashtags are accessible - submit immediately
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
                // Update examples with user's actual hashtags
                this.updateWarningExamples(newPendingSuggestions);
                // Don't submit yet - user needs to accept suggestions or acknowledge
                this.updateStatusMessage('Review the hashtag recommendations before submitting your post.');
            }
            
            // Update submit button state
            this.updateSubmitButtonState();
        } catch (error) {
            console.error('Error in handleSubmit:', error);
            this.updateStatusMessage('An error occurred while analyzing hashtags. Please try again.');
            alert('An error occurred while analyzing hashtags. Please try again.');
        } finally {
            // Restore button text (state will be managed by updateSubmitButtonState)
            this.submitBtn.textContent = originalButtonText;
            this.updateSubmitButtonState();
            this.endLoadingState();
        }
    }
    
    doSubmit(hasUnacceptedSuggestions) {
        // Hide main interface
        this.hashtagRecommenderWrapper.style.display = 'none';
        this.endLoadingState();
        
        // Update success message based on whether there are unaccepted suggestions
        if (hasUnacceptedSuggestions) {
            // User submitted with unaccepted suggestions - show warning message
            this.successTitle.textContent = 'Please include accessible hashtags in your next post.';
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
    new HashtagRecommender();
});
