// Hashtag Recommender functionality

class HashtagRecommender {
    constructor() {
        this.postInput = document.getElementById('post-input');
        this.suggestionsList = document.getElementById('suggestions-list');
        this.acceptAllBtn = document.getElementById('accept-all-btn');
        this.submitBtn = document.getElementById('submit-btn');
        this.warningModal = document.getElementById('warning-modal');
        this.acknowledgeCheckbox = document.getElementById('acknowledge-checkbox');
        this.modalSubmitBtn = document.getElementById('modal-submit-btn');
        this.modalAcceptSuggestionsBtn = document.getElementById('modal-accept-suggestions-btn');
        
        // Maps original hashtag to array of recommended hashtags (1-3 suggestions)
        this.suggestions = new Map(); 
        this.acceptedSuggestions = new Map(); // Maps original hashtag to the accepted recommendation
        
        // Backend API configuration
        // Set this to your backend URL (e.g., 'http://localhost:3001' for local dev, or your deployed URL)
        this.apiBaseUrl = window.API_BASE_URL || 'http://localhost:3001';
        
        this.init();
    }

    init() {
        // Listen for submit button
        this.submitBtn.addEventListener('click', () => this.handleSubmit());
        
        // Listen for accept all button
        this.acceptAllBtn.addEventListener('click', () => this.acceptAllSuggestions());
        
        // Modal interactions
        this.acknowledgeCheckbox.addEventListener('change', (e) => {
            this.modalSubmitBtn.disabled = !e.target.checked;
        });
        
        this.modalSubmitBtn.addEventListener('click', () => {
            this.warningModal.classList.remove('active');
            this.acknowledgeCheckbox.checked = false;
            this.modalSubmitBtn.disabled = true;
            // In a real app, this would submit to the server
            alert('Post submitted (with inaccessible hashtags)');
        });
        
        this.modalAcceptSuggestionsBtn.addEventListener('click', () => {
            // User chose to accept suggestions from modal - close modal first, then they can accept
            this.warningModal.classList.remove('active');
        });

        // Close modal when clicking outside
        this.warningModal.addEventListener('click', (e) => {
            if (e.target === this.warningModal) {
                this.warningModal.classList.remove('active');
                this.acknowledgeCheckbox.checked = false;
                this.modalSubmitBtn.disabled = true;
            }
        });
    }

    async analyzeHashtagsWithAI() {
        const text = this.postInput.value;
        // Extract all hashtags from the text
        const hashtagRegex = /#[\w]+/g;
        const hashtags = [...new Set((text.match(hashtagRegex) || []).map(h => h.toLowerCase()))];
        
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
            this.suggestionsList.innerHTML = '<div class="no-suggestions">No suggestions at this time. Great job using accessible hashtags!</div>';
            this.acceptAllBtn.style.display = 'none';
            return;
        }

        this.suggestionsList.innerHTML = '';
        this.acceptAllBtn.style.display = 'block';

        pendingSuggestions.forEach(([original, recommendations]) => {
            // recommendations is now an array of 1-3 suggestions
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
    }

    async handleSubmit() {
        // Disable submit button while analyzing
        const originalButtonText = this.submitBtn.textContent;
        this.submitBtn.disabled = true;
        this.submitBtn.textContent = 'Analyzing hashtags...';

        try {
            // Call OpenAI API to analyze hashtags
            const result = await this.analyzeHashtagsWithAI();
            
            // Process the suggestions
            this.suggestions.clear();
            
            // Convert lowercase hashtags from AI to original case hashtags from text
            const text = this.postInput.value;
            const hashtagRegex = /#[\w]+/g;
            const originalHashtags = text.match(hashtagRegex) || [];
            
            // Map AI suggestions (lowercase keys) to original hashtags
            originalHashtags.forEach(originalHashtag => {
                const lowerHashtag = originalHashtag.toLowerCase();
                if (result.suggestions[lowerHashtag]) {
                    // Convert suggestions to include # and match original case pattern
                    const suggestions = result.suggestions[lowerHashtag].map(s => 
                        s.startsWith('#') ? s : `#${s}`
                    );
                    this.suggestions.set(originalHashtag, suggestions);
                }
            });

            // Render the suggestions
            this.renderSuggestions();

            // Check if there are unaccepted suggestions
            const pendingSuggestions = Array.from(this.suggestions.entries()).filter(
                ([original]) => !this.acceptedSuggestions.has(original)
            );

            if (pendingSuggestions.length > 0) {
                // Show warning modal
                this.warningModal.classList.add('active');
                this.acknowledgeCheckbox.checked = false;
                this.modalSubmitBtn.disabled = true;
            } else {
                // All suggestions accepted or no suggestions - submit normally
                alert('Post submitted successfully!');
            }
        } catch (error) {
            console.error('Error in handleSubmit:', error);
            alert('An error occurred while analyzing hashtags. Please try again.');
        } finally {
            // Re-enable submit button
            this.submitBtn.disabled = false;
            this.submitBtn.textContent = originalButtonText;
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new HashtagRecommender();
});
