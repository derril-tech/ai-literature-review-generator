import Head from 'next/head';
import Link from 'next/link';

export default function HomePage() {
  return (
    <>
      <Head>
        <title>AI Literature Review Generator</title>
      </Head>
      <main className="min-h-screen p-8">
        <h1 className="text-3xl font-semibold">AI Literature Review Generator</h1>
        <p className="mt-4 text-gray-700">
          Upload papers or connect sources to generate evidence-linked summaries, themes, and citation bundles.
        </p>
        <div className="mt-8">
          <Link className="text-blue-600 underline" href="#">Get started</Link>
        </div>
      </main>
    </>
  );
}

