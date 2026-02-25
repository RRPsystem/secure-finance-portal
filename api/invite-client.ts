import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { clientId, email, contactPerson } = req.body;

  if (!clientId || !email) {
    return res.status(400).json({ error: 'Missing required fields: clientId, email' });
  }

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server configuratie ontbreekt (SUPABASE_URL of SERVICE_ROLE_KEY)' });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    // Generate a temporary password
    const tempPassword = 'SF-' + Math.random().toString(36).slice(2, 10) + '!';

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // Skip email verification
    });

    if (authError) {
      // User might already exist
      if (authError.message?.includes('already been registered')) {
        return res.status(400).json({ error: 'Dit emailadres heeft al een account. De klant kan inloggen met bestaande gegevens.' });
      }
      throw authError;
    }

    const userId = authData.user.id;

    // Create public.users record with role 'client'
    const { error: profileError } = await supabase
      .from('users')
      .insert({ id: userId, email, role: 'client' });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Don't fail completely - auth user is created
    }

    // Link auth user to client record
    const { error: linkError } = await supabase
      .from('clients')
      .update({ user_id: userId })
      .eq('id', clientId);

    if (linkError) {
      console.error('Client link error:', linkError);
    }

    return res.status(200).json({
      success: true,
      tempPassword,
      message: `Account aangemaakt voor ${email}`,
    });
  } catch (error: any) {
    console.error('Invite error:', error);
    return res.status(500).json({ error: error.message });
  }
}
