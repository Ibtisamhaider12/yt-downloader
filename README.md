# YT Downloader Pro

A professional YouTube video downloader with a modern, aesthetic UI and real-time download progress tracking.

## Features

- 🎥 **YouTube Video Download**: Download videos in high quality
- 🔍 **Video Information Extraction**: Get detailed video metadata
- 📊 **Real-time Progress**: Live download progress with visual feedback
- 🎨 **Modern UI**: Dark theme with glassmorphism effects
- ⚡ **Fast Performance**: Optimized for speed and reliability
- 🔒 **Professional Branding**: Clean, YouTube-style interface

## Tech Stack

### Frontend
- **React 19** with TypeScript
- **Styled Components** for styling
- **Framer Motion** for animations
- **Axios** for API calls
- **React Hot Toast** for notifications

### Backend
- **Node.js** with Express.js
- **@distube/ytdl-core** for YouTube video processing
- **CORS** enabled for cross-origin requests
- **Helmet** for security headers
- **Rate limiting** for API protection

### Infrastructure
- **Docker** containerization
- **Docker Compose** for orchestration
- **Environment-based configuration**

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Docker (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/yt-downloader.git
   cd yt-downloader
   ```

2. **Install dependencies**
   ```bash
   # Install server dependencies
   cd server
   npm install
   
   # Install client dependencies
   cd ../client
   npm install
   ```

3. **Configure environment variables**
   ```bash
   # Server configuration
   cp server/config.env.example server/config.env
   
   # Client configuration
   cp client/env.local.example client/env.local
   ```

4. **Start the application**
   ```bash
   # Start server
   cd server
   npm start
   
   # Start client (in new terminal)
   cd client
   npm start
   ```

### Docker Setup

```bash
# Build and start with Docker Compose
docker-compose up --build
```

## Usage

1. **Open the application** at `http://localhost:3000`
2. **Paste a YouTube URL** in the input field
3. **Click "Extract Info"** to get video details
4. **Click "Download Video"** to download the video
5. **Monitor progress** with the real-time progress bar

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/extract` - Extract video information
- `POST /api/download` - Download video file

## Configuration

### Server Environment Variables
```env
PORT=5001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### Client Environment Variables
```env
REACT_APP_API_URL=http://localhost:5001/api
PORT=3000
```

## Development

### Project Structure
```
yt-downloader/
├── client/                 # React frontend
│   ├── public/            # Static assets
│   ├── src/               # Source code
│   └── package.json       # Frontend dependencies
├── server/                # Node.js backend
│   ├── index.js          # Main server file
│   ├── config.env        # Environment config
│   └── package.json      # Backend dependencies
├── docker-compose.yml    # Docker orchestration
├── Dockerfile           # Docker configuration
└── README.md           # This file
```

### Available Scripts

**Client:**
- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests

**Server:**
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This tool is for educational purposes only. Please respect YouTube's Terms of Service and only download videos you have permission to download.

## Support

If you encounter any issues or have questions, please open an issue on GitHub.

---

**YT Downloader Pro** - Professional YouTube video downloader with modern UI and advanced features.
