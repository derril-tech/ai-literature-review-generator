import Head from 'next/head';
import { useEffect, useState } from 'react';
import ThemeMap from '@/components/ThemeMap';
import ThemePanel from '@/components/ThemePanel';

type Theme = { id: string; label: string; provenance?: any };

export default function ThemesPage() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Placeholder fetch; projectId to be wired later
    const projectId = 'demo';
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/themes?projectId=${projectId}`)
      .then((r) => r.json())
      .then((data) => {
        setThemes(data);
        setLoading(false);
      })
      .catch(() => {
        setThemes([]);
        setLoading(false);
      });
  }, []);

  const handleThemeClick = (theme: Theme) => {
    setSelectedTheme(theme);
  };

  return (
    <>
      <Head>
        <title>Themes</title>
      </Head>
      <main className="p-8">
        <h1 className="text-2xl font-semibold mb-6">Themes</h1>
        
        {loading ? (
          <p>Loading themes...</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ThemeMap themes={themes} onThemeClick={handleThemeClick} />
            
            {selectedTheme ? (
              <ThemePanel theme={selectedTheme} onClose={() => setSelectedTheme(null)} />
            ) : (
              <div className="border rounded p-4 bg-gray-50">
                <p className="text-gray-500">Click a theme to view details</p>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
