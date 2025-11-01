const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
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

    // Build prompt for OpenAI
    const prompt = `Analyze the following hashtags and determine if they represent multiple uncapitalized words. For each hashtag that needs improvement, suggest 1-3 PascalCase alternatives. Return ONLY a valid JSON object with this exact structure:

{
  "hashtag1": ["Suggestion1", "Suggestion2"],
  "hashtag2": ["Suggestion1"],
  "hashtag3": ["Suggestion1", "Suggestion2", "Suggestion3"]
}

If a hashtag is already properly formatted (PascalCase) or is a single word that doesn't need capitalization, do not include it in the response.

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
    
    // Parse JSON response (handle potential markdown code blocks)
    let suggestions = {};
    try {
      // Remove markdown code blocks if present
      const jsonContent = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      suggestions = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      return res.status(500).json({ error: 'Failed to parse AI suggestions' });
    }

    res.json({ suggestions });
  } catch (error) {
    console.error('Error in /api/analyze-hashtags:', error);
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
