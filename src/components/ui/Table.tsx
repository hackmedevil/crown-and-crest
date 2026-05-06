import { ReactNode, HTMLAttributes } from 'react'

// ============================================
// TABLE (CANONICAL - ADMIN FOCUSED)
// ============================================

interface TableProps extends HTMLAttributes<HTMLTableElement> {
  children: ReactNode
}

export function Table({ className = '', children, ...props }: TableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-neutral-200">
      <table
        className={`w-full text-left ${className}`}
        {...props}
      >
        {children}
      </table>
    </div>
  )
}

export function TableHeader({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={`bg-neutral-50 border-b border-neutral-200 ${className}`}
      {...props}
    >
      {children}
    </thead>
  )
}

export function TableBody({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={`divide-y divide-neutral-200 ${className}`} {...props}>
      {children}
    </tbody>
  )
}

export function TableRow({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={`hover:bg-neutral-50 transition-colors ${className}`}
      {...props}
    >
      {children}
    </tr>
  )
}

export function TableHead({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`
        px-6 py-4 text-sm font-semibold text-neutral-700
        whitespace-nowrap
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      {...props}
    >
      {children}
    </th>
  )
}

export function TableCell({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={`
        px-6 py-4 text-sm text-neutral-900
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      {...props}
    >
      {children}
    </td>
  )
}

// ============================================
// TABLE EMPTY STATE
// ============================================

interface TableEmptyProps {
  message?: string
  action?: ReactNode
}

export function TableEmpty({
  message = 'No data available',
  action,
}: TableEmptyProps) {
  return (
    <tr>
      <td colSpan={100} className="px-6 py-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-neutral-500">{message}</p>
          {action && <div>{action}</div>}
        </div>
      </td>
    </tr>
  )
}
