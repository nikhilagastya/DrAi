// supabase/functions/create-user/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Supabase client with Service Role Key (automatically available in Edge Functions)
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Only allow POST method for the actual request
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: { message: 'Method not allowed' } }), 
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const body = await req.json();
    const { email, password, userData } = body;

    // Validate required fields
    if (!email || !password || !userData) {
      return new Response(
        JSON.stringify({ error: { message: 'Missing required fields: email, password, userData' } }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 1. Create user
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error || !data.user) {
      console.error('Auth user creation error:', error);
      return new Response(
        JSON.stringify({ error: error || { message: 'Failed to create user' } }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const userId = data.user.id;

    // 2. Insert role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ auth_user_id: userId, role: userData.role });

    if (roleError) {
      console.error('User role insertion error:', roleError);
      return new Response(
        JSON.stringify({ error: roleError }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 3. Insert into profile table
    let profileError = null;
    switch (userData.role) {
      case "patient": {
        const { error } = await supabaseAdmin.from("patients").insert({
          auth_user_id: userId,
          name: userData.name,
          age: userData.age,
          gender: userData.gender,
          phone: userData.phone,
          email,
          address: userData.address,
          emergency_contact_name: userData.emergencyContactName,
          emergency_contact_phone: userData.emergencyContactPhone,
          medical_history: userData.medicalHistory,
          allergies: userData.allergies,
          current_medications: userData.currentMedications,
        });
        profileError = error;
        break;
      }

      case "field_doctor": {
        const { error } = await supabaseAdmin.from("field_doctors").insert({
          auth_user_id: userId,
          name: userData.name,
          specialization: userData.specialization,
          license_number: userData.licenseNumber,
          phone: userData.phone,
          email,
          years_of_experience: userData.yearsOfExperience,
        });
        profileError = error;
        break;
      }

      case "admin": {
        const { error } = await supabaseAdmin.from("admins").insert({
          auth_user_id: userId,
          name: userData.name,
          phone: userData.phone,
          email,
          permissions: userData.permissions || [],
        });
        profileError = error;
        break;
      }

      default: {
        return new Response(
          JSON.stringify({ error: { message: `Invalid role: ${userData.role}` } }), 
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    if (profileError) {
      console.error('Profile insertion error:', profileError);
      return new Response(
        JSON.stringify({ error: profileError }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, userId }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: { message: err instanceof Error ? err.message : 'Internal server error' } }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});