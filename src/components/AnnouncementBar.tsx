'use client'

export default function AnnouncementBar() {
  const announcements = [
    'Free Shipping Across India',
    'Cash on Delivery Available',
    'Easy Returns',
  ]

  return (
    <div className="fixed top-0 left-0 right-0 w-full bg-black text-white z-50">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-6 text-sm font-medium overflow-x-auto">
          {announcements.map((announcement, index) => (
            <div key={index} className="flex items-center gap-6 whitespace-nowrap">
              <span>{announcement}</span>
              {index < announcements.length - 1 && (
                <div className="h-4 w-px bg-white/30" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
