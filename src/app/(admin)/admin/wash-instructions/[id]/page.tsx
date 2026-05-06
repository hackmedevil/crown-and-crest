"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import WashInstructionForm from '../WashInstructionForm'

type InitialData = {
  id: string
  name: string
  summary: string
  details: string
}

export default function EditWashInstructionPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [initialData, setInitialData] = useState<InitialData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      if (!id) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const response = await fetch(`/api/admin/wash-instructions?id=${id}`, { cache: 'no-store' })
        const payload = await response.json()
        if (response.ok && payload?.washInstruction) {
          setInitialData(payload.washInstruction)
        } else {
          setInitialData(null)
        }
      } catch {
        setInitialData(null)
      } finally {
        setLoading(false)
      }
    }

    void fetchProfile()
  }, [id])

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Edit Wash Instruction</h1>
      {loading ? (
        <p className="text-sm text-gray-500">Loading wash instruction...</p>
      ) : initialData ? (
        <WashInstructionForm initialData={initialData} />
      ) : (
        <p className="text-sm text-red-600">Unable to load this wash instruction profile.</p>
      )}
    </div>
  )
}
