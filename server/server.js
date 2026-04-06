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

2) TRAILING: Suggest ONE single emoji for the end of the post that is **specifically tied to this post's content**, not a generic reaction.

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
- Do not omit "suggestions" or "trailingEmoji".

TRAILING EMOJI — CONTENT-SPECIFICITY (VERY IMPORTANT):
- Read the FULL post: people, places, activities, foods, travel, work, hobbies, jokes, etc. Read the EMOJI CLUSTERS too—they hint at themes (e.g. planes/city/food/party).
- "trailingEmoji" MUST reflect something **concrete** from that post or from those clusters (same topic family). Examples: vacation/travel post → ✈️🧳🌆🗽🍕 as appropriate; celebration language → 🎉; love/praise → ❤️ or 👏; animals named → matching animal emoji.
- Do **NOT** default to vague faces (😊🙂😀) unless the post truly has no other thematic hook—prefer domain-specific symbols over generic smiles.
- Alternates should also be content-related (different but still on-theme), not random generic faces.`;

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
            content: 'You analyze social media posts for accessibility. For end-of-post emoji suggestions you must pick emojis that clearly relate to the post\'s actual topics and emoji clusters—not generic reactions unless unavoidable. Return only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.35,
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

// Proxy endpoint for Alt Text analysis (evaluate user alt text OR generate from image only)
app.post('/api/analyze-alt-text', async (req, res) => {
  try {
    const { image, altText } = req.body;

    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'Image data is required' });
    }

    const userAlt = typeof altText === 'string' ? altText.trim() : '';
    const generateOnly = userAlt.length === 0;

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error('OpenAI API key not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const imageTrim = image.trim();
    const imageUrl = imageTrim.startsWith('data:')
      ? imageTrim
      : `data:image/jpeg;base64,${imageTrim.includes(',') ? imageTrim.split(',')[1] : imageTrim}`;

    let prompt;
    if (generateOnly) {
      prompt = `The user uploaded an image but has not written alt text yet. Describe the image for screen reader users.

Your task:
1. Analyze the image in detail (main subjects, setting, actions, text in image if any, mood when relevant).
2. Write ONE high-quality alt text (equivalent to 9-10/10 quality): concise but complete, objective, no "image of" padding unless needed.

Return ONLY valid JSON:
{
  "suggestedAltText": "<your alt text, 1-3 sentences>"
}

CRITICAL: No score field. suggestedAltText only. No markdown in JSON.`;
    } else {
      prompt = `Analyze the provided image and evaluate the quality of the user's alt text description.

USER'S ALT TEXT: "${userAlt}"

Your task:
1. Analyze the image content in detail
2. Compare the user's alt text to what you see in the image
3. Score the alt text on a scale of 1-10:
   - 1-3: Poor - Missing, meaningless, or completely inaccurate
   - 4-5: Weak - Partially accurate but important gaps or misleading
   - 6-7: Adequate - Captures main content; may miss nuance
   - 8-9: Good - Accurate and useful
   - 10: Excellent - Comprehensive and precise for screen reader users

4. Provide a high-quality suggested alt text (9-10 level) that would replace or improve theirs.

Return ONLY valid JSON:
{
  "score": <integer 1-10>,
  "suggestedAltText": "<your suggested alt text here>"
}

CRITICAL: score must be integer 1-10. suggestedAltText must be detailed and suitable for screen readers (typically 1-3 sentences). No markdown in JSON.`;
    }

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
            content: generateOnly
              ? 'You write accessible image descriptions. Return only valid JSON with a suggestedAltText field.'
              : 'You analyze images and alt text for accessibility. Return only valid JSON with score and suggestedAltText.'
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: { url: imageUrl, detail: 'low' }
              }
            ]
          }
        ],
        temperature: 0.3,
        max_tokens: 600
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
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

    if (!parsedResponse.suggestedAltText || typeof parsedResponse.suggestedAltText !== 'string') {
      console.error('Invalid suggestedAltText in response');
      return res.status(500).json({ error: 'Invalid suggestedAltText returned from AI' });
    }

    const suggestedAltText = parsedResponse.suggestedAltText.trim();

    if (generateOnly) {
      res.json({
        mode: 'generate',
        score: null,
        suggestedAltText
      });
      return;
    }

    if (typeof parsedResponse.score !== 'number' || parsedResponse.score < 1 || parsedResponse.score > 10) {
      console.error('Invalid score in response:', parsedResponse.score);
      return res.status(500).json({ error: 'Invalid score returned from AI' });
    }

    const score = Math.max(1, Math.min(10, Math.round(parsedResponse.score)));

    res.json({
      mode: 'evaluate',
      score,
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
