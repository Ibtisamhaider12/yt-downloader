import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import axios from 'axios';
import './App.css';

// SVG Icon Components - Distinctive YouTube-style icons
const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
  </svg>
);

const DownloadIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
  </svg>
);

const ClearIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
  </svg>
);

// API Base URL configuration
// In production (Railway), use relative path since frontend and backend are served from same domain
// In development, use the configured API URL or default to localhost
const getApiBaseUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    // Production: Use relative path (Railway serves React build from same domain as API)
    return '/api';
  }
  // Development: Use environment variable or default to localhost
  return process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
};

const API_BASE_URL = getApiBaseUrl();

interface MediaInfo {
  title: string;
  description: string;
  imageUrl: string;
  videoUrl: string;
  type: string;
  author: string;
  board: string;
  videoId?: string;
  duration?: string;
  viewCount?: string;
}

const AppContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 25%, #16213e 50%, #0f3460 75%, #533483 100%);
  background-attachment: fixed;
  position: relative;
  overflow-x: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 80%, rgba(255, 0, 0, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(0, 255, 255, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 40% 40%, rgba(255, 255, 255, 0.05) 0%, transparent 50%),
      linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.02) 50%, transparent 70%);
    pointer-events: none;
    animation: backgroundShift 20s ease-in-out infinite;
  }
  
  @keyframes backgroundShift {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }
`;

const MainCard = styled(motion.div)`
  max-width: 900px;
  margin: 2rem auto;
  padding: 3rem;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border-radius: 32px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 
    0 20px 40px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  position: relative;
  z-index: 1;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
    border-radius: 32px;
    pointer-events: none;
  }
  
  @media (max-width: 768px) {
    margin: 1rem;
    padding: 2rem;
    border-radius: 24px;
  }
`;

const Header = styled(motion.div)`
  text-align: center;
  margin-bottom: 4rem;
  position: relative;
  
  h1 {
    font-size: 4rem;
    font-weight: 900;
    background: linear-gradient(135deg, #ffffff 0%, #ff6b6b 25%, #4ecdc4 50%, #45b7d1 75%, #96ceb4 100%);
    background-size: 400% 400%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 1.5rem;
    animation: gradientShift 4s ease-in-out infinite;
    text-shadow: 0 0 30px rgba(255, 255, 255, 0.3);
    
    @keyframes gradientShift {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }
    
    @media (max-width: 768px) {
      font-size: 2.5rem;
    }
  }
  
  p {
    font-size: 1.3rem;
    color: rgba(255, 255, 255, 0.8);
    font-weight: 300;
    letter-spacing: 0.5px;
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.6;
    
    @media (max-width: 768px) {
      font-size: 1.1rem;
    }
  }
`;

const InputSection = styled(motion.div)`
  margin-bottom: 2rem;
`;

const InputContainer = styled.div`
  position: relative;
  margin-bottom: 1.5rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 1.5rem 2rem;
  font-size: 1.2rem;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.05);
  color: white;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
    font-weight: 300;
  }
  
  &:focus {
    outline: none;
    border-color: #4ecdc4;
    box-shadow: 
      0 0 0 4px rgba(78, 205, 196, 0.2),
      0 8px 25px rgba(0, 0, 0, 0.2);
    background: rgba(255, 255, 255, 0.08);
    transform: translateY(-2px);
  }
  
  &:hover {
    border-color: rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.08);
  }
  
  @media (max-width: 768px) {
    padding: 1.2rem 1.5rem;
    font-size: 1.1rem;
  }
