# Digital Accessibility Feature Upgrades

A collection of examples demonstrating digital feature upgrades that promote accessibility for people with disabilities.

## Hashtag Recommender

The Hashtag Recommender uses OpenAI's API to analyze hashtags and suggest more accessible PascalCase alternatives for multi-word hashtags, making them easier for screen reader users to understand.

### Setup

#### Backend (Required for Production)

The API key must be stored securely on a backend server. **You don't need to maintain a server** - use a free hosting platform:

1. **Quick Deploy Options** (No server maintenance):
   - [Render.com](https://render.com) - Free tier, auto-deploys from GitHub (Recommended)
   - [Railway.app](https://railway.app) - Free tier, great developer experience
   - [Fly.io](https://fly.io) - Free tier available

2. **Deployment Steps:**
   - See `server/DEPLOYMENT.md` for detailed instructions
   - Push code to GitHub
   - Connect to hosting platform
   - Add `OPENAI_API_KEY` as environment variable
   - Deploy automatically!

3. **Local Development:**
   ```bash
   cd server
   npm install
   cp .env.example .env
   # Edit .env and add your OpenAI API key
   npm start
   ```

#### Frontend Configuration

After deploying the backend, update the frontend to point to your backend URL:

**Option 1: Update in HTML** (before closing `</body>` tag in `hashtag-recommender.html`):
```html
<script>
  window.API_BASE_URL = 'https://your-backend-url.com';
</script>
<script src="hashtag-recommender.js"></script>
```

**Option 2: Create `config.js`**:
```javascript
window.API_BASE_URL = 'https://your-backend-url.com';
```
Then uncomment the config script line in `hashtag-recommender.html`.

### Usage

1. Type your post in the text area, including hashtags
2. Click "Submit Post"
3. The system will analyze your hashtags using the secure backend and show 1-3 PascalCase alternatives for each multi-word hashtag
4. Choose a suggestion for each hashtag, or click "Accept All Suggestions"
5. If you don't accept suggestions, you'll need to acknowledge the inaccessible hashtags before submitting

### Security

✅ **API key is secure** - stored server-side, never exposed to the browser  
✅ **No server maintenance** - free hosting platforms handle everything  
✅ **Auto-deploys** - push to GitHub → automatically updates  

### Project Structure

- `index.html` - Homepage
- `about.html` - About page
- `ideas.html` - Ideas listing page
- `hashtag-recommender.html` - Hashtag Recommender demo
- `hashtag-recommender.js` - Frontend JavaScript
- `styles.css` - Shared styles
- `server/` - Backend API (Node.js/Express)
  - `server.js` - Main server file
  - `package.json` - Dependencies
  - `DEPLOYMENT.md` - Deployment instructions
- `README.md` - This file

## Future Ideas

More accessibility feature upgrades will be added to the Ideas page as they are developed.