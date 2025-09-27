'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';

interface ContentInfo {
  id: string;
  contentId: string;
  title: string;
  description: string;
  fullPrice: string;
  totalDuration: number;
  category: string;
  thumbnailUrl?: string;
}

interface SessionData {
  sessionId: string;
  status: 'active' | 'paused' | 'completed';
  startTime: string;
  currentCost?: string;
  activeDuration?: number;
}

interface VideoPlayerProps {
  content: ContentInfo;
}

export function VideoPlayer({ content }: VideoPlayerProps) {
  const { address, isConnected } = useAccount();
  const [session, setSession] = useState<SessionData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [cost, setCost] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const formatPrice = (priceWei: string) => {
    return (parseInt(priceWei) / 1000000).toFixed(2);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateCostPerSecond = () => {
    return parseInt(content.fullPrice) / content.totalDuration;
  };

  const updateTimer = () => {
    if (isPlaying && session?.status === 'active') {
      setCurrentTime(prev => {
        const newTime = prev + 1;
        const newCost = Math.floor(calculateCostPerSecond() * newTime);
        setCost(newCost.toString());
        return newTime;
      });
    }
  };

  useEffect(() => {
    if (isPlaying && session?.status === 'active') {
      intervalRef.current = setInterval(updateTimer, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, session?.status]);

  const startSession = async () => {
    if (!address || !isConnected) {
      setError('Please connect your wallet');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/session/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: address,
          contentId: content.contentId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSession(data.data);
        setIsPlaying(true);
        setCurrentTime(0);
        setCost('0');
      } else {
        setError(data.message || 'Failed to start session');
      }
    } catch (err) {
      setError('Error connecting to backend');
      console.error('Start session error:', err);
    } finally {
      setLoading(false);
    }
  };

  const pauseSession = async () => {
    if (!session || !address) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/session/pause', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: session.sessionId,
          userAddress: address,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSession(data.data);
        setIsPlaying(false);
      } else {
        setError(data.message || 'Failed to pause session');
      }
    } catch (err) {
      setError('Error pausing session');
      console.error('Pause session error:', err);
    } finally {
      setLoading(false);
    }
  };

  const resumeSession = async () => {
    if (!session || !address) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/session/resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: session.sessionId,
          userAddress: address,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSession(data.data);
        setIsPlaying(true);
      } else {
        setError(data.message || 'Failed to resume session');
      }
    } catch (err) {
      setError('Error resuming session');
      console.error('Resume session error:', err);
    } finally {
      setLoading(false);
    }
  };

  const stopSession = async () => {
    if (!session || !address) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/session/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: session.sessionId,
          userAddress: address,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSession(null);
        setIsPlaying(false);
        alert(`Session completed! Total cost: ${formatPrice(data.data.finalCost)} USDC`);
        // Reset state
        setCurrentTime(0);
        setCost('0');
      } else {
        setError(data.message || 'Failed to stop session');
      }
    } catch (err) {
      setError('Error stopping session');
      console.error('Stop session error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = () => {
    if (!session) {
      startSession();
    } else if (isPlaying) {
      pauseSession();
    } else {
      resumeSession();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Video Thumbnail/Player Area */}
      <div className="relative bg-gray-900 aspect-video flex items-center justify-center">
        {content.thumbnailUrl ? (
          <img
            src={content.thumbnailUrl}
            alt={content.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-white text-center">
            <div className="text-6xl mb-4">🎥</div>
            <h3 className="text-xl font-semibold">{content.title}</h3>
            <p className="text-gray-300 mt-2">{content.description}</p>
          </div>
        )}

        {/* Play overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <button
              onClick={handlePlayPause}
              disabled={loading || !isConnected}
              className="w-20 h-20 bg-white rounded-full flex items-center justify-center hover:bg-gray-200 disabled:opacity-50"
            >
              <div className="w-0 h-0 border-l-8 border-r-0 border-t-6 border-b-6 border-l-gray-800 border-t-transparent border-b-transparent ml-1"></div>
            </button>
          </div>
        )}

        {/* Playing indicator */}
        {isPlaying && (
          <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
            🔴 LIVE - Pay-per-second
          </div>
        )}
      </div>

      {/* Controls and Info */}
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{content.title}</h2>
            <p className="text-gray-600 mt-1">{content.description}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span>💰 Full Price: {formatPrice(content.fullPrice)} USDC</span>
              <span>⏱️ Duration: {formatDuration(content.totalDuration)}</span>
              <span>📂 {content.category}</span>
            </div>
          </div>
        </div>

        {/* Session Info */}
        {session && (
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Current Session</p>
                <p className="font-mono text-sm text-gray-800">ID: {session.sessionId.slice(-8)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Status</p>
                <p className={`font-semibold ${
                  session.status === 'active' ? 'text-green-600' :
                  session.status === 'paused' ? 'text-yellow-600' : 'text-gray-600'
                }`}>
                  {session.status.toUpperCase()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Timer and Cost */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <p className="text-sm text-gray-600">Time Watched</p>
            <p className="text-lg font-bold text-gray-800">{formatDuration(currentTime)}</p>
          </div>
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <p className="text-sm text-gray-600">Current Cost</p>
            <p className="text-lg font-bold text-green-600">{formatPrice(cost)} USDC</p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-3">
          {!session ? (
            <button
              onClick={startSession}
              disabled={loading || !isConnected}
              className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Starting...' : !isConnected ? 'Connect Wallet to Start' : '▶️ Start Streaming'}
            </button>
          ) : (
            <>
              <button
                onClick={handlePlayPause}
                disabled={loading}
                className={`flex-1 py-3 px-6 rounded-lg font-semibold disabled:opacity-50 ${
                  isPlaying
                    ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {loading ? 'Loading...' : isPlaying ? '⏸️ Pause' : '▶️ Resume'}
              </button>
              <button
                onClick={stopSession}
                disabled={loading}
                className="bg-red-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Stopping...' : '⏹️ Stop & Pay'}
              </button>
            </>
          )}
        </div>

        {/* Payment Info */}
        <div className="mt-4 text-xs text-gray-500 text-center">
          💡 You pay only for what you watch. Payments are deducted from your yield first, then principal.
        </div>
      </div>
    </div>
  );
}