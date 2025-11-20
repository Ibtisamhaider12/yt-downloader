# Quick Testing Guide for Railway Deployment

## 🚀 Quick Test Steps

### Step 1: Get Your Railway URL
1. Go to your Railway project dashboard
2. Find your service URL (e.g., `your-app.railway.app` or `your-app.up.railway.app`)
3. Copy the full URL (should start with `https://`)

### Step 2: Test Health Endpoint
Open in browser or run in terminal:
```
https://YOUR_RAILWAY_URL/api/health
```

**Expected:** JSON response with status "OK"

### Step 3: Test Frontend
Open in browser:
```
https://YOUR_RAILWAY_URL
```

**Expected:** You should see the YT Downloader Pro interface

### Step 4: Test Extract Info
1. Open your Railway URL in browser
2. Paste a YouTube URL (e.g., `https://www.youtube.com/watch?v=dQw4w9WgXcQ`)
3. Click "Extract Info"
4. **Expected:** Video thumbnail, title, and details should appear

### Step 5: Test Download
1. With a YouTube URL pasted
2. Click "Download Video"
3. **Expected:** Progress bar appears, then video downloads

## 🔍 Quick Terminal Tests

Replace `YOUR_RAILWAY_URL` with your actual Railway domain:

```bash
# Test 1: Health Check
curl https://YOUR_RAILWAY_URL/api/health

# Test 2: Extract Video Info
curl -X POST https://YOUR_RAILWAY_URL/api/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'

# Test 3: Test Invalid URL (should return error)
curl -X POST https://YOUR_RAILWAY_URL/api/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "invalid-url"}'
```

## ✅ Configuration Check

Your configuration should be correct for Railway because:

1. ✅ **PORT**: Uses `process.env.PORT` (Railway provides this automatically)
2. ✅ **CORS**: Updated to allow same-origin requests in production
3. ✅ **API URL**: Client uses relative path `/api` in production
4. ✅ **Static Files**: React build is served from Express in production mode
5. ✅ **Environment**: Uses `NODE_ENV=production` for production builds

## 🐛 Common Issues & Quick Fixes

### Issue: "Failed to fetch" or CORS errors
**Fix:** Make sure `NODE_ENV=production` is set in Railway environment variables

### Issue: Frontend loads but API calls fail
**Fix:** Check Railway logs - the server might not be starting correctly

### Issue: 404 on API endpoints
**Fix:** Verify the routes are `/api/health`, `/api/extract`, `/api/download`

### Issue: Download times out
**Fix:** This is normal for large videos. Railway has timeout limits. Try shorter videos first.

## 📊 Check Railway Logs

1. Go to Railway dashboard
2. Click on your service
3. Click "Deployments" tab
4. Click on the latest deployment
5. View logs to see if there are any errors

## 🎯 What to Look For in Logs

**Good signs:**
- `🚀 YT Downloader Pro API running on port XXXX`
- `📱 Environment: production`
- No error messages

**Bad signs:**
- Port binding errors
- Module not found errors
- CORS errors
- Build failures

---

**Need help?** Check the full guide in `RAILWAY_DEPLOYMENT.md`

