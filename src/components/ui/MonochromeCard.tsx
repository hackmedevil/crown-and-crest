/**
 * Monochrome Card Component
 * White background, no borders, soft shadow
 */
export function MonochromeCard({
    children,
    className = ''
}: {
    children: React.ReactNode
    className?: string
}) {
    return (
        <div className={`bg-white rounded-xl shadow-sm p-6 ${className}`}>
            {children}
        </div>
    )
}

/**
 * Monochrome Card Header
 */
export function MonochromeCardHeader({
    title,
    action
}: {
    title: string
    action?: React.ReactNode
}) {
    return (
        <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-black">{title}</h3>
            {action}
        </div>
    )
}
