import { supabaseServer } from '@/lib/supabase/server'
import NotificationsList from '@/components/admin/notifications/NotificationsList'

export const metadata = {
  title: 'WhatsApp Notifications | Admin Dashboard',
}

export default async function AdminNotificationsPage() {
  const supabase = supabaseServer

  // Fetch recent SMS notifications
  const { data: notifications, error } = await supabase
    .from('sms_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error fetching sms notifications:', error)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">WhatsApp / SMS Notifications</h1>
          <p className="text-gray-500 mt-1">View message logs and delivery statuses.</p>
        </div>
      </div>
      <NotificationsList initialLogs={notifications || []} />
    </div>
  )
}
