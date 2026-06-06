'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

export async function signUpAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const email = readString(formData, 'email');
  const password = readString(formData, 'password');
  const fullName = readString(formData, 'full_name');
  const organizationName = readString(formData, 'organization_name');

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        organization_name: organizationName || 'Mi negocio'
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/callback`
    }
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  redirect('/login?message=Cuenta creada. Revisa tu correo o inicia sesión si desactivaste la confirmación.');
}

export async function signInAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const email = readString(formData, 'email');
  const password = readString(formData, 'password');

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect('/dashboard');
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}
