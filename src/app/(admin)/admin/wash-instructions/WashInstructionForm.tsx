"use client"

import { FormEvent, useMemo, useState } from "react"
import { useRouter } from 'next/navigation'

type WashInstructionInitialData = {
  id?: string
  name: string
  summary: string
  details: string
}

const EXAMPLE_LINES = [
  "Machine wash cold with like colors",
  "Use mild detergent",
  "Do not bleach",
  "Tumble dry low",
  "Iron on low heat",
]

function detailsToLines(details: string): string[] {
  if (!details.trim()) return []

  // Support legacy HTML list format and plain text format.
  const liMatches = Array.from(details.matchAll(/<li>(.*?)<\/li>/gi)).map((m) => m[1]?.trim() || "")
  if (liMatches.length > 0) return liMatches.filter(Boolean)

  return details
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean)
}

export default function WashInstructionForm({ initialData }: { initialData?: WashInstructionInitialData }) {
  const router = useRouter()
  const [name, setName] = useState(initialData?.name || "")
  const [summary, setSummary] = useState(initialData?.summary || "")
  const [details, setDetails] = useState(detailsToLines(initialData?.details || "").join("\n"))
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const detailLines = useMemo(() => detailsToLines(details), [details])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")

    if (!name.trim()) {
      setError("Profile name is required.")
      return
    }

    if (detailLines.length === 0) {
      setError("Add at least one wash instruction line.")
      return
    }

    setSaving(true)

    try {
      const method = initialData?.id ? 'PATCH' : 'POST'
      const endpoint = initialData?.id
        ? `/api/admin/wash-instructions?id=${initialData.id}`
        : '/api/admin/wash-instructions'

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          summary: summary.trim(),
          details: detailLines.join('\n'),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save wash instruction')
      }

      router.push('/admin/wash-instructions')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save wash instruction')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="space-y-5 max-w-2xl" onSubmit={handleSubmit}>
      <div>
        <label className="block font-medium mb-1">Profile Name</label>
        <input
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="e.g. Delicate Wash"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <label className="block font-medium mb-1">Summary</label>
        <input
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="e.g. Gentle cycle, cold water"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
      </div>

      <div>
        <label className="block font-medium mb-1">Wash Instructions (Proper Format)</label>
        <textarea
          className="w-full min-h-[140px] rounded-md border border-gray-300 px-3 py-2"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder={EXAMPLE_LINES.join("\n")}
        />
        <p className="mt-2 text-xs text-gray-500">
          Enter one instruction per line. Do not paste HTML.
        </p>
      </div>

      <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm font-semibold text-gray-900 mb-2">Preview</p>
        {detailLines.length === 0 ? (
          <p className="text-sm text-gray-500">No instructions yet.</p>
        ) : (
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
            {detailLines.map((line, idx) => (
              <li key={`${line}-${idx}`}>{line}</li>
            ))}
          </ul>
        )}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-60"
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
    </form>
  )
}
