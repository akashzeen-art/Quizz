import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { FileText, Loader2, Upload, X } from 'lucide-react'
import { QUIZ_CATEGORIES } from '../../constants/categories'
import {
  createAdminQuiz,
  uploadAdminDocument,
  uploadAdminMedia,
  adminApiError,
} from '../adminApi'

type InputT = 'mcq4' | 'binary' | 'mcq3' | 'slider'
type MediaT = 'none' | 'image' | 'gif' | 'video' | 'audio'

interface QDraft {
  questionText: string
  mediaUrl: string
  mediaType: MediaT
  inputType: InputT
  options: string[]
  correctAnswerIndex: number
  correctNumeric: number
  category: string
  /** Section/page in the source document — required when a quiz document is attached. */
  documentReference: string
}

function defaultOptions(t: InputT): string[] {
  switch (t) {
    case 'mcq4':
      return ['', '', '', '']
    case 'binary':
      return ['Yes', 'No']
    case 'mcq3':
      return ['', '', '']
    case 'slider':
      return ['0', '100']
    default:
      return ['', '', '', '']
  }
}

function emptyQ(cat: string): QDraft {
  return {
    questionText: '',
    mediaUrl: '',
    mediaType: 'none',
    inputType: 'mcq4',
    options: defaultOptions('mcq4'),
    correctAnswerIndex: 0,
    correctNumeric: 50,
    category: cat,
    documentReference: '',
  }
}

