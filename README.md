# Blazel Web

Next.js frontend for the Blazel LinkedIn post generator.

## Features

- Google OAuth login via WorkOS
- Generate LinkedIn posts with topic + context
- Real-time streaming generation via SSE
- Edit and provide feedback on drafts
- Rate drafts (like/dislike)
- View draft history
- Admin view for managing customers
- Train personalized LoRA adapters

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Auth:** WorkOS (Google OAuth)
- **API:** REST + SSE streaming

## Environment Variables

```bash
NEXT_PUBLIC_API_URL=https://blazel-api-9d69c876e191.herokuapp.com
```

## Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## API Integration

The frontend communicates with blazel-api for all operations:

| Feature | Endpoint | Method |
|---------|----------|--------|
| Login | `/auth/login` | Redirect |
| Get user | `/auth/me` | GET |
| Generate drafts | `/generate/stream` | SSE |
| Submit feedback | `/feedback` | POST |
| Get drafts | `/drafts` | GET |
| Delete draft | `/drafts/{id}` | DELETE |
| Train adapter | `/adapters/train` | POST |

## Authentication Flow

1. User clicks "Sign in with Google"
2. Redirected to WorkOS hosted auth page
3. After Google OAuth, redirected to `/auth/callback`
4. API returns JWT token
5. Frontend stores token in localStorage
6. Token sent as `Authorization: Bearer {token}` header

## Deployment

### Heroku

```bash
# Login to Heroku
heroku login

# Create app (if not exists)
heroku create blazel-web

# Set environment variables
heroku config:set NEXT_PUBLIC_API_URL=https://blazel-api-9d69c876e191.herokuapp.com -a blazel-web

# Deploy
git push heroku master
```

### Procfile

```
web: next start -p $PORT
```

**Important:** Heroku assigns a dynamic port via `$PORT`. The Procfile must use `-p $PORT` instead of hardcoding port 3000.

## Project Structure

```
blazel-web/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Main app page
│   │   ├── layout.tsx        # Root layout
│   │   └── globals.css       # Global styles
│   └── lib/
│       └── api.ts            # API client functions
├── public/
├── package.json
├── Procfile                  # Heroku deployment
├── next.config.js
└── tailwind.config.js
```

## Key Components

### Draft Generation
- User enters topic and optional context
- Clicks "Generate" to create 1-3 variations
- Drafts stream in via SSE for real-time feedback
- Each draft shown with temperature indicator

### Feedback Flow
1. User selects a draft
2. Edits text in textarea
3. Adds inline comments
4. Rates as like/dislike
5. Submits feedback
6. Feedback stored for LoRA training

### Admin Features
- View all customers
- See draft counts per customer
- Generate posts for specific customers
- Trigger adapter training

## Common Issues & Solutions

### Issue: CORS errors
**Symptom:** "Access-Control-Allow-Origin" errors in console
**Solution:** Ensure API has frontend URL in CORS origins

### Issue: Auth redirect fails
**Symptom:** Login redirects to wrong URL
**Solution:**
1. Check WORKOS_REDIRECT_URI on API
2. Add redirect URI in WorkOS dashboard

### Issue: "Network error" on generate
**Symptom:** Generation fails immediately
**Solution:**
1. Verify NEXT_PUBLIC_API_URL is set
2. Check API is running and accessible

### Issue: App crashes on Heroku
**Symptom:** H10 error, app crashes
**Solution:** Ensure Procfile uses `next start -p $PORT`

## Current Production

- **URL:** https://blazel-web-19d3cd34dc51.herokuapp.com
- **Custom Domain:** https://blazel.xyz (if configured)
- **API:** https://blazel-api-9d69c876e191.herokuapp.com
