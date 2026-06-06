import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/database.types';

type Organization = Database['public']['Tables']['organizations']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileWithOrganization = Profile & { organizations: Organization | null };

export async function getUserContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data, error: profileError } = await supabase
    .from('profiles')
    .select('*, organizations(*)')
    .eq('id', user.id)
    .single();

  if (profileError || !data) {
    redirect('/login');
  }

  const profile = data as unknown as ProfileWithOrganization;

  return { supabase, user, profile, organization: profile.organizations };
}
