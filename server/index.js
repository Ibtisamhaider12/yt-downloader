const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const ytdl = require('@distube/ytdl-core');
const path = require('path');
const os = require('os');
const fs = require('fs');
// Load environment variables (Railway provides PORT automatically)
require('dotenv').config({ path: process.env.ENV_FILE_PATH || './config.env' });

const app = express();
const PORT = process.env.PORT || 5001;
// Default to production if NODE_ENV is not set (for Railway deployments)
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

// Set up temp directory for ytdl-core (fixes permission issues in Docker)
const tempDir = path.join(os.tmpdir(), 'ytdl-temp');
if (!fs.existsSync(tempDir)) {
  try {
    fs.mkdirSync(tempDir, { recursive: true, mode: 0o755 });
  } catch (err) {
    console.error('Failed to create temp directory:', err);
  }
}
// Set TMPDIR environment variable for ytdl-core and other temp-related vars
process.env.TMPDIR = tempDir;
process.env.TMP = tempDir;
process.env.TEMP = tempDir;

// Verify temp directory is writable
try {
  fs.accessSync(tempDir, fs.constants.W_OK);
  console.log(`Temp directory ready: ${tempDir}`);
} catch (err) {
  console.error(`Temp directory not writable: ${tempDir}`, err);
}

// CRITICAL FIX: Change working directory to temp directory
// ytdl-core writes to current directory, so we need to be in a writable location
const originalCwd = process.cwd();
try {
  process.chdir(tempDir);
  console.log(`Changed working directory from ${originalCwd} to ${tempDir}`);
  console.log(`Current working directory: ${process.cwd()}`);
} catch (err) {
  console.error(`Failed to change working directory to ${tempDir}:`, err);
  console.error('Will try to continue, but may have permission issues');
}

// Trust proxy - Required for Railway and other cloud platforms
// Trust only the first proxy (Railway's proxy) for security and proper rate limiting
// Setting to 1 instead of true prevents rate limit bypass attacks
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      fontSrc: ["'self'", "https:", "data:"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      imgSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", "https:", "'unsafe-inline'"],
      upgradeInsecureRequests: [],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Compression middleware
app.use(compression());

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Get allowed origins from environment or use defaults
    const allowedOriginsEnv = process.env.CORS_ORIGIN || process.env.RAILWAY_PUBLIC_DOMAIN || '';
    const allowedOriginsList = allowedOriginsEnv.split(',').filter(Boolean);
    
    const allowedOrigins = [
      ...allowedOriginsList,
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002',
      'http://127.0.0.1:3003'
    ];
    
    // In production, allow requests from same origin (Railway serves both frontend and backend)
    if (process.env.NODE_ENV === 'production') {
      // Allow same-origin requests (Railway serves React build from same domain)
      if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        // Local development
        if (allowedOrigins.indexOf(origin) !== -1) {
          return callback(null, true);
        }
      } else {
        // Production - allow same origin (Railway domain)
        return callback(null, true);
      }
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept']
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// YouTube URL validation regex
const YOUTUBE_URL_REGEX = /^https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)[\w-]+/;

