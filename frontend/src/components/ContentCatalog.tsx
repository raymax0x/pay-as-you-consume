'use client';

import { useState, useEffect } from 'react';

interface ContentInfo {
  id: string;
  contentId: string;
  title: string;
  description: string;
  fullPrice: string;
  totalDuration: number;
  category: string;
  thumbnailUrl?: string;
  isActive: boolean;
  createdAt: string;
}

interface ContentCatalogProps {
  onSelectContent: (content: ContentInfo) => void;
  selectedContent?: ContentInfo;
}

export function ContentCatalog({ onSelectContent, selectedContent }: ContentCatalogProps) {
  const [content, setContent] = useState<ContentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatPrice = (priceWei: string) => {
    return (parseInt(priceWei) / 1000000).toFixed(2);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const fetchContent = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/content');
      const data = await response.json();

      if (data.success) {
        setContent(data.data);
        // Auto-select first content if none selected
        if (!selectedContent && data.data.length > 0) {
          onSelectContent(data.data[0]);
        }
      } else {
        setError(data.message || 'Failed to fetch content');
      }
    } catch (err) {
      setError('Error connecting to backend');
      console.error('Content fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Content Catalog</h2>
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Content Catalog</h2>
        <div className="bg-red-50 text-red-700 p-4 rounded-lg text-center">
          <p>{error}</p>
          <button
            onClick={fetchContent}
            className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (content.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Content Catalog</h2>
        <div className="text-center py-8">
          <div className="text-4xl mb-4">📺</div>
          <p className="text-gray-600">No content available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Content Catalog</h2>
        <button
          onClick={fetchContent}
          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-4">
        {content.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelectContent(item)}
            className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
              selectedContent?.id === item.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 mb-1">{item.title}</h3>
                <p className="text-sm text-gray-600 mb-3">{item.description}</p>

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="bg-gray-100 px-2 py-1 rounded">
                    📂 {item.category}
                  </span>
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                    💰 {formatPrice(item.fullPrice)} USDC
                  </span>
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    ⏱️ {formatDuration(item.totalDuration)}
                  </span>
                </div>
              </div>

              {selectedContent?.id === item.id && (
                <div className="ml-4 text-blue-600">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 text-xs text-gray-500 text-center">
        💡 Select content to start streaming. Pay only for what you watch!
      </div>
    </div>
  );
}