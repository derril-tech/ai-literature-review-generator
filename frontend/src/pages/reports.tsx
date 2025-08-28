import Head from 'next/head';
import { useEffect, useState } from 'react';

type Export = {
  id: string;
  type: string;
  status: string;
  fileName?: string;
  fileSize?: number;
  createdAt: string;
  metadata?: any;
};

export default function ReportsPage() {
  const [exports, setExports] = useState<Export[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const projectId = 'demo';
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/exports?projectId=${projectId}`)
      .then((r) => r.json())
      .then((data) => {
        setExports(data);
        setLoading(false);
      })
      .catch(() => {
        setExports([]);
        setLoading(false);
      });
  }, []);

  const createExport = async (type: 'docx' | 'json') => {
    setCreating(true);
    try {
      const projectId = 'demo';
      const endpoint = type === 'docx' ? 'review' : 'json';
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/exports/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, type })
      });
      
      if (response.ok) {
        // Refresh exports list
        const updatedExports = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/exports?projectId=${projectId}`).then(r => r.json());
        setExports(updatedExports);
      }
    } catch (error) {
      console.error('Failed to create export:', error);
    } finally {
      setCreating(false);
    }
  };

  const downloadExport = (exportRecord: Export) => {
    // In production, this would generate a signed URL
    console.log('Downloading:', exportRecord.fileName);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'processing': return 'text-yellow-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <>
      <Head>
        <title>Reports & Exports</title>
      </Head>
      <main className="p-8">
        <h1 className="text-2xl font-semibold mb-6">Reports & Exports</h1>
        
        {loading ? (
          <p>Loading exports...</p>
        ) : (
          <div className="space-y-6">
            {/* Create Export */}
            <div className="border rounded p-4 bg-white">
              <h2 className="text-lg font-semibold mb-4">Create New Export</h2>
              <div className="flex space-x-4">
                <button
                  onClick={() => createExport('docx')}
                  disabled={creating}
                  className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Export as DOCX'}
                </button>
                <button
                  onClick={() => createExport('json')}
                  disabled={creating}
                  className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Export as JSON'}
                </button>
              </div>
            </div>

            {/* Exports List */}
            <div className="border rounded p-4 bg-white">
              <h2 className="text-lg font-semibold mb-4">Recent Exports ({exports.length})</h2>
              <div className="space-y-2">
                {exports.length > 0 ? (
                  exports.map((exportRecord) => (
                    <div key={exportRecord.id} className="flex justify-between items-center p-3 border rounded">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">
                            {exportRecord.type.toUpperCase()} Export
                          </span>
                          <span className={`text-sm ${getStatusColor(exportRecord.status)}`}>
                            {exportRecord.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          Created: {new Date(exportRecord.createdAt).toLocaleString()}
                          {exportRecord.fileSize && (
                            <span className="ml-2">Size: {formatFileSize(exportRecord.fileSize)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {exportRecord.status === 'completed' && (
                          <button
                            onClick={() => downloadExport(exportRecord)}
                            className="bg-blue-600 text-white py-1 px-3 rounded text-sm hover:bg-blue-700"
                          >
                            Download
                          </button>
                        )}
                        {exportRecord.status === 'failed' && (
                          <button className="bg-red-600 text-white py-1 px-3 rounded text-sm hover:bg-red-700">
                            Retry
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No exports found</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
