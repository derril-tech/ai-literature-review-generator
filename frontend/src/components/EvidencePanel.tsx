import { useState } from 'react';

type Quote = {
  paper_id: string;
  paper_title: string;
  quote: string;
  page: number;
  section: string;
};

interface EvidencePanelProps {
  quotes: Quote[];
  onClose?: () => void;
}

export default function EvidencePanel({ quotes, onClose }: EvidencePanelProps) {
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

  return (
    <div className="border rounded p-4 bg-white shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Evidence & Quotes</h3>
        {onClose && (
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        )}
      </div>

      <div className="space-y-4">
        {quotes.length > 0 ? (
          quotes.map((quote, index) => (
            <div
              key={index}
              className={`p-3 border rounded cursor-pointer transition-colors ${
                selectedQuote === quote ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
              }`}
              onClick={() => setSelectedQuote(quote)}
            >
              <div className="text-sm text-gray-600 mb-1">
                {quote.paper_title} (p.{quote.page}, {quote.section})
              </div>
              <div className="text-sm italic">"{quote.quote}"</div>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No quotes available</p>
        )}
      </div>

      {selectedQuote && (
        <div className="mt-4 p-3 bg-gray-50 rounded">
          <h4 className="font-medium mb-2">Selected Quote</h4>
          <p className="text-sm mb-2">
            <strong>Source:</strong> {selectedQuote.paper_title}
          </p>
          <p className="text-sm mb-2">
            <strong>Location:</strong> Page {selectedQuote.page}, {selectedQuote.section}
          </p>
          <blockquote className="text-sm italic border-l-4 border-blue-300 pl-3">
            "{selectedQuote.quote}"
          </blockquote>
        </div>
      )}
    </div>
  );
}
