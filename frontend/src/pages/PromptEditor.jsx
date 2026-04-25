import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Save } from 'lucide-react';
import { api } from '../lib/api';

const promptSections = [
  {
    id: 'fundSummary',
    label: 'Fund Summary',
    text: '1. Fund Summary',
  },
  {
    id: 'benchmark',
    label: 'Performance vs Benchmark',
    text: '2. Performance vs Benchmark',
  },
  {
    id: 'peers',
    label: 'Peer Comparison',
    text: '3. Peer Comparison',
  },
  {
    id: 'outlook',
    label: 'Market Outlook',
    text: '4. Market Outlook',
  },
  {
    id: 'risk',
    label: 'Risk Commentary',
    text: '5. Risk Commentary',
  },
];

const dataBlocks = [
  { id: 'objective', label: 'Fund Objective', text: 'Fund Objective: {{fundObjective}}' },
  { id: 'metrics', label: 'Metrics', text: 'Metrics:\n{{metrics}}' },
  { id: 'riskMetrics', label: 'Risk Metrics', text: 'Risk:\n{{riskMetrics}}' },
  { id: 'benchmarkData', label: 'Benchmark Data', text: 'Benchmark:\n{{benchmarkData}}' },
  { id: 'peerData', label: 'Peer Data', text: 'Peers:\n{{peerData}}' },
];

const defaultSelectedSections = promptSections.reduce(
  (selected, section) => ({ ...selected, [section.id]: section.id !== 'risk' }),
  {}
);

const defaultSelectedBlocks = dataBlocks.reduce(
  (selected, block) => ({ ...selected, [block.id]: true }),
  {}
);

function buildPrompt(selectedSections, selectedBlocks) {
  const sections = promptSections
    .filter((section) => selectedSections[section.id])
    .map((section) => section.text);

  const blocks = dataBlocks
    .filter((block) => selectedBlocks[block.id])
    .map((block) => block.text);

  return [
    'You are a senior investment reporting analyst.',
    '',
    'Write concise professional bullet points under:',
    ...sections,
    '',
    ...blocks,
  ].join('\n');
}

export default function PromptEditor() {
  const [selectedSections, setSelectedSections] = useState(defaultSelectedSections);
  const [selectedBlocks, setSelectedBlocks] = useState(defaultSelectedBlocks);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const generatedPrompt = useMemo(
    () => buildPrompt(selectedSections, selectedBlocks),
    [selectedSections, selectedBlocks]
  );

  useEffect(() => {
    let active = true;

    async function loadPrompt() {
      try {
        const res = await api.get('/commentary/prompt');
        if (active) {
          setPrompt(res.data.prompt || '');
        }
      } catch (error) {
        console.error('Prompt load failed', error);
        if (active) {
          setPrompt(buildPrompt(defaultSelectedSections, defaultSelectedBlocks));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadPrompt();

    return () => {
      active = false;
    };
  }, []);

  const toggleSection = (id) => {
    setSelectedSections((current) => ({ ...current, [id]: !current[id] }));
    setSaved(false);
  };

  const toggleBlock = (id) => {
    setSelectedBlocks((current) => ({ ...current, [id]: !current[id] }));
    setSaved(false);
  };

  const useGeneratedPrompt = () => {
    setPrompt(generatedPrompt);
    setSaved(false);
  };

  const savePrompt = async () => {
    setSaving(true);
    setSaved(false);

    try {
      await api.put('/commentary/prompt', { prompt });
      setSaved(true);
    } catch (error) {
      console.error('Prompt save failed', error);
      window.alert('Prompt could not be saved. Check the backend server and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.25),_transparent_20%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.18),_transparent_20%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="card flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm uppercase tracking-[0.2em] text-indigo-300">AI Reporting Studio</div>
            <h1 className="text-3xl font-bold mt-1">Prompt Editor</h1>
          </div>
          <Link className="btn" to="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Commentary
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
          <aside className="card h-fit space-y-6">
            <div>
              <div className="font-semibold mb-3">Sections</div>
              <div className="space-y-3">
                {promptSections.map((section) => (
                  <label key={section.id} className="flex items-center gap-3 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedSections[section.id])}
                      onChange={() => toggleSection(section.id)}
                    />
                    {section.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="font-semibold mb-3">Data</div>
              <div className="space-y-3">
                {dataBlocks.map((block) => (
                  <label key={block.id} className="flex items-center gap-3 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedBlocks[block.id])}
                      onChange={() => toggleBlock(block.id)}
                    />
                    {block.label}
                  </label>
                ))}
              </div>
            </div>

            <button className="btn w-full" onClick={useGeneratedPrompt}>
              <Check className="w-4 h-4 mr-2" />
              Generate Prompt
            </button>
          </aside>

          <main className="card space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="font-semibold">Prompt</div>
              <button className="btn" onClick={savePrompt} disabled={saving || loading}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Prompt'}
              </button>
            </div>

            <textarea
              className="input min-h-[520px] font-mono text-sm leading-6"
              value={loading ? 'Loading prompt...' : prompt}
              onChange={(event) => {
                setPrompt(event.target.value);
                setSaved(false);
              }}
              disabled={loading}
            />

            {saved && <div className="text-sm text-emerald-300">Prompt saved.</div>}
          </main>
        </div>
      </div>
    </div>
  );
}
