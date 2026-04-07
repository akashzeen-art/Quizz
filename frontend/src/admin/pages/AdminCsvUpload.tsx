import { useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Download, Loader2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { adminApiError, uploadCsv } from '../adminApi'
import type { CsvUploadResult } from '../types'

const SAMPLE_CSV = `Question Type,Question Text,Correct Answer,Asset,Option A,Option B,Option C,Option D
TEXT MCQ,What is the capital of France?,Paris,NULL,Berlin,Madrid,Paris,Rome
TEXT MCQ,What is 2 + 2?,4,NULL,3,4,5,6
BINARY,Is the sky blue?,yes,NULL,no,yes,NULL,NULL
TEXT MCQ,Which planet is closest to the Sun?,Mercury,NULL,Venus,Earth,Mars,Mercury
IMAGE MCQ,What animal is shown?,Cat,https://example.com/cat.jpg,Dog,Cat,Bird,Fish`

const HEADERS = ['Type', 'Question', 'Correct Answer', 'Asset', 'Opt A', 'Opt B', 'Opt C', 'Opt D']
const QUESTIONS_PER_SET = 10

function downloadSample() {
  const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'sample_questions.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function parsePreview(text: string): string[][] {
  const lines = text.split('\n').filter(Boolean)
  return lines.slice(0, 11).map((l) =>
    l.split(',').map((c) => c.trim().replace(/^"|"$/g, '')),
  )
}

function countDataRows(text: string): number {
  const lines = text.split('\n').filter(Boolean)
  // subtract header if present
  const first = lines[0]?.split(',')[0]?.trim().toLowerCase() ?? ''
  const hasHeader = first.includes('type') || first.includes('question')
  return hasHeader ? lines.length - 1 : lines.length
}

export default function AdminCsvUpload() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string[][] | null>(null)
  const [dataRowCount, setDataRowCount] = useState(0)
  const [category, setCategory] = useState('general')
  const [titlePrefix, setTitlePrefix] = useState('Quiz Set')
  const [releaseSetNumber, setReleaseSetNumber] = useState(1)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<CsvUploadResult | null>(null)

  const estimatedSets = Math.ceil(dataRowCount / QUESTIONS_PER_SET) || 0

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setResult(null)
    if (!f) { setPreview(null); setDataRowCount(0); return }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setPreview(parsePreview(text))
      const count = countDataRows(text)
      setDataRowCount(count)
      setReleaseSetNumber(1)
    }
    reader.readAsText(f)
  }

  function clearFile() {
    setFile(null)
    setPreview(null)
    setDataRowCount(0)
    setResult(null)
    setReleaseSetNumber(1)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleUpload() {
    if (!file) return
    setBusy(true)
    try {
      const res = await uploadCsv(file, category, titlePrefix, releaseSetNumber)
      setResult(res)
      if (res.questionsUploaded > 0) {
        toast.success(
          `${res.questionsUploaded} questions uploaded. ${res.quizSetsCreated} sets created. "${titlePrefix} ${res.releasedSetNumber}" is live.`,
        )
      } else {
        toast.error('No questions were saved — check errors below.')
      }
    } catch (e) {
      toast.error(adminApiError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Upload Questions (CSV)</h1>
          <p className="mt-1 text-sm text-slate-400">
            Bulk-import questions · auto-generate quiz sets of {QUESTIONS_PER_SET} · choose which to release
          </p>
        </div>
        <button
          type="button"
          onClick={downloadSample}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700"
        >
          <Download className="h-4 w-4" />
          Sample CSV
        </button>
      </div>

      {/* Format hint */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-400">
        <p className="mb-2 font-semibold uppercase tracking-wide text-slate-300">Column order</p>
        <div className="flex flex-wrap gap-2">
          {HEADERS.map((h, i) => (
            <span key={h} className="rounded-lg bg-slate-800 px-2 py-1 font-mono text-slate-300">
              {i + 1}. {h}
            </span>
          ))}
        </div>
        <p className="mt-2 text-slate-500">
          Types: <span className="text-slate-300">TEXT MCQ · IMAGE MCQ · AUDIO MCQ · GIF MCQ · VIDEO MCQ · BINARY</span>
          {' '}— use <span className="font-mono text-slate-300">NULL</span> for empty cells.
        </p>
      </div>

      {/* Upload card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-5">

        {/* File picker */}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            CSV file
          </label>
          {file ? (
            <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{file.name}</p>
                {dataRowCount > 0 && (
                  <p className="mt-0.5 text-xs text-slate-400">
                    {dataRowCount} question{dataRowCount !== 1 ? 's' : ''} detected
                    · <span className="text-violet-400">{estimatedSets} set{estimatedSets !== 1 ? 's' : ''} will be created</span>
                  </p>
                )}
              </div>
              <button type="button" onClick={clearFile} className="ml-3 shrink-0 text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-700 bg-slate-800/40 py-10 text-slate-400 transition hover:border-violet-500 hover:text-violet-400"
            >
              <Upload className="h-8 w-8" />
              <span className="text-sm font-medium">Click to select a .csv file</span>
              <span className="text-xs text-slate-500">Max 5 MB</span>
            </button>
          )}
          <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={onFileChange} />
        </div>

        {/* Category + Title prefix — side by side */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. science, history"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Quiz title prefix
            </label>
            <input
              type="text"
              value={titlePrefix}
              onChange={(e) => setTitlePrefix(e.target.value)}
              placeholder="e.g. Science Quiz, Round"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
            />
            {titlePrefix && estimatedSets > 0 && (
              <p className="mt-1.5 text-[11px] text-slate-500">
                Sets will be named: <span className="text-slate-300">"{titlePrefix} 1", "{titlePrefix} 2"…</span>
              </p>
            )}
          </div>
        </div>

        {/* Release set picker — only shown once file is loaded */}
        {estimatedSets > 0 && (
          <div className="rounded-xl border border-violet-800/50 bg-violet-950/30 p-4">
            <label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-violet-300">
              Which set to release to users first?
            </label>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: estimatedSets }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setReleaseSetNumber(n)}
                  className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${
                    releaseSetNumber === n
                      ? 'border-violet-500 bg-violet-600 text-white shadow-md shadow-violet-500/25'
                      : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-violet-600 hover:text-white'
                  }`}
                >
                  {titlePrefix.trim() || 'Set'} {n}
                  {releaseSetNumber === n && (
                    <span className="ml-2 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold">
                      LIVE
                    </span>
                  )}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Selected set will be <span className="text-emerald-400 font-semibold">live</span> immediately.
              All other sets will be <span className="text-amber-400 font-semibold">upcoming</span> — release them later from the Quiz list.
            </p>
          </div>
        )}

        {/* Upload button */}
        <button
          type="button"
          disabled={!file || busy}
          onClick={() => void handleUpload()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {busy ? 'Uploading…' : 'Upload & Generate Quiz Sets'}
        </button>
      </div>

      {/* Preview table */}
      {preview && preview.length > 1 && !result && (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40">
          <div className="border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold text-white">
              Preview — first {Math.min(preview.length - 1, 10)} rows
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  {HEADERS.map((h) => (
                    <th key={h} className="px-3 py-2 font-semibold uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.slice(1).map((row, i) => (
                  <tr key={i} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                    {HEADERS.map((_, ci) => (
                      <td key={ci} className="max-w-[160px] truncate px-3 py-2 text-slate-300">
                        {row[ci] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          {result.questionsUploaded > 0 && (
            <div className="rounded-2xl border border-emerald-800/60 bg-emerald-950/40 p-5 space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                <div>
                  <p className="font-semibold text-emerald-300">Upload successful</p>
                  <p className="mt-0.5 text-sm text-emerald-400/80">
                    {result.questionsUploaded} questions saved · {result.quizSetsCreated} quiz set{result.quizSetsCreated !== 1 ? 's' : ''} created
                  </p>
                </div>
              </div>
              {/* Set status summary */}
              <div className="flex flex-wrap gap-2 pt-1">
                {Array.from({ length: result.quizSetsCreated }, (_, i) => i + 1).map((n) => (
                  <span
                    key={n}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                      n === result.releasedSetNumber
                        ? 'border-emerald-700 bg-emerald-900/50 text-emerald-300'
                        : 'border-slate-700 bg-slate-800 text-slate-400'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${n === result.releasedSetNumber ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    {titlePrefix.trim() || 'Set'} {n}
                    <span className="opacity-70">{n === result.releasedSetNumber ? '· live' : '· upcoming'}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="rounded-2xl border border-rose-800/60 bg-rose-950/30 px-5 py-4">
              <div className="mb-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
                <p className="font-semibold text-rose-300">
                  {result.errors.length} row{result.errors.length !== 1 ? 's' : ''} failed
                </p>
              </div>
              <ul className="space-y-1 text-xs text-rose-400/90">
                {result.errors.map((e: string, i: number) => (
                  <li key={i} className="font-mono">{e}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="button"
            onClick={clearFile}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700"
          >
            <Upload className="h-4 w-4" />
            Upload another file
          </button>
        </div>
      )}
    </div>
  )
}
