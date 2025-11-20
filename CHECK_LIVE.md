# How to Check if Your Project is Live on Railway

## Step 1: Get Your Railway URL

1. Go to [Railway Dashboard](https://railway.app)
2. Click on your project
3. Click on your service
4. Look for the **"Settings"** tab or **"Networking"** section
5. Find your **Public Domain** - it will look like:
   - `your-app.railway.app` or
   - `your-app.up.railway.app`
6. Copy the full URL (should start with `https://`)

## Step 2: Test Health Endpoint

Open this URL in your browser (replace with your actual Railway URL):
```
https://YOUR_RAILWAY_URL/api/health
```

**✅ Success looks like:**
```json
{
  "status": "OK",
  "service": "YT Downloader Pro API",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

**❌ If you see:** 404, 500, or connection error = Not working

## Step 3: Test Frontend

Open this URL in your browser:
```
https://YOUR_RAILWAY_URL
```

**✅ Success looks like:**
- You see the "YT Downloader Pro" interface
- Input field for YouTube URLs
- "Extract Info" and "Download Video" buttons
- Beautiful gradient background

**❌ If you see:** 
- Blank page = Frontend not loading
- 404 error = Route not found
- Connection error = Service not running

## Step 4: Test Full Functionality

1. **Open your Railway URL** in browser
2. **Paste a YouTube URL** (try: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`)
3. **Click "Extract Info"**
   - ✅ Should show video thumbnail, title, description
4. **Click "Download Video"**
   - ✅ Should show progress bar and download the video

## Quick Terminal Test

If you have terminal access, run these commands (replace `YOUR_RAILWAY_URL`):

```bash
# Test 1: Health check
curl https://YOUR_RAILWAY_URL/api/health

# Test 2: Check if frontend loads
curl -I https://YOUR_RAILWAY_URL

# Test 3: Test extract endpoint
curl -X POST https://YOUR_RAILWAY_URL/api/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

## What to Check in Railway Dashboard

1. **Deployments Tab:**
   - Latest deployment should show "Active" ✅
   - No red error messages

2. **Metrics Tab:**
   - Should show CPU/Memory usage
   - Network traffic if you're making requests

3. **Logs:**
   - Should show: `🚀 YT Downloader Pro API running on port XXXX`
   - Should show: `📱 Environment: production` (if you set NODE_ENV)
   - No error messages

## Common Issues

### ❌ "Failed to fetch" or CORS errors
- **Fix:** Make sure `NODE_ENV=production` is set in Railway

### ❌ Frontend shows blank page
- **Fix:** Check Railway logs, verify React build completed

### ❌ 404 on API endpoints
- **Fix:** Check that routes use `/api/` prefix

### ❌ Health endpoint works but frontend doesn't
- **Fix:** Verify `NODE_ENV=production` and static files are being served

---

**Your project is LIVE if:**
- ✅ Health endpoint returns OK
- ✅ Frontend loads in browser
- ✅ You can extract video info
- ✅ You can download videos

