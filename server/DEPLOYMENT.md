# Deployment Guide for Hashtag Recommender Backend

This guide explains how to deploy the backend API to a free hosting platform. **You don't need to maintain a server** - these platforms handle everything automatically.

## Quick Start Options

### Option 1: Render (Recommended - Easiest)
**Free tier available, auto-deploys from GitHub**

1. **Push your code to GitHub** (if not already)
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin your-github-repo-url
   git push -u origin main
   ```

2. **Sign up at [Render.com](https://render.com)** (free)

3. **Create a New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository

4. **Configure the service:**
   - **Name**: `hashtag-recommender-api`
   - **Environment**: `Node`
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Root Directory**: Leave blank (or set to `server` if available)

5. **Add Environment Variable:**
   - Go to "Environment" tab
   - Add: `OPENAI_API_KEY` = `your-actual-api-key`
   - (Optional) Add: `PORT` = `10000` (Render uses dynamic ports)

6. **Deploy** - Render will automatically deploy

7. **Get your URL** (e.g., `https://hashtag-recommender-api.onrender.com`)

---

### Option 2: Railway (Very Easy)
**Free tier available, great developer experience**

1. **Sign up at [Railway.app](https://railway.app)** (free with GitHub)

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure Service:**
   - Railway auto-detects Node.js
   - Set **Root Directory** to `server`
   - Railway will run `npm install` and `npm start` automatically

4. **Add Environment Variable:**
   - Go to "Variables" tab
   - Add: `OPENAI_API_KEY` = `your-actual-api-key`

5. **Get your URL** (e.g., `https://your-project.up.railway.app`)

---

### Option 3: Fly.io (Free Tier)
**More control, still no server maintenance**

1. **Install Fly CLI:**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Sign up**: `fly auth signup`

3. **From the `server` directory:**
   ```bash
   cd server
   fly launch
   ```
   - Follow prompts
   - Don't deploy yet (we need to set the API key first)

4. **Set secrets:**
   ```bash
   fly secrets set OPENAI_API_KEY=your-actual-api-key
   ```

5. **Deploy:**
   ```bash
   fly deploy
   ```

6. **Get your URL** (e.g., `https://your-app.fly.dev`)

---

### Option 4: Local Development (Testing)
**For testing before deployment**

1. **Install dependencies:**
   ```bash
   cd server
   npm install
   ```

2. **Create `.env` file:**
   ```bash
   cp .env.example .env
   # Edit .env and add your OpenAI API key
   ```

3. **Start server:**
   ```bash
   npm start
   ```

4. **Test:** Server runs on `http://localhost:3001`

---

## Updating Frontend to Use Backend

After deploying, update `hashtag-recommender.html` or create a config:

**Option A: Update in HTML (before closing `</body>` tag):**
```html
<script>
  // Set your deployed backend URL
  window.API_BASE_URL = 'https://your-backend-url.com';
</script>
<script src="hashtag-recommender.js"></script>
```

**Option B: Create `config.js`:**
```javascript
window.API_BASE_URL = 'https://your-backend-url.com';
```

Then uncomment the config script line in `hashtag-recommender.html`.

---

## Important Notes

- ✅ **No server maintenance required** - these platforms handle updates, restarts, scaling
- ✅ **Free tiers available** - enough for personal projects/demos
- ✅ **API key stays secure** - stored as environment variable, never exposed
- ✅ **Auto-deploys** - push to GitHub → automatically deploys (on Render/Railway)

## Troubleshooting

- **CORS errors**: The backend includes CORS middleware, should work automatically
- **Connection refused**: Make sure the backend is deployed and URL is correct
- **Environment variables**: Double-check the variable name is exactly `OPENAI_API_KEY`
- **Port issues**: Most platforms use dynamic ports, but the code handles this automatically

---

## Cost

- **Render**: Free tier (spins down after 15 min inactivity, spins up on request)
- **Railway**: $5/month after free credits, or free with limited usage
- **Fly.io**: Free tier available
- **OpenAI API**: Pay-per-use (very cheap for this use case, ~$0.01 per 100 requests)
