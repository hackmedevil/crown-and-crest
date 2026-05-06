"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'

type WashInstructionProfile = {
  id: string
  name: string
  summary: string
}

export default function WashInstructionList() {
  const [profiles, setProfiles] = useState<WashInstructionProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchProfiles = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/wash-instructions', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch wash instructions')
      }
      setProfiles(data.washInstructions || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch wash instructions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchProfiles()
  }, [])

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Delete this wash instruction profile?')
    if (!confirmed) return

    try {
      const res = await fetch(`/api/admin/wash-instructions?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete profile')
      }
      setProfiles((prev) => prev.filter((profile) => profile.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete profile')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Profiles</h2>
        <Link href="/admin/wash-instructions/new" className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800">
          Create New
        </Link>
      </div>

      {loading ? <p className="text-sm text-gray-500">Loading profiles...</p> : null}
      {error ? <p className="text-sm text-red-600 mb-3">{error}</p> : null}

      {!loading && profiles.length === 0 ? (
        <p className="text-sm text-gray-500">No wash instruction profiles found.</p>
      ) : null}

      <ul className="divide-y divide-gray-200">
        {profiles.map((profile) => (
          <li key={profile.id} className="py-4 flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="font-medium">{profile.name}</span>
              <span className="text-gray-500 text-sm">{profile.summary || 'No summary'}</span>
            </div>
            <div className="flex items-center gap-3">
              <Link href={`/admin/wash-instructions/${profile.id}`} className="text-blue-600 text-xs underline">
                Edit
              </Link>
              <button
                type="button"
                onClick={() => handleDelete(profile.id)}
                className="text-red-600 text-xs underline"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