`;

const Button = styled(motion.button)<{ $primary?: boolean; $secondary?: boolean; $success?: boolean }>`
  padding: 1.2rem 2.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  justify-content: center;
  min-width: 160px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }
  
  &:hover::before {
    left: 100%;
  }
  
  ${props => props.$primary && `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
    
    &:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 30px rgba(102, 126, 234, 0.6);
    }
    
    &:active {
      transform: translateY(-1px);
    }
  `}
  
  ${props => props.$secondary && `
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: 2px solid rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
    
    &:hover {
      background: rgba(255, 255, 255, 0.2);
      border-color: rgba(255, 255, 255, 0.3);
      transform: translateY(-3px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
    }
    
    &:active {
      transform: translateY(-1px);
    }
  `}
  
  ${props => props.$success && `
    background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
    color: white;
    box-shadow: 0 6px 20px rgba(78, 205, 196, 0.4);
    
    &:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 30px rgba(78, 205, 196, 0.6);
    }
    
    &:active {
      transform: translateY(-1px);
    }
  `}
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
  }
  
  @media (max-width: 768px) {
    padding: 1rem 2rem;
    font-size: 1rem;
    min-width: 140px;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 2rem;
  
  @media (max-width: 768px) {
    gap: 1rem;
    flex-direction: column;
    align-items: center;
  }
`;

const PreviewSection = styled(motion.div)`
  margin-top: 3rem;
  padding: 2.5rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  
  @media (max-width: 768px) {
    padding: 1.5rem;
    margin-top: 2rem;
  }
`;

const MediaPreview = styled.div`
  display: flex;
  gap: 2rem;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const Thumbnail = styled.img`
  width: 240px;
  height: 135px;
  border-radius: 16px;
  object-fit: cover;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  transition: transform 0.3s ease;
  
  &:hover {
    transform: scale(1.05);
  }
  
  @media (max-width: 768px) {
    width: 100%;
    height: auto;
    max-height: 200px;
  }
`;

const MediaInfoContainer = styled.div`
  flex: 1;
  color: white;
  
  h3 {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 1rem;
    color: #4ecdc4;
    line-height: 1.3;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
  
  p {
    color: rgba(255, 255, 255, 0.8);
    line-height: 1.7;
    margin-bottom: 1rem;
    font-size: 1rem;
  }
  
  .meta {
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.6;
    
    strong {
      color: #4ecdc4;
      font-weight: 600;
    }
  }
  
  @media (max-width: 768px) {
    h3 {
      font-size: 1.3rem;
    }
    
    p {
      font-size: 0.95rem;
    }
  }
`;

const ErrorMessage = styled(motion.div)`
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  color: #ff6b6b;
  padding: 1.5rem;
  border-radius: 16px;
  margin-top: 2rem;
  text-align: center;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 15px rgba(255, 107, 107, 0.2);
  font-weight: 500;
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #4ecdc4;
  animation: spin 1s ease-in-out infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const ProgressBar = styled.div<{ $progress: number }>`
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  overflow: hidden;
  margin-top: 1rem;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
  position: relative;
  
  &::before {
    content: '';
    display: block;
    width: ${props => props.$progress}%;
    height: 100%;
    background: linear-gradient(90deg, #4ecdc4, #45b7d1, #96ceb4);
    transition: width 0.3s ease;
    border-radius: 4px;
    box-shadow: 0 0 15px rgba(78, 205, 196, 0.6);
    position: relative;
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: ${props => props.$progress}%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    animation: shimmer 2s infinite;
  }
  
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`;

const DownloadStatus = styled(motion.div)`
  background: rgba(78, 205, 196, 0.1);
  border: 1px solid rgba(78, 205, 196, 0.3);
  color: #4ecdc4;
  padding: 1.5rem;
  border-radius: 16px;
  margin-top: 2rem;
  text-align: center;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 15px rgba(78, 205, 196, 0.2);
  font-weight: 500;
`;

const StatsSection = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 2rem;
  margin-top: 4rem;
`;

const StatCard = styled(motion.div)`
  text-align: center;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
  }
  
  h3 {
    font-size: 2.5rem;
    font-weight: 800;
    color: #4ecdc4;
    margin-bottom: 0.75rem;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
  
  p {
    color: rgba(255, 255, 255, 0.8);
    font-weight: 400;
    font-size: 1.1rem;
    letter-spacing: 0.5px;
  }
  
  @media (max-width: 768px) {
    padding: 1.5rem;
    
    h3 {
      font-size: 2rem;
    }
    
    p {
      font-size: 1rem;
    }
  }
`;

function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);
  const [error, setError] = useState('');

  const handleExtract = useCallback(async () => {
    if (!url.trim()) {
      toast.error('Please enter a YouTube URL');
      return;
    }

    setLoading(true);
    setError('');
    setMediaInfo(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/extract`, { url }, {
        timeout: 30000, // 30 seconds timeout
        onDownloadProgress: (progressEvent) => {
          // For extract, we can show a simple loading state
          console.log('Extracting video info...');
        }
      });
      
      if (response.data.success && response.data.data) {
        setMediaInfo(response.data.data);
        toast.success('Video information extracted successfully!');
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error: any) {
      console.error('Extract error:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMessage = 'Failed to extract video information';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout - please try again';
      } else if (error.response?.status === 400) {
        // Try to get error message from response
        const serverError = error.response?.data;
        if (serverError?.error) {
          errorMessage = serverError.error;
        } else if (typeof serverError === 'string') {
          errorMessage = serverError;
        } else {
          errorMessage = 'Invalid YouTube URL or video not available';
        }
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error - please try again later';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [url]);

  const handleDownload = useCallback(async () => {
    if (!url.trim()) {
      toast.error('Please enter a YouTube URL');
      return;
    }

    setDownloading(true);
    setError('');
    setDownloadProgress(0);

    try {
      const response = await axios.post(`${API_BASE_URL}/download`, { 
        url, 
        type: 'video' 
      }, {
        responseType: 'blob',
        timeout: 300000, // 5 minutes timeout
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setDownloadProgress(percentCompleted);
            console.log(`Download progress: ${percentCompleted}%`);
          } else {
            // If total is not available, estimate based on loaded bytes
            const estimatedTotal = progressEvent.loaded * 1.2; // Rough estimate
            const percentCompleted = Math.min(Math.round((progressEvent.loaded * 100) / estimatedTotal), 95);
            setDownloadProgress(percentCompleted);
          }
        }
      });

      // Check if response is actually a blob
      if (!(response.data instanceof Blob)) {
        throw new Error('Invalid response format');
      }

      // Set progress to 100% when download completes
      setDownloadProgress(100);

      // Create download link
      const blob = new Blob([response.data], { type: 'video/mp4' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Extract filename from Content-Disposition header or create one
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'yt-downloader-pro-video.mp4';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.success('Video downloaded successfully!');
    } catch (error: any) {
      console.error('Download error:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMessage = 'Failed to download video';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Download timeout - please try again';
      } else if (error.response?.status === 400) {
        // Try to get error message from response
        const serverError = error.response?.data;
        if (serverError?.error) {
          errorMessage = serverError.error;
        } else if (typeof serverError === 'string') {
          errorMessage = serverError;
        } else {
          errorMessage = 'Invalid video URL or video not available for download';
        }
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error - please try again later';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setDownloading(false);
      // Reset progress after a short delay
      setTimeout(() => setDownloadProgress(0), 2000);
    }
  }, [url]);

  const handleClear = useCallback(() => {
    setUrl('');
    setMediaInfo(null);
    setError('');
    setDownloadProgress(0);
  }, []);

  return (
    <AppContainer>
      <MainCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h1>YT Downloader Pro</h1>
          <p>Professional YouTube video downloader with advanced features</p>
        </Header>

        <InputSection
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <InputContainer>
            <Input
              type="text"
              placeholder="Paste YouTube URL here (e.g., https://www.youtube.com/watch?v=...)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleExtract()}
            />
          </InputContainer>
          
          <ButtonGroup>
            <Button
              $primary
              onClick={handleExtract}
              disabled={loading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              {loading ? <LoadingSpinner /> : <><SearchIcon /> Extract Info</>}
            </Button>
            
            <Button
              $success
              onClick={handleDownload}
              disabled={downloading || !url.trim()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              {downloading ? <LoadingSpinner /> : <><DownloadIcon /> Download Video</>}
            </Button>
            
            <Button
              $secondary
              onClick={handleClear}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <ClearIcon /> Clear
            </Button>
          </ButtonGroup>
        </InputSection>

        {downloading && (
          <DownloadStatus
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span>Downloading video...</span>
              <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{downloadProgress}%</span>
            </div>
            <ProgressBar $progress={downloadProgress} />
            <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
              {downloadProgress < 10 ? 'Initializing download...' :
               downloadProgress < 50 ? 'Downloading video data...' :
               downloadProgress < 90 ? 'Processing video...' :
               downloadProgress < 100 ? 'Finalizing download...' :
               'Download complete!'}
            </div>
          </DownloadStatus>
        )}

        {error && (
          <ErrorMessage
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {error}
          </ErrorMessage>
        )}

        {mediaInfo && (
          <PreviewSection
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <MediaPreview>
              <Thumbnail src={mediaInfo.imageUrl} alt="Video thumbnail" />
              <MediaInfoContainer>
                <h3>{mediaInfo.title}</h3>
                <p>{mediaInfo.description?.substring(0, 200)}...</p>
                <div className="meta">
                  <strong>Author:</strong> {mediaInfo.author}<br />
                  <strong>Duration:</strong> {mediaInfo.duration ? `${Math.floor(parseInt(mediaInfo.duration) / 60)}:${(parseInt(mediaInfo.duration) % 60).toString().padStart(2, '0')}` : 'N/A'}<br />
                  <strong>Views:</strong> {mediaInfo.viewCount ? parseInt(mediaInfo.viewCount).toLocaleString() : 'N/A'}
                </div>
              </MediaInfoContainer>
            </MediaPreview>
          </PreviewSection>
        )}

        <StatsSection
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <StatCard 
            whileHover={{ scale: 1.05 }} 
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <h3>10K+</h3>
            <p>Downloads</p>
          </StatCard>
          <StatCard 
            whileHover={{ scale: 1.05 }} 
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <h3>99%</h3>
            <p>Success Rate</p>
          </StatCard>
          <StatCard 
            whileHover={{ scale: 1.05 }} 
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <h3>24/7</h3>
            <p>Available</p>
          </StatCard>
        </StatsSection>
      </MainCard>
    </AppContainer>
  );
}

export default App;