const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// CORS configuration - allow all origins (including Netlify)
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json());

// Proxy endpoint for OpenAI API
app.post('/api/analyze-hashtags', async (req, res) => {
  try {
    const { hashtags } = req.body;

    if (!hashtags || !Array.isArray(hashtags) || hashtags.length === 0) {
      return res.status(400).json({ error: 'Hashtags array is required' });
    }

    // Get API key from environment variable
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error('OpenAI API key not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Build prompt for OpenAI - note: hashtags include # symbol
    const prompt = `Analyze the following hashtags and determine if they represent MULTIPLE uncapitalized words. For each hashtag that contains MULTIPLE words (not single words), suggest 1-3 PascalCase alternatives. Return ONLY a valid JSON object with this exact structure:

{
  "hasAccessibleHashtags": true/false,
  "suggestions": {
    "#hashtag1": ["#Suggestion1", "#Suggestion2"],
    "#hashtag2": ["#Suggestion1"]
  }
}

CRITICAL RULES:
- ONLY analyze hashtags that clearly contain MULTIPLE words (e.g., "#socialmedia" = "social" + "media")
- DO NOT suggest capitalization for single-word hashtags (e.g., "#friendship", "#happy", "#love", "#coding" are single words - ignore them completely)
- DO NOT suggest capitalization for hashtags that are already properly formatted in PascalCase (e.g., "#SocialMedia" is already correct)
- Set "hasAccessibleHashtags" to true if ALL hashtags are either: (1) already PascalCase, OR (2) single words that don't need improvement. Set to false if ANY hashtag contains multiple uncapitalized words.
- In "suggestions", use the EXACT hashtag (with # symbol) as the key
- Include # symbol in all suggestion values
- Single-word hashtags should NOT appear in the suggestions object at all
- If hasAccessibleHashtags is true, the suggestions object should be empty {}

Examples:
- "#friendship" → single word, IGNORE (don't include in suggestions)
- "#socialmedia" → multiple words ("social" + "media"), SUGGEST "#SocialMedia"
- "#SocialMedia" → already correct, IGNORE
- "#webaccessibility" → multiple words, SUGGEST "#WebAccessibility"
- "#love" → single word, IGNORE

Hashtags to analyze: ${hashtags.join(', ')}`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that analyzes hashtags for accessibility. Return only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, errorData);
      return res.status(response.status).json({ 
        error: `OpenAI API error: ${response.statusText}` 
      });
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content.trim();
    
    console.log('OpenAI raw response:', aiResponse); // Debug log
    
    // Parse JSON response (handle potential markdown code blocks)
    let parsedResponse = {};
    try {
      // Remove markdown code blocks if present
      const jsonContent = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedResponse = JSON.parse(jsonContent);
      console.log('Parsed response:', parsedResponse); // Debug log
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      console.error('Parse error:', parseError);
      return res.status(500).json({ error: 'Failed to parse AI suggestions' });
    }

    // Extract suggestions and hasAccessibleHashtags
    const hasAccessibleHashtags = parsedResponse.hasAccessibleHashtags !== false; // Default to true if not specified
    let suggestions = parsedResponse.suggestions || {};

    // Deduplicate suggestions for each hashtag
    const deduplicatedSuggestions = {};
    for (const [hashtag, suggestionArray] of Object.entries(suggestions)) {
      if (Array.isArray(suggestionArray)) {
        // Remove duplicates while preserving order (first occurrence kept)
        const unique = [];
        const seen = new Set();
        for (const suggestion of suggestionArray) {
          // Normalize for comparison (case-insensitive, handle # prefix)
          const normalized = suggestion.toLowerCase().replace(/^#/, '');
          if (!seen.has(normalized)) {
            seen.add(normalized);
            unique.push(suggestion);
          }
        }
        deduplicatedSuggestions[hashtag] = unique;
      } else {
        deduplicatedSuggestions[hashtag] = suggestionArray;
      }
    }

    res.json({ 
      hasAccessibleHashtags,
      suggestions: deduplicatedSuggestions
    });
  } catch (error) {
    console.error('Error in /api/analyze-hashtags:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Proxy endpoint for Emoji analysis
app.post('/api/analyze-emojis', async (req, res) => {
  try {
    const { text, emojiSequences } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!emojiSequences || !Array.isArray(emojiSequences) || emojiSequences.length === 0) {
      return res.status(400).json({ error: 'Emoji sequences array is required' });
    }

    // Get API key from environment variable
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error('OpenAI API key not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Build prompt for OpenAI
    const prompt = `Analyze the following social media post text and the consecutive emoji sequences found in it. For each sequence of 2 or more consecutive emojis, suggest 1-2 single emoji replacements that best represent the tone of the surrounding text.

FULL POST TEXT: "${text}"

EMOJI SEQUENCES TO ANALYZE:
${emojiSequences.map((seq, idx) => `${idx + 1}. "${seq}"`).join('\n')}

Return ONLY a valid JSON object with this exact structure:

{
  "hasAccessibleEmojis": true/false,
  "suggestions": {
    "emoji_sequence_1": ["single_emoji_1", "single_emoji_2"],
    "emoji_sequence_2": ["single_emoji_1"]
  }
}

CRITICAL RULES:
- ONLY analyze sequences that contain 2 OR MORE consecutive emojis
- Analyze the TONE and CONTEXT of the surrounding text to determine which single emoji best represents the message
- For each sequence, suggest 1-2 single emojis:
  1. The best emoji from the original sequence (if one clearly represents the tone)
  2. Optionally, a NEW single emoji that wasn't in the sequence but fits the tone better
- Set "hasAccessibleEmojis" to true if NO sequences of 2+ consecutive emojis were found, false if ANY were found
- Use the EXACT emoji sequence as the key in suggestions
- If hasAccessibleEmojis is true, the suggestions object should be empty {}

Examples:
- "I'm so excited! 🎉🎊🎈" → Suggest: ["🎉"] (best from sequence) or ["😊"] (alternative that fits tone)
- "Love this! ❤️💕💖" → Suggest: ["❤️"] (best from sequence)
- "Great work! 👏👏" → Suggest: ["👏"] (single clap is sufficient)

Analyze the emoji sequences and return suggestions.`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that analyzes emojis in social media posts for accessibility. Return only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, errorData);
      return res.status(response.status).json({ 
        error: `OpenAI API error: ${response.statusText}` 
      });
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content.trim();
    
    console.log('OpenAI raw response:', aiResponse); // Debug log
    
    // Parse JSON response (handle potential markdown code blocks)
    let parsedResponse = {};
    try {
      // Remove markdown code blocks if present
      const jsonContent = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedResponse = JSON.parse(jsonContent);
      console.log('Parsed response:', parsedResponse); // Debug log
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      console.error('Parse error:', parseError);
      return res.status(500).json({ error: 'Failed to parse AI suggestions' });
    }

    // Extract suggestions and hasAccessibleEmojis
    const hasAccessibleEmojis = parsedResponse.hasAccessibleEmojis !== false; // Default to true if not specified
    let suggestions = parsedResponse.suggestions || {};

    // Deduplicate suggestions for each emoji sequence
    const deduplicatedSuggestions = {};
    for (const [emojiSequence, suggestionArray] of Object.entries(suggestions)) {
      if (Array.isArray(suggestionArray)) {
        // Remove duplicates while preserving order (first occurrence kept)
        const unique = [];
        const seen = new Set();
        for (const suggestion of suggestionArray) {
          // Normalize for comparison (exact emoji match)
          if (!seen.has(suggestion)) {
            seen.add(suggestion);
            unique.push(suggestion);
          }
        }
        deduplicatedSuggestions[emojiSequence] = unique;
      } else {
        deduplicatedSuggestions[emojiSequence] = suggestionArray;
      }
    }

    res.json({ 
      hasAccessibleEmojis,
      suggestions: deduplicatedSuggestions
    });
  } catch (error) {
    console.error('Error in /api/analyze-emojis:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
