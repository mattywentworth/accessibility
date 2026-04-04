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

// Proxy endpoint for Emoji analysis — returns BOTH trailing-emoji and per-cluster suggestions in one response
app.post('/api/analyze-emojis', async (req, res) => {
  try {
    const { text, emojiSequences } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!emojiSequences || !Array.isArray(emojiSequences) || emojiSequences.length === 0) {
      return res.status(400).json({ error: 'Emoji sequences array is required' });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error('OpenAI API key not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const hasProblemSequences = emojiSequences.length > 0;

    const prompt = `Analyze this social media post. It contains one or more runs of MULTIPLE CONSECUTIVE EMOJIS (2+ in a row). Screen readers read each emoji separately, which is often overwhelming.

FULL POST TEXT: "${text}"

RUNS OF CONSECUTIVE EMOJIS (use these EXACT strings as keys in "suggestions"):
${emojiSequences.map((seq, idx) => `${idx + 1}. "${seq}"`).join('\n')}

You must produce TWO complementary recommendation strategies in ONE JSON object:

1) PER-CLUSTER: For each run above, suggest 1-2 single-emoji replacements that fit the tone near that part of the text (replace the cluster inline).

2) TRAILING: Suggest ONE single emoji that best captures the overall tone of the entire post (including what the emoji clusters expressed). The user may remove all multi-emoji runs and place only this emoji at the very end of the post.

Return ONLY valid JSON with this exact structure:

{
  "hasAccessibleEmojis": true/false,
  "suggestions": {
    "<exact_sequence_1>": ["single_emoji_a", "single_emoji_b"],
    "<exact_sequence_2>": ["single_emoji_a"]
  },
  "trailingEmoji": "<one emoji or one ZWJ pictograph>",
  "alternateTrailingEmojis": ["<optional second>", "<optional third>"]
}

CRITICAL RULES:
- Set "hasAccessibleEmojis" to false if ANY run of 2+ consecutive emojis exists in the post (i.e. in this case always false). Set true only if there were no such runs (should not happen here).
- "suggestions" keys MUST match the emoji runs listed above exactly (same characters, same order as characters).
- For each sequence in suggestions, provide 1-2 single emojis.
- "trailingEmoji" must be exactly ONE emoji (or one ZWJ sequence).
- "alternateTrailingEmojis": 0-2 entries, no duplicates of trailingEmoji.
- Do not omit "suggestions" or "trailingEmoji".`;

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
        max_tokens: 900
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

    console.log('OpenAI raw response:', aiResponse);

    let parsedResponse = {};
    try {
      const jsonContent = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedResponse = JSON.parse(jsonContent);
      console.log('Parsed response:', parsedResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      console.error('Parse error:', parseError);
      return res.status(500).json({ error: 'Failed to parse AI suggestions' });
    }

    let trailingEmoji = typeof parsedResponse.trailingEmoji === 'string'
      ? parsedResponse.trailingEmoji.trim()
      : '';
    if (!trailingEmoji && hasProblemSequences) {
      return res.status(500).json({ error: 'Invalid trailing emoji from AI' });
    }

    let alternates = parsedResponse.alternateTrailingEmojis;
    if (!Array.isArray(alternates)) {
      alternates = [];
    }
    const seenTrail = new Set([trailingEmoji]);
    const uniqueAlternates = [];
    for (const a of alternates) {
      if (typeof a !== 'string') continue;
      const t = a.trim();
      if (t && !seenTrail.has(t)) {
        seenTrail.add(t);
        uniqueAlternates.push(t);
      }
      if (uniqueAlternates.length >= 2) break;
    }

    const hasAccessibleEmojis = hasProblemSequences
      ? false
      : (parsedResponse.hasAccessibleEmojis !== false);

    let suggestions = parsedResponse.suggestions || {};
    const deduplicatedSuggestions = {};
    for (const [emojiSequence, suggestionArray] of Object.entries(suggestions)) {
      if (Array.isArray(suggestionArray)) {
        const unique = [];
        const seenEmoji = new Set();
        for (const suggestion of suggestionArray) {
          if (!seenEmoji.has(suggestion)) {
            seenEmoji.add(suggestion);
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
      suggestions: deduplicatedSuggestions,
      trailingEmoji,
      alternateTrailingEmojis: uniqueAlternates
    });
  } catch (error) {
    console.error('Error in /api/analyze-emojis:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Proxy endpoint for Alt Text analysis
app.post('/api/analyze-alt-text', async (req, res) => {
  try {
    const { image, altText } = req.body;

    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'Image data is required' });
    }

    if (!altText || typeof altText !== 'string' || altText.trim().length === 0) {
      return res.status(400).json({ error: 'Alt text is required' });
    }

    // Get API key from environment variable
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error('OpenAI API key not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Extract base64 data (remove data:image/...;base64, prefix if present)
    let imageBase64 = image;
    if (image.includes(',')) {
      imageBase64 = image.split(',')[1];
    }

    // Build prompt for OpenAI Vision API
    const prompt = `Analyze the provided image and evaluate the quality of the user's alt text description.

USER'S ALT TEXT: "${altText}"

Your task:
1. Analyze the image content in detail
2. Compare the user's alt text to what you see in the image
3. Score the alt text on a scale of 1-10:
   - 1-3: Poor - Alt text is missing, meaningless, or completely inaccurate (e.g., "asdf", "image", "photo", random characters)
   - 4-6: Insufficient - Alt text is partially accurate but lacks important details or context
   - 7-8: Good - Alt text accurately describes the main content but may miss some context or details
   - 9-10: Excellent - Alt text is comprehensive, accurate, and provides full context for screen reader users

4. Generate a high-quality suggested alt text (score 9-10 level) that accurately and comprehensively describes the image

Return ONLY a valid JSON object with this exact structure:
{
  "score": <number between 1 and 10>,
  "suggestedAltText": "<your suggested alt text here>"
}

CRITICAL RULES:
- Score must be an integer between 1 and 10
- suggestedAltText must be a detailed, accurate description suitable for screen reader users
- suggestedAltText should be concise but comprehensive (typically 1-3 sentences)
- Do not include any markdown formatting or code blocks in the JSON response`;

    // Call OpenAI Vision API
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
            content: 'You are a helpful assistant that analyzes images and evaluates alt text quality for accessibility. Return only valid JSON.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
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
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

    // Validate response structure
    if (typeof parsedResponse.score !== 'number' || parsedResponse.score < 1 || parsedResponse.score > 10) {
      console.error('Invalid score in response:', parsedResponse.score);
      return res.status(500).json({ error: 'Invalid score returned from AI' });
    }

    if (!parsedResponse.suggestedAltText || typeof parsedResponse.suggestedAltText !== 'string') {
      console.error('Invalid suggestedAltText in response');
      return res.status(500).json({ error: 'Invalid suggestedAltText returned from AI' });
    }

    // Round score to integer
    const score = Math.round(parsedResponse.score);
    const suggestedAltText = parsedResponse.suggestedAltText.trim();

    res.json({ 
      score: Math.max(1, Math.min(10, score)), // Ensure score is between 1-10
      suggestedAltText
    });
  } catch (error) {
    console.error('Error in /api/analyze-alt-text:', error);
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