export default function AdminQuizBuilder() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('science')
  const [status, setStatus] = useState<'live' | 'upcoming' | 'ended'>('live')
  const [secondsPerQuestion, setSecondsPerQuestion] = useState(15)
  const [numQuestions, setNumQuestions] = useState(3)
  const [referenceDocumentUrl, setReferenceDocumentUrl] = useState('')
  const [referenceDocumentName, setReferenceDocumentName] = useState('')
  const [docUploading, setDocUploading] = useState(false)
  const [questions, setQuestions] = useState<QDraft[]>(() =>
    Array.from({ length: 3 }, () => emptyQ('science')),
  )
  const [saving, setSaving] = useState(false)
  const hasSourceDoc = referenceDocumentUrl.trim().length > 0

  function resizeQuestions(n: number) {
    const next = Math.min(100, Math.max(1, n))
    setNumQuestions(next)
    setQuestions((prev) => {
      const copy = [...prev]
      while (copy.length < next) copy.push(emptyQ(category))
      if (copy.length > next) return copy.slice(0, next)
      return copy
    })
  }

  useEffect(() => {
    setQuestions((prev) => prev.map((q) => ({ ...q, category })))
  }, [category])

  function patchQ(i: number, patch: Partial<QDraft>) {
    setQuestions((prev) => {
      const next = [...prev]
      const q = { ...next[i], ...patch }
      if (patch.inputType) {
        q.options = defaultOptions(patch.inputType)
        q.correctAnswerIndex = 0
      }
      next[i] = q
      return next
    })
  }

  async function uploadFile(i: number, file: File) {
    try {
      const url = await uploadAdminMedia(file)
      patchQ(i, { mediaUrl: url })
      toast.success('Uploaded')
    } catch (e) {
      toast.error(adminApiError(e))
    }
  }

  async function onPickSourceDocument(file: File) {
    setDocUploading(true)
    try {
      const url = await uploadAdminDocument(file)
      setReferenceDocumentUrl(url)
      setReferenceDocumentName(file.name || 'Source document')
      toast.success('Document attached')
    } catch (e) {
      toast.error(adminApiError(e))
    } finally {
      setDocUploading(false)
    }
  }

  function clearSourceDocument() {
    setReferenceDocumentUrl('')
    setReferenceDocumentName('')
  }

  async function submit() {
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.questionText.trim()) {
        toast.error(`Question ${i + 1}: text required`)
        return
      }
      if (hasSourceDoc && !q.documentReference.trim()) {
        toast.error(
          `Question ${i + 1}: add where this maps in the source document (section/page)`,
        )
        return
      }
      if (q.mediaType !== 'none' && !q.mediaUrl.trim()) {
        toast.error(`Question ${i + 1}: upload media or set type to none`)
        return
      }
      if (q.inputType === 'slider' && q.options.length !== 2) {
        toast.error(`Question ${i + 1}: slider needs min/max`)
        return
      }
    }
    setSaving(true)
    try {
      const body = {
        title: title.trim(),
        description: description.trim(),
        category: category.trim().toLowerCase(),
        status,
        secondsPerQuestion,
        startsAt: null,
        endsAt: null,
        referenceDocumentUrl: hasSourceDoc ? referenceDocumentUrl.trim() : null,
        referenceDocumentName: hasSourceDoc ? referenceDocumentName.trim() : null,
        questions: questions.map((q) => ({
          questionText: q.questionText.trim(),
          mediaUrl: q.mediaUrl.trim() || null,
          mediaType: q.mediaType,
          inputType: q.inputType,
          options: q.options.map((o) => o.trim()),
          correctAnswerIndex:
            q.inputType === 'slider' ? null : q.correctAnswerIndex,
          correctNumeric: q.inputType === 'slider' ? q.correctNumeric : null,
          category: q.category.trim().toLowerCase(),
          documentReference: q.documentReference.trim() || null,
        })),
      }
      await createAdminQuiz(body)
      toast.success('Quiz created')
      navigate('/admin/quizzes')
    } catch (e) {
      toast.error(adminApiError(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-24">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Create quiz</h1>
        <p className="mt-1 text-sm text-slate-400">
          Attach an optional source document; each question can map to a section or page in
          it
        </p>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
          Quiz details
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold text-slate-400">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold text-slate-400">
              Description
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </label>
          <div className="sm:col-span-2 rounded-xl border border-slate-700/80 bg-slate-950/80 p-4">
            <span className="text-xs font-semibold text-slate-400">
              Question source document (optional)
            </span>
            <p className="mt-1 text-xs text-slate-500">
              PDF, Word, or text. When attached, every question must include where it belongs
              in this file (e.g. &quot;Page 3&quot;, &quot;Section B&quot;).
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50">
                <FileText className="h-4 w-4 shrink-0" />
                {docUploading ? 'Uploading…' : 'Upload document'}
                <input
                  type="file"
                  disabled={docUploading}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    e.target.value = ''
                    if (f) void onPickSourceDocument(f)
                  }}
                />
              </label>
              {hasSourceDoc && (
                <>
                  <span className="max-w-[min(100%,280px)] truncate text-xs text-slate-400">
                    {referenceDocumentName}
                  </span>
                  <a
                    href={referenceDocumentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-violet-400 hover:underline"
                  >
                    Open
                  </a>
                  <button
                    type="button"
                    onClick={clearSourceDocument}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    <X className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </>
              )}
            </div>
          </div>
          <label>
            <span className="text-xs font-semibold text-slate-400">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            >
              {QUIZ_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-xs font-semibold text-slate-400">Status</span>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as 'live' | 'upcoming' | 'ended')
              }
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            >
              <option value="live">Live</option>
              <option value="upcoming">Upcoming</option>
              <option value="ended">Ended</option>
            </select>
          </label>
          <label>
            <span className="text-xs font-semibold text-slate-400">
              Seconds / question
            </span>
            <input
              type="number"
              min={5}
              max={120}
              value={secondsPerQuestion}
              onChange={(e) =>
                setSecondsPerQuestion(Number(e.target.value) || 15)
              }
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </label>
          <label>
            <span className="text-xs font-semibold text-slate-400">
              Number of questions
            </span>
            <input
              type="number"
              min={1}
              max={100}
              value={numQuestions}
              onChange={(e) => resizeQuestions(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </label>
        </div>
      </section>

      {questions.map((q, i) => (
        <section
          key={i}
          className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6"
        >
          <h3 className="mb-4 text-sm font-bold text-violet-300">
            Question {i + 1}
          </h3>
          {hasSourceDoc && (
            <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90">
              Base this question on the attached document. Specify the part of the file it
              refers to below.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="text-xs font-semibold text-slate-400">Text</span>
              <textarea
                value={q.questionText}
                onChange={(e) => patchQ(i, { questionText: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>
            <label className="sm:col-span-2">
              <span className="text-xs font-semibold text-slate-400">
                Reference in source document
                {hasSourceDoc ? (
                  <span className="text-rose-400"> *</span>
                ) : (
                  <span className="font-normal text-slate-500">
                    {' '}
                    (optional — e.g. page or section)
                  </span>
                )}
              </span>
              <input
                value={q.documentReference}
                onChange={(e) =>
                  patchQ(i, { documentReference: e.target.value })
                }
                placeholder={
                  hasSourceDoc
                    ? 'e.g. Page 2, Paragraph 3, Section A'
                    : 'Fill when you add a quiz document above'
                }
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-600"
              />
            </label>
            <label>
              <span className="text-xs font-semibold text-slate-400">
                Question category
              </span>
              <select
                value={q.category}
                onChange={(e) => patchQ(i, { category: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              >
                {QUIZ_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-xs font-semibold text-slate-400">
                Input type
              </span>
              <select
                value={q.inputType}
                onChange={(e) =>
                  patchQ(i, { inputType: e.target.value as InputT })
                }
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              >
                <option value="mcq4">4-option MCQ</option>
                <option value="binary">Binary (2)</option>
                <option value="mcq3">3-option MCQ</option>
                <option value="slider">Slider</option>
              </select>
            </label>
            <label>
              <span className="text-xs font-semibold text-slate-400">
                Media type
              </span>
              <select
                value={q.mediaType}
                onChange={(e) =>
                  patchQ(i, { mediaType: e.target.value as MediaT })
                }
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              >
                <option value="none">None</option>
                <option value="image">Image</option>
                <option value="gif">GIF</option>
                <option value="video">Video</option>
                <option value="audio">Audio</option>
              </select>
            </label>
            {q.mediaType !== 'none' && (
              <label className="sm:col-span-2">
                <span className="text-xs font-semibold text-slate-400">
                  Media file
                </span>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800">
                    <Upload className="h-4 w-4" />
                    Upload
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,video/*,audio/*,.gif"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        e.target.value = ''
                        if (f) void uploadFile(i, f)
                      }}
                    />
                  </label>
                  {q.mediaUrl && (
                    <span className="truncate text-xs text-slate-500">
                      {q.mediaUrl}
                    </span>
                  )}
                </div>
              </label>
            )}
            {q.inputType !== 'slider' ? (
              <>
                {q.options.map((op, j) => (
                  <label key={j} className={q.inputType === 'mcq4' ? '' : ''}>
                    <span className="text-xs font-semibold text-slate-400">
                      Option {j + 1}
                    </span>
                    <input
                      value={op}
                      onChange={(e) => {
                        const opts = [...q.options]
                        opts[j] = e.target.value
                        patchQ(i, { options: opts })
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                    />
                  </label>
                ))}
                <label className="sm:col-span-2">
                  <span className="text-xs font-semibold text-slate-400">
                    Correct option index (0-based)
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={q.options.length - 1}
                    value={q.correctAnswerIndex}
                    onChange={(e) =>
                      patchQ(i, {
                        correctAnswerIndex: Number(e.target.value) || 0,
                      })
                    }
                    className="mt-1 w-full max-w-[120px] rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  />
                </label>
              </>
            ) : (
              <>
                <label>
                  <span className="text-xs font-semibold text-slate-400">Min</span>
                  <input
                    value={q.options[0]}
                    onChange={(e) => {
                      const o = [...q.options]
                      o[0] = e.target.value
                      patchQ(i, { options: o })
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  />
                </label>
                <label>
                  <span className="text-xs font-semibold text-slate-400">Max</span>
                  <input
                    value={q.options[1]}
                    onChange={(e) => {
                      const o = [...q.options]
                      o[1] = e.target.value
                      patchQ(i, { options: o })
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  />
                </label>
                <label className="sm:col-span-2">
                  <span className="text-xs font-semibold text-slate-400">
                    Correct value (numeric)
                  </span>
                  <input
                    type="number"
                    value={q.correctNumeric}
                    onChange={(e) =>
                      patchQ(i, { correctNumeric: Number(e.target.value) })
                    }
                    className="mt-1 w-full max-w-[200px] rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  />
                </label>
              </>
            )}
          </div>
        </section>
      ))}

      <button
        type="button"
        disabled={saving}
        onClick={() => void submit()}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-4 text-sm font-bold text-white shadow-lg disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
        Save quiz
      </button>
    </div>
  )
}
