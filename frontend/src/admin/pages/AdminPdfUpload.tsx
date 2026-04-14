import { useState } from 'react'
import { FileText, Loader2, Save, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { adminApiError, previewPdfQuizUpload, savePdfQuizUpload } from '../adminApi'
import type { PdfQuizUploadResult } from '../types'

export default function AdminPdfUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [category, setCategory] = useState('general')
  const [busyPreview, setBusyPreview] = useState(false)
  const [busySave, setBusySave] = useState(false)
  const [result, setResult] = useState<PdfQuizUploadResult | null>(null)

  async function onPreview() {
    if (!file) return
    setBusyPreview(true)
    try {
      const res = await previewPdfQuizUpload(file, category)
      setResult(res)
      toast.success(`Parsed ${res.totalQuestions} questions into ${res.quizSetsCreated} sets`)
    } catch (e) {
      toast.error(adminApiError(e))
    } finally {
      setBusyPreview(false)
    }
  }

  async function onSaveDrafts() {
    if (!file) return
    setBusySave(true)
    try {
      const res = await savePdfQuizUpload(file, category)
      setResult(res)
      toast.success(`${res.quizSetsCreated} draft quiz sets saved`)
    } catch (e) {
      toast.error(adminApiError(e))
    } finally {
      setBusySave(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Upload CSV Quiz</h1>
        <p className="mt-1 text-sm text-slate-400">
          Structured CSV import with strict TITLE + exactly 10 questions per set.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
          CSV file
        </label>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null)
            setResult(null)
          }}
          className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-violet-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-violet-500"
        />
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
          Default category
        </label>
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white focus:border-violet-500 focus:outline-none"
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!file || busyPreview}
            onClick={() => void onPreview()}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
          >
            {busyPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Preview Parse
          </button>
          <button
            type="button"
            disabled={!file || busySave}
            onClick={() => void onSaveDrafts()}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
          >
            {busySave ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save as Draft Sets
          </button>
        </div>
      </div>

      {result ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <p className="text-sm font-semibold text-white">
            {result.totalQuestions} questions · {result.quizSetsCreated} sets
          </p>
          <div className="mt-3 space-y-2">
            {result.sets.map((s) => (
              <div key={s.title} className="rounded-xl border border-slate-700 bg-slate-800/60 p-3">
                <p className="text-sm font-semibold text-slate-100">{s.title}</p>
                <p className="text-xs text-slate-400">{s.questionCount} questions</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-300">
                  {s.sampleQuestions.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {result.errors.length ? (
            <div className="mt-4 rounded-xl border border-rose-800/60 bg-rose-950/30 p-3 text-xs text-rose-300">
              {result.errors.slice(0, 12).map((e, i) => (
                <p key={i}>{e}</p>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">
          <Upload className="mx-auto mb-2 h-5 w-5" />
          Upload a CSV and preview parsed sets before saving drafts.
        </div>
      )}
    </div>
  )
}
