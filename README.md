# Linear to Discord Webhook Bridge

Real-time notifications from Linear to Discord, with special formatting for MENDICANT_BIAS orchestration activity.

## Features

- ✅ Linear webhook signature verification
- ✅ Discord embed formatting
- ✅ Orchestration activity detection
- ✅ Agent activity highlighting
- ✅ Issue, Comment, and Project events

## Quick Deploy to Railway

1. **Create Railway account** (if you don't have one)
   - Go to https://railway.app
   - Sign up with GitHub (free)

2. **Deploy this project**
   - Click "New Project" → "Deploy from GitHub repo"
   - Or use Railway CLI:
   ```bash
   npm install -g @railway/cli
   railway login
   railway init
   railway up
   ```

3. **Set environment variables in Railway**
   - Go to your project → Variables tab
   - Add:
     ```
     LINEAR_SIGNING_SECRET=lin_wh_dkHp4otjzN4AlM4X17LRsj1gA5BwJQHse2owRcxjDp7m
     DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/1436539414087204987/DByJoHgINCqeCbbwBpCm9pNaj5XpGN6pD-gmOyyFbSSuItZiR05KZdP3rdy4McfSypNH
     ```

4. **Get your Railway deployment URL**
   - After deployment, Railway gives you a URL like:
     `https://your-app.railway.app`
   - Copy this URL

5. **Configure Linear Webhook**
   - Go to Linear → Settings → Webhooks
   - Click "New webhook"
   - **URL**: `https://your-app.railway.app/webhook`
   - **Signing Secret**: (already have it)
   - **Events**: Select all events you want (Issues, Comments, Projects)
   - Save

## Local Testing

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your credentials
# LINEAR_SIGNING_SECRET=...
# DISCORD_WEBHOOK_URL=...

# Start server
npm start
```

Test webhook:
```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"Issue","action":"create","data":{"title":"Test"}}'
```

## Event Detection

The bridge automatically detects and highlights:

- 🧠 **Orchestration Activity** - Issues/comments with "MENDICANT_BIAS"
- 👁️ **Agent Activity** - Comments from agents (hollowed_eyes, loveless, etc.)
- 📋 **Issue Updates** - Status changes, assignments, priority updates
- 💬 **Comments** - New comments and replies
- 📊 **Projects** - Project creation and updates

## Architecture

```
Linear Webhook → [This Server] → Discord
                  ↓ Verifies signature
                  ↓ Formats message
                  ↓ Detects agents
                  → Discord Webhook
```
