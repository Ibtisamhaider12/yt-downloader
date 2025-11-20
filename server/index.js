const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const ytdl = require('@distube/ytdl-core');
const path = require('path');
// Load environment variables (Railway provides PORT automatically)
require('dotenv').config({ path: process.env.ENV_FILE_PATH || './config.env' });

const app = express();
const PORT = process.env.PORT || 5001;

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
      // Validate YouTube URL
      if (!YOUTUBE_URL_REGEX.test(url)) {
        throw new Error('Invalid YouTube URL format');
      }

      // Validate URL with ytdl-core
      if (!ytdl.validateURL(url)) {
        throw new Error('Invalid YouTube URL');
      }

      // Get video info using ytdl-core with retry logic
      let videoInfo;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          videoInfo = await ytdl.getInfo(url);
          break;
        } catch (error) {
          attempts++;
          if (attempts >= maxAttempts) {
            throw error;
          }
          console.warn(`YouTube info extraction attempt ${attempts} failed, retrying...`);
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
      throw new Error(`Failed to extract YouTube media: ${error.message}`);
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
      // Validate YouTube URL
      if (!ytdl.validateURL(url)) {
        throw new Error('Invalid YouTube URL');
      }

      // Get video info to determine best format with retry logic
      let videoInfo;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          videoInfo = await ytdl.getInfo(url);
          break;
        } catch (error) {
          attempts++;
          if (attempts >= maxAttempts) {
            throw error;
          }
          console.warn(`YouTube download info attempt ${attempts} failed, retrying...`);
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

      // Create download stream
      const stream = ytdl(url, { format: format });
      
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
      throw new Error(`Failed to download YouTube video: ${error.message}`);
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

    if (!url) {
      return res.status(400).json({ 
        error: 'URL is required',
        code: 'MISSING_URL'
      });
    }

    const mediaInfo = await YouTubeService.extractMediaInfo(url);
    
    res.json({
      success: true,
      data: mediaInfo
    });
  } catch (error) {
    console.error('Extract error:', error.message);
    res.status(400).json({
      error: error.message,
      code: 'EXTRACTION_FAILED'
    });
  }
});

app.post('/api/download', async (req, res) => {
  try {
    const { url, type = 'video' } = req.body;

    if (!url) {
      return res.status(400).json({ 
        error: 'URL is required',
        code: 'MISSING_URL'
      });
    }

    // Validate YouTube URL format
    if (!YOUTUBE_URL_REGEX.test(url)) {
      return res.status(400).json({
        error: 'Invalid YouTube URL format',
        code: 'INVALID_URL_FORMAT'
      });
    }

    const downloadInfo = await YouTubeService.downloadMedia(url, type);
    
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
    console.error('Download error:', error.message);
    
    // Don't send response if headers already sent
    if (!res.headersSent) {
      res.status(400).json({
        error: error.message,
        code: 'DOWNLOAD_FAILED'
      });
    }
  }
});

// Serve static files from React build
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
