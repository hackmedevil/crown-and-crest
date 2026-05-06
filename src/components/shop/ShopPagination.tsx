'use client'

interface ShopPaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

export default function ShopPagination({ page, totalPages, onChange }: ShopPaginationProps) {
  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, idx) => idx + 1).filter((p) => {
    if (p === 1 || p === totalPages) return true
    return Math.abs(p - page) <= 2
  })

  return (
    <div className="mt-8 flex items-center justify-center gap-2">
      <button
        className="rounded-md border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
      >
        Previous
      </button>
      {pages.map((p) => (
        <button
          key={p}
          className={`rounded-md px-3 py-2 text-sm ${
            p === page ? 'bg-black text-white' : 'border border-gray-300 text-gray-700'
          }`}
          onClick={() => onChange(p)}
        >
          {p}
        </button>
      ))}
      <button
        className="rounded-md border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
      >
        Next
      </button>
    </div>
  )
}