// YouTube media extraction service
class YouTubeService {
  static async extractMediaInfo(url) {
    try {
      if (!url || typeof url !== 'string') {
        throw new Error('URL is required and must be a string');
      }

      // Validate YouTube URL
      if (!YOUTUBE_URL_REGEX.test(url)) {
        throw new Error(`Invalid YouTube URL format: ${url.substring(0, 50)}`);
      }

      // Validate URL with ytdl-core
      if (!ytdl.validateURL(url)) {
        throw new Error(`YouTube URL validation failed: ${url.substring(0, 50)}`);
      }

      // Get video info using ytdl-core with retry logic and advanced bot detection bypass
      let videoInfo;
      let attempts = 0;
      const maxAttempts = 5; // Increased retries
      
      // Generate realistic browser headers to bypass bot detection
      const getRealisticHeaders = () => {
        const userAgents = [
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
        ];
        
        const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
        
        return {
          'User-Agent': randomUA,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'max-age=0'
        };
      };
      
      while (attempts < maxAttempts) {
        try {
          // Add random delay between retries to appear more human-like
          if (attempts > 0) {
            const delay = 2000 + Math.random() * 3000; // 2-5 seconds
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
          videoInfo = await ytdl.getInfo(url, {
            requestOptions: {
              headers: getRealisticHeaders()
            }
          });
          break;
        } catch (error) {
          attempts++;
          const errorMessage = error?.message || error?.toString() || '';
          const errorStack = error?.stack || '';
          
          // Log detailed error information
          console.error(`YouTube extract attempt ${attempts} error:`, {
            message: errorMessage,
            code: error?.code,
            statusCode: error?.statusCode,
            response: error?.response?.statusCode,
            errorType: error?.name
          });
          
          // Check for bot detection errors
          if (errorMessage.includes('bot') || 
              errorMessage.includes('Sign in to confirm') || 
              errorMessage.includes('429') ||
              errorMessage.includes('403') ||
              errorMessage.includes('Sign in') ||
              errorStack.includes('bot') ||
              error?.statusCode === 403 ||
              error?.response?.statusCode === 403) {
            // For bot detection, wait longer before retrying
            if (attempts < maxAttempts) {
              const delay = 5000 + Math.random() * 5000; // 5-10 seconds
              console.warn(`Bot detection encountered (${errorMessage.substring(0, 100)}), waiting ${Math.round(delay/1000)}s before retry ${attempts}/${maxAttempts}...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue; // Retry with different headers
            }
            throw new Error('YouTube is blocking automated access. Please try again later or use a different video.');
          }
          
          if (attempts >= maxAttempts) {
            console.error(`All ${maxAttempts} attempts failed. Final error:`, errorMessage);
            throw error;
          }
          console.warn(`YouTube info extraction attempt ${attempts} failed, retrying... Error: ${errorMessage.substring(0, 100)}`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
      }
      
      const videoDetails = videoInfo.videoDetails;

      return {
        title: videoDetails.title || 'YouTube Video',
        description: videoDetails.description || 'YouTube video content',
        imageUrl: videoDetails.thumbnails?.[0]?.url || `https://img.youtube.com/vi/${videoDetails.videoId}/maxresdefault.jpg`,
        videoUrl: url,
        type: 'video',
        author: videoDetails.author?.name || 'YouTube',
        board: '',
        videoId: videoDetails.videoId,
        duration: videoDetails.lengthSeconds,
        viewCount: videoDetails.viewCount
      };
    } catch (error) {
      console.error('YouTube extraction error:', error.message);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      
      // Provide user-friendly error messages
      if (errorMessage.includes('bot') || errorMessage.includes('Sign in to confirm')) {
        throw new Error('YouTube is blocking automated access. This video may require manual verification. Please try again later.');
      } else if (errorMessage.includes('Private video')) {
        throw new Error('This video is private and cannot be accessed.');
      } else if (errorMessage.includes('Video unavailable')) {
        throw new Error('This video is unavailable or has been removed.');
      } else if (errorMessage.includes('Age-restricted')) {
        throw new Error('This video is age-restricted and cannot be accessed.');
      } else {
        throw new Error(`Failed to extract YouTube media: ${errorMessage}`);
      }
    }
  }

  static extractVideoId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  static async downloadMedia(url, type = 'video') {
    try {
      if (!url || typeof url !== 'string') {
        throw new Error('URL is required and must be a string');
      }

      // Validate YouTube URL
      if (!ytdl.validateURL(url)) {
        throw new Error(`YouTube URL validation failed: ${url.substring(0, 50)}`);
      }

      // Get video info to determine best format with retry logic and advanced bot detection bypass
      let videoInfo;
      let attempts = 0;
      const maxAttempts = 5; // Increased retries
      
      // Generate realistic browser headers to bypass bot detection
      const getRealisticHeaders = () => {
        const userAgents = [
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
        ];
        
        const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
        
        return {
          'User-Agent': randomUA,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'max-age=0',
          'Referer': 'https://www.youtube.com/'
        };
      };
      
      const getYtdlOptions = () => ({
        requestOptions: {
          headers: getRealisticHeaders()
        }
      });
      
      while (attempts < maxAttempts) {
        try {
          // Add random delay between retries to appear more human-like
          if (attempts > 0) {
            const delay = 2000 + Math.random() * 3000; // 2-5 seconds
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
          videoInfo = await ytdl.getInfo(url, getYtdlOptions());
          break;
        } catch (error) {
          attempts++;
          const errorMessage = error?.message || error?.toString() || '';
          const errorStack = error?.stack || '';
          
          // Log detailed error information
          console.error(`YouTube download attempt ${attempts} error:`, {
            message: errorMessage,
            code: error?.code,
            statusCode: error?.statusCode,
            response: error?.response?.statusCode,
            errorType: error?.name
          });
          
          // Check for bot detection errors
          if (errorMessage.includes('bot') || 
              errorMessage.includes('Sign in to confirm') || 
              errorMessage.includes('429') ||
              errorMessage.includes('403') ||
              errorMessage.includes('Sign in') ||
              errorStack.includes('bot') ||
              error?.statusCode === 403 ||
              error?.response?.statusCode === 403) {
            // For bot detection, wait longer before retrying
            if (attempts < maxAttempts) {
              const delay = 5000 + Math.random() * 5000; // 5-10 seconds
              console.warn(`Bot detection encountered (${errorMessage.substring(0, 100)}), waiting ${Math.round(delay/1000)}s before retry ${attempts}/${maxAttempts}...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue; // Retry with different headers
            }
            throw new Error('YouTube is blocking automated access. Please try again later or use a different video.');
          }
          
          if (attempts >= maxAttempts) {
            console.error(`All ${maxAttempts} attempts failed. Final error:`, errorMessage);
            throw error;
          }
          console.warn(`YouTube download info attempt ${attempts} failed, retrying... Error: ${errorMessage.substring(0, 100)}`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
      }
      
      const videoDetails = videoInfo.videoDetails;
      
      // Choose the best available format
      const formats = ytdl.filterFormats(videoInfo.formats, 'videoandaudio');
      let format;
      
      if (formats.length > 0) {
        // Prefer mp4 format with audio
        format = formats.find(f => f.container === 'mp4') || formats[0];
      } else {
        // Fallback to video only format
        const videoFormats = ytdl.filterFormats(videoInfo.formats, 'videoonly');
        format = videoFormats.find(f => f.container === 'mp4') || videoFormats[0];
      }

      if (!format) {
        throw new Error('No suitable video format found');
      }

      // Create download stream with options
      const stream = ytdl(url, { 
        format: format,
        ...getYtdlOptions()
      });
      
      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safeTitle = videoDetails.title.replace(/[^a-zA-Z0-9\s]/g, '').substring(0, 50);
      const filename = `youtube-${safeTitle}-${timestamp}.${format.container}`;

      return {
        stream: stream,
        contentType: `video/${format.container}`,
        contentLength: format.contentLength || null,
        filename: filename,
        videoInfo: videoDetails
      };
    } catch (error) {
      console.error('YouTube download error:', error.message);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      
      // Provide user-friendly error messages
      if (errorMessage.includes('bot') || errorMessage.includes('Sign in to confirm')) {
        throw new Error('YouTube is blocking automated access. This video may require manual verification. Please try again later.');
      } else if (errorMessage.includes('Private video')) {
        throw new Error('This video is private and cannot be downloaded.');
      } else if (errorMessage.includes('Video unavailable')) {
        throw new Error('This video is unavailable or has been removed.');
      } else if (errorMessage.includes('Age-restricted')) {
        throw new Error('This video is age-restricted and cannot be downloaded.');
      } else {
        throw new Error(`Failed to download YouTube video: ${errorMessage}`);
      }
    }
  }
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'YT Downloader Pro API',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.post('/api/extract', async (req, res) => {
  try {
    const { url } = req.body;

    console.log('Extract request received:', { url: url?.substring(0, 50), hasUrl: !!url });

    if (!url) {
      return res.status(400).json({ 
        error: 'URL is required',
        code: 'MISSING_URL'
      });
    }

    if (typeof url !== 'string') {
      return res.status(400).json({ 
        error: 'URL must be a string',
        code: 'INVALID_URL_TYPE'
      });
    }

    const mediaInfo = await YouTubeService.extractMediaInfo(url);
    
    res.json({
      success: true,
      data: mediaInfo
    });
  } catch (error) {
    console.error('Extract error:', error);
    const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
    res.status(400).json({
      error: errorMessage,
      code: 'EXTRACTION_FAILED',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.post('/api/download', async (req, res) => {
  try {
    const { url, type = 'video' } = req.body;

    console.log('Download request received:', { url: url?.substring(0, 50), hasUrl: !!url, type });

    if (!url) {
      return res.status(400).json({ 
        error: 'URL is required',
        code: 'MISSING_URL'
      });
    }

    if (typeof url !== 'string') {
      return res.status(400).json({ 
        error: 'URL must be a string',
        code: 'INVALID_URL_TYPE'
      });
    }

    // Validate YouTube URL format
    if (!YOUTUBE_URL_REGEX.test(url)) {
      console.log('URL validation failed:', url);
      return res.status(400).json({
        error: 'Invalid YouTube URL format',
        code: 'INVALID_URL_FORMAT'
      });
    }

    // Validate URL with ytdl-core before attempting download
    if (!ytdl.validateURL(url)) {
      console.log('ytdl-core URL validation failed:', url);
      return res.status(400).json({
        error: 'Invalid YouTube URL or video not available',
        code: 'INVALID_YOUTUBE_URL'
      });
    }

    // Get download info - all errors must be caught here before setting headers
    let downloadInfo;
    try {
      downloadInfo = await YouTubeService.downloadMedia(url, type);
      
      // Validate downloadInfo before proceeding
      if (!downloadInfo || !downloadInfo.stream) {
        throw new Error('Failed to initialize video download');
      }
    } catch (downloadError) {
      console.error('Download initialization error:', downloadError);
      const errorMessage = downloadError?.message || downloadError?.toString() || 'Failed to prepare video for download';
      return res.status(400).json({
        error: errorMessage,
        code: 'DOWNLOAD_INIT_FAILED'
      });
    }
    
    // Only set headers if we successfully got download info
    // Set appropriate headers for file download
    res.setHeader('Content-Type', downloadInfo.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${downloadInfo.filename}"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length');
    
    if (downloadInfo.contentLength) {
      res.setHeader('Content-Length', downloadInfo.contentLength);
    }

    // Handle stream errors
    downloadInfo.stream.on('error', (streamError) => {
      console.error('Stream error:', streamError.message);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Failed to stream video content',
          code: 'STREAM_ERROR'
        });
      }
    });

    // Handle client disconnect
    req.on('close', () => {
      downloadInfo.stream.destroy();
    });

    downloadInfo.stream.pipe(res);
  } catch (error) {
    console.error('Download error:', error);
    const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
    
    // Don't send response if headers already sent
    if (!res.headersSent) {
      res.status(400).json({
        error: errorMessage,
        code: 'DOWNLOAD_FAILED',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
});

// Serve static files from React build
if (process.env.NODE_ENV === 'production') {
  // Use absolute path to public directory (important since we changed working directory)
  const publicPath = path.resolve(__dirname, 'public');
  console.log('Serving static files from:', publicPath);
  
  // Serve static files (including manifest icons) - must be before API routes
  app.use(express.static(publicPath, {
    maxAge: '1y', // Cache static assets
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      // Set proper content-type for images
      if (filePath.endsWith('.png')) {
        res.setHeader('Content-Type', 'image/png');
      } else if (filePath.endsWith('.ico')) {
        res.setHeader('Content-Type', 'image/x-icon');
      } else if (filePath.endsWith('.svg')) {
        res.setHeader('Content-Type', 'image/svg+xml');
      }
    }
  }));
  
  // Serve index.html for all non-API routes
  app.get('*', (req, res, next) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    // Don't serve index.html for static assets
    if (req.path.match(/\.(png|jpg|jpeg|gif|ico|svg|js|css|json)$/)) {
      return next(); // Let express.static handle it
    }
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 YT Downloader Pro API running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
