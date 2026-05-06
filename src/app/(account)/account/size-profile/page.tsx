import { supabaseServer } from '@/lib/supabase/server'
import SizeProfileClient from './SizeProfileClient'

export const metadata = {
    title: 'Size Profile | Crown & Crest',
    description: 'Manage your body measurements for personalized size recommendations'
}

export default async function SizeProfilePage() {
    // Get user (auth already checked by account layout)
    const { data: { user } } = await supabaseServer.auth.getUser()

    // Fetch existing sizebook (may be null or table may not exist yet)
    let sizebook = null

    try {
        const { data } = await supabaseServer
            .from('user_sizebook')
            .select('*')
            .eq('user_uid', user!.id)
            .single()

        sizebook = data
    } catch (error) {
        // Table doesn't exist yet or no sizebook - that's fine, will be null
    }

    return <SizeProfileClient initialSizebook={sizebook} />
}
