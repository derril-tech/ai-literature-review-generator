import { useState } from 'react';

type BundleData = {
  papers: Array<{ id: string; title: string; weight: number }>;
  quotes: Array<{
    paper_id: string;
    paper_title: string;
    quote: string;
    page: number;
    section: string;
  }>;
  bibtex: string;
  csl: any[];
};

interface BundleBuilderProps {
  themeId: string;
  projectId: string;
  onClose?: () => void;
}

export default function BundleBuilder({ themeId, projectId, onClose }: BundleBuilderProps) {
  const [bundleData, setBundleData] = useState<BundleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [k, setK] = useState(10);

  const createBundle = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/themes/bundles/citations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId, projectId, k })
      });
      
      if (response.ok) {
        // In a real app, you'd poll for completion or use SSE
        // For now, simulate bundle data
        setBundleData({
          papers: [
            { id: '1', title: 'Sample Paper 1', weight: 0.9 },
            { id: '2', title: 'Sample Paper 2', weight: 0.8 }
          ],
          quotes: [
            {
              paper_id: '1',
              paper_title: 'Sample Paper 1',
              quote: 'This is a representative quote from the paper.',
              page: 1,
              section: 'abstract'
            }
          ],
          bibtex: '@article{1,\n  title = {Sample Paper 1},\n  author = {Author, A.},\n  year = {2023}\n}',
          csl: []
        });
      }
    } catch (error) {
      console.error('Failed to create bundle:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadBibTeX = () => {
    if (!bundleData?.bibtex) return;
    const blob = new Blob([bundleData.bibtex], { type: 'application/x-bibtex' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `theme-${themeId}-bundle.bib`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCSL = () => {
    if (!bundleData?.csl) return;
    const blob = new Blob([JSON.stringify(bundleData.csl, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `theme-${themeId}-bundle.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="border rounded p-4 bg-white shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Citation Bundle Builder</h3>
        {onClose && (
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        )}
      </div>

      {!bundleData ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Number of papers (k): {k}
            </label>
            <input
              type="range"
              min="5"
              max="50"
              value={k}
              onChange={(e) => setK(Number(e.target.value))}
              className="w-full"
            />
          </div>
          
          <button
            onClick={createBundle}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating Bundle...' : 'Create Citation Bundle'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Papers ({bundleData.papers.length})</h4>
            <ul className="space-y-1">
              {bundleData.papers.map((paper) => (
                <li key={paper.id} className="text-sm">
                  {paper.title} ({(paper.weight * 100).toFixed(1)}%)
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">Quotes ({bundleData.quotes.length})</h4>
            <ul className="space-y-1">
              {bundleData.quotes.map((quote, index) => (
                <li key={index} className="text-sm italic">
                  "{quote.quote}" - {quote.paper_title}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={downloadBibTeX}
              className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
            >
              Download BibTeX
            </button>
            <button
              onClick={downloadCSL}
              className="bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700"
            >
              Download CSL JSON
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
