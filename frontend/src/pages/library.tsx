import Head from 'next/head';
import { useEffect, useState } from 'react';

type Document = {
  id: string;
  title: string;
  status: string;
  hash: string;
  doi?: string;
};

type PrismaStats = {
  total: number;
  included: number;
  excluded: number;
  deduplicated: number;
};

export default function LibraryPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<PrismaStats>({ total: 0, included: 0, excluded: 0, deduplicated: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Placeholder fetch; projectId to be wired later
    const projectId = 'demo';
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/documents?projectId=${projectId}`)
      .then((r) => r.json())
      .then((data) => {
        setDocuments(data);
        // Calculate PRISMA stats
        const total = data.length;
        const included = data.filter((d: Document) => d.status === 'parsed').length;
        const excluded = data.filter((d: Document) => d.status === 'excluded').length;
        const deduplicated = total - data.filter((d: Document) => d.hash).length;
        
        setStats({ total, included, excluded, deduplicated });
        setLoading(false);
      })
      .catch(() => {
        setDocuments([]);
        setLoading(false);
      });
  }, []);

  return (
    <>
      <Head>
        <title>Library</title>
      </Head>
      <main className="p-8">
        <h1 className="text-2xl font-semibold mb-6">Library & PRISMA Flow</h1>
        
        {loading ? (
          <p>Loading library...</p>
        ) : (
          <div className="space-y-6">
            {/* PRISMA Flow */}
            <div className="border rounded p-4 bg-white">
              <h2 className="text-lg font-semibold mb-4">PRISMA Flow</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded">
                  <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                  <div className="text-sm text-gray-600">Total Papers</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded">
                  <div className="text-2xl font-bold text-yellow-600">{stats.deduplicated}</div>
                  <div className="text-sm text-gray-600">Deduplicated</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded">
                  <div className="text-2xl font-bold text-red-600">{stats.excluded}</div>
                  <div className="text-sm text-gray-600">Excluded</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded">
                  <div className="text-2xl font-bold text-green-600">{stats.included}</div>
                  <div className="text-sm text-gray-600">Included</div>
                </div>
              </div>
            </div>

            {/* Documents List */}
            <div className="border rounded p-4 bg-white">
              <h2 className="text-lg font-semibold mb-4">Documents ({documents.length})</h2>
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex justify-between items-center p-2 border rounded">
                    <div className="flex-1">
                      <div className="font-medium">{doc.title || 'Untitled'}</div>
                      <div className="text-sm text-gray-500">
                        Status: {doc.status} | DOI: {doc.doi || 'N/A'}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {doc.hash.substring(0, 8)}...
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
