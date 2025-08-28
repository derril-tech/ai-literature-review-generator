import { useState, useEffect } from 'react';

type Theme = { id: string; label: string; provenance?: any };
type Paper = { id: string; title: string; weight: number };

interface ThemePanelProps {
  theme: Theme;
  onClose?: () => void;
}

export default function ThemePanel({ theme, onClose }: ThemePanelProps) {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!theme.id) return;
    
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/themes/${theme.id}`)
      .then((r) => r.json())
      .then((data) => {
        setPapers(data.topPapers || []);
        setLoading(false);
      })
      .catch(() => {
        setPapers([]);
        setLoading(false);
      });
  }, [theme.id]);

  return (
    <div className="border rounded p-4 bg-white shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{theme.label}</h3>
        {onClose && (
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        )}
      </div>
      
      {theme.provenance && (
        <div className="mb-4 p-2 bg-gray-50 rounded">
          <p className="text-sm text-gray-600">
            Method: {theme.provenance.method || 'unknown'}
            {theme.provenance.silhouette && (
              <span className="ml-2">Silhouette: {theme.provenance.silhouette.toFixed(3)}</span>
            )}
          </p>
        </div>
      )}

      <div>
        <h4 className="font-medium mb-2">Key Papers</h4>
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : papers.length > 0 ? (
          <ul className="space-y-2">
            {papers.slice(0, 5).map((paper) => (
              <li key={paper.id} className="text-sm">
                <div className="flex justify-between">
                  <span className="truncate">{paper.title}</span>
                  <span className="text-gray-500 ml-2">{(paper.weight * 100).toFixed(1)}%</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No papers found</p>
        )}
      </div>
    </div>
  );
}
