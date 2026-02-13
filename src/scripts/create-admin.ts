/**
 * Script to create admin user
 * Run this in your browser console or create a temporary API endpoint
 *
 * IMPORTANT: This should only be used for initial setup in development!
 * In production, use Supabase Dashboard > Authentication > Users
 */

import { supabase } from '@/integrations/supabase/client';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  throw new Error('VITE_ADMIN_EMAIL and VITE_ADMIN_PASSWORD must be set in .env file');
}

export async function createAdminUser() {
  try {
    // Step 1: Sign up the user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    if (signUpError) {
      if (signUpError.message.includes('User already registered')) {
        console.log('User already exists, proceeding to make admin...');
        // Try to sign in to get user ID
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
        });
        
        if (signInError) {
          console.error('Failed to sign in:', signInError.message);
          return { success: false, error: signInError.message };
        }
        
        if (signInData.user) {
          // Make user admin
          const { error: updateError } = await supabase
            .from('car_profiles')
            .update({ is_admin: true })
            .eq('user_id', signInData.user.id);
            
          if (updateError) {
            console.error('Failed to make admin:', updateError.message);
            return { success: false, error: updateError.message };
          }
          
          console.log('✅ Existing user is now admin!');
          return { success: true, message: 'Existing user promoted to admin' };
        }
      } else {
        console.error('Signup error:', signUpError.message);
        return { success: false, error: signUpError.message };
      }
    }

    if (authData.user) {
      console.log('User created successfully!');
      console.log('User ID:', authData.user.id);
      
      // Step 2: Create a car profile and make it admin
      // Note: The trigger should have created a default profile, but let's ensure admin status
      const { error: updateError } = await supabase
        .from('car_profiles')
        .update({ is_admin: true })
        .eq('user_id', authData.user.id);
        
      if (updateError) {
        console.error('Failed to set admin status:', updateError.message);
        // Try creating a profile manually
        const { error: insertError } = await supabase
          .from('car_profiles')
          .insert({
            name: 'Admin Profile',
            notes: 'System administrator',
            user_id: authData.user.id,
            is_admin: true,
          });
          
        if (insertError) {
          console.error('Failed to create admin profile:', insertError.message);
          return { success: false, error: insertError.message };
        }
      }
      
      console.log('✅ Admin user created successfully!');
      console.log('Email:', ADMIN_EMAIL);
      console.log('User ID:', authData.user.id);
      
      return { 
        success: true, 
        message: 'Admin user created',
        userId: authData.user.id,
        email: ADMIN_EMAIL
      };
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: String(error) };
  }
}

// Auto-run if this file is imported/executed
console.log('Admin user script loaded. Run createAdminUser() to create admin.');
