# Railway Deployment Guide

This guide covers how to deploy and test your YT Downloader application on Railway.

## 🚀 Railway Configuration

### Environment Variables

Set these environment variables in your Railway project dashboard:

#### Required Variables:
- `NODE_ENV=production` - Set to production mode
- `PORT` - Railway automatically provides this (usually 5001 or dynamic)

#### Optional Variables:
- `CORS_ORIGIN` - Comma-separated list of allowed origins (e.g., `https://yourdomain.com,https://www.yourdomain.com`)
- `RAILWAY_PUBLIC_DOMAIN` - Railway automatically provides this with your public domain

**Note:** Railway automatically provides:
- `PORT` - The port your app should listen on
- `RAILWAY_PUBLIC_DOMAIN` - Your public Railway domain (e.g., `your-app.railway.app`)

### Build Configuration

Railway will automatically:
1. Detect your Dockerfile
2. Build your Docker image
3. Deploy your application
4. Provide a public URL

### Dockerfile Configuration

The Dockerfile is already configured to:
- Build the React frontend
- Serve it from the Express server
- Listen on the PORT provided by Railway
- Run health checks

## 🧪 Testing Your Deployment

### 1. Health Check Test

Test if your API is running:

```bash
# Replace YOUR_RAILWAY_URL with your actual Railway domain
curl https://YOUR_RAILWAY_URL.railway.app/api/health
```

**Expected Response:**
```json
{
  "status": "OK",
  "service": "YT Downloader Pro API",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

### 2. Frontend Access Test

1. Open your Railway URL in a browser:
   ```
   https://YOUR_RAILWAY_URL.railway.app
   ```

2. You should see:
   - The YT Downloader Pro interface
   - Input field for YouTube URLs
   - Extract Info and Download Video buttons

### 3. Extract Video Info Test

**Using Browser:**
1. Paste a YouTube URL (e.g., `https://www.youtube.com/watch?v=dQw4w9WgXcQ`)
2. Click "Extract Info"
3. You should see:
   - Video thumbnail
   - Video title
   - Video description
   - Author, duration, and view count

**Using cURL:**
```bash
curl -X POST https://YOUR_RAILWAY_URL.railway.app/api/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "title": "Video Title",
    "description": "Video description...",
    "imageUrl": "https://...",
    "videoUrl": "https://www.youtube.com/watch?v=...",
    "type": "video",
    "author": "Channel Name",
    "board": "",
    "videoId": "...",
    "duration": "123",
    "viewCount": "1234567"
  }
}
```

### 4. Download Video Test

**Using Browser:**
1. Paste a YouTube URL
2. Click "Download Video"
3. Monitor the progress bar
4. Video should download automatically when complete

**Using cURL:**
```bash
curl -X POST https://YOUR_RAILWAY_URL.railway.app/api/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}' \
  --output video.mp4
```

### 5. Error Handling Test

Test invalid URL handling:

```bash
curl -X POST https://YOUR_RAILWAY_URL.railway.app/api/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "invalid-url"}'
```

**Expected Response:**
```json
{
  "error": "Invalid YouTube URL format",
  "code": "INVALID_URL_FORMAT"
}
```

## 🔍 Troubleshooting

### Issue: CORS Errors

**Symptoms:** Browser console shows CORS errors when making API requests.

**Solution:**
1. Check that `NODE_ENV=production` is set in Railway
2. The CORS configuration automatically allows same-origin requests in production
3. If using a custom domain, add it to `CORS_ORIGIN` environment variable

### Issue: API Returns 404

**Symptoms:** API endpoints return 404 Not Found.

**Solution:**
1. Verify the server is running: Check Railway logs
2. Check that routes are prefixed with `/api`
3. Verify the build completed successfully

### Issue: Frontend Shows "Failed to fetch"

**Symptoms:** Frontend can't connect to API.

**Solution:**
1. Check Railway logs for server errors
2. Verify `NODE_ENV=production` is set
3. Check that the React build was successful
4. Verify the API is accessible via the health endpoint

### Issue: Download Fails or Times Out

**Symptoms:** Video download starts but fails or times out.

**Solution:**
1. Check Railway logs for errors
2. Verify the YouTube URL is valid and accessible
3. Check Railway resource limits (memory/CPU)
4. Some videos may be restricted or unavailable

### Issue: Static Files Not Loading

**Symptoms:** Frontend loads but CSS/images are missing.

**Solution:**
1. Verify the React build completed successfully
2. Check that `npm run build` ran in the Dockerfile
3. Verify the `public` folder is being served correctly

## 📊 Monitoring

### Railway Logs

View logs in Railway dashboard:
1. Go to your project
2. Click on the service
3. View "Deployments" tab for build logs
4. View "Metrics" tab for runtime metrics

### Health Check Monitoring

Railway automatically monitors the health endpoint:
- Endpoint: `/api/health`
- Interval: Every 30 seconds
- Railway will restart the service if health checks fail

## 🔐 Security Checklist

- ✅ Helmet.js security headers enabled
- ✅ Rate limiting configured (100 requests per 15 minutes)
- ✅ CORS properly configured
- ✅ Input validation for YouTube URLs
- ✅ Error handling middleware
- ✅ Non-root user in Docker container

## 📝 Quick Test Checklist

- [ ] Health endpoint responds with 200 OK
- [ ] Frontend loads correctly
- [ ] Extract Info works with valid YouTube URL
- [ ] Download Video works with valid YouTube URL
- [ ] Error messages display for invalid URLs
- [ ] Progress bar shows during download
- [ ] CORS errors don't appear in browser console
- [ ] Railway logs show no errors

## 🎯 Performance Testing

### Load Testing

Test API performance with multiple requests:

```bash
# Install Apache Bench (ab) if not installed
# macOS: brew install httpd
# Linux: apt-get install apache2-utils

ab -n 100 -c 10 https://YOUR_RAILWAY_URL.railway.app/api/health
```

### Response Time Testing

Monitor response times:
- Health check: Should be < 100ms
- Extract info: Should be < 5s
- Download: Depends on video size (can be 30s - 5min)

## 📞 Support

If you encounter issues:
1. Check Railway logs first
2. Verify all environment variables are set
3. Test the health endpoint
4. Check Railway status page for outages
5. Review this guide's troubleshooting section

---

**Last Updated:** 2024
**Railway Documentation:** https://docs.railway.app

