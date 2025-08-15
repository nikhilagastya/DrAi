import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VisitData {
  id: string;
  patient_id: string;
  visit_date: string;
  weight?: number;
  height?: number;
  systolic_bp?: number;
  diastolic_bp?: number;
  heart_rate?: number;
  temperature?: number;
  blood_sugar?: number;
  oxygen_saturation?: number;
  respiratory_rate?: number;
  symptoms?: string;
  diagnosis?: string;
  treatment_notes?: string;
  prescribed_medications?: string;
  follow_up_instructions?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { visitData }: { visitData: VisitData } = await req.json()

    if (!visitData) {
      return new Response(
        JSON.stringify({ error: 'Visit data is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create a comprehensive text representation of the visit for embedding
    const visitText = createVisitText(visitData)

    // Generate embedding using OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: visitText,
        model: 'text-embedding-ada-002',
      }),
    })

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text()
      console.error('OpenAI API error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to generate embedding' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const embeddingData = await openaiResponse.json()
    const embedding = embeddingData.data[0].embedding

    // Update the visit record with the embedding
    const { error: updateError } = await supabaseClient
      .from('visits')
      .update({ embedding })
      .eq('id', visitData.id)

    if (updateError) {
      console.error('Supabase update error:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update visit with embedding' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Embedding generated and stored successfully',
        visitId: visitData.id 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in generate-embeddings function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function createVisitText(visit: VisitData): string {
  const parts: string[] = []

  // Add visit date
  parts.push(`Visit Date: ${new Date(visit.visit_date).toLocaleDateString()}`)

  // Add vital signs
  const vitals: string[] = []
  if (visit.weight) vitals.push(`Weight: ${visit.weight} kg`)
  if (visit.height) vitals.push(`Height: ${visit.height} cm`)
  if (visit.systolic_bp && visit.diastolic_bp) {
    vitals.push(`Blood Pressure: ${visit.systolic_bp}/${visit.diastolic_bp} mmHg`)
  }
  if (visit.heart_rate) vitals.push(`Heart Rate: ${visit.heart_rate} bpm`)
  if (visit.temperature) vitals.push(`Temperature: ${visit.temperature}°C`)
  if (visit.blood_sugar) vitals.push(`Blood Sugar: ${visit.blood_sugar} mg/dL`)
  if (visit.oxygen_saturation) vitals.push(`Oxygen Saturation: ${visit.oxygen_saturation}%`)
  if (visit.respiratory_rate) vitals.push(`Respiratory Rate: ${visit.respiratory_rate} breaths/min`)

  if (vitals.length > 0) {
    parts.push(`Vital Signs: ${vitals.join(', ')}`)
  }

  // Add symptoms
  if (visit.symptoms) {
    parts.push(`Symptoms: ${visit.symptoms}`)
  }

  // Add diagnosis
  if (visit.diagnosis) {
    parts.push(`Diagnosis: ${visit.diagnosis}`)
  }

  // Add treatment notes
  if (visit.treatment_notes) {
    parts.push(`Treatment Notes: ${visit.treatment_notes}`)
  }

  // Add prescribed medications
  if (visit.prescribed_medications) {
    parts.push(`Prescribed Medications: ${visit.prescribed_medications}`)
  }

  // Add follow-up instructions
  if (visit.follow_up_instructions) {
    parts.push(`Follow-up Instructions: ${visit.follow_up_instructions}`)
  }

  return parts.join('\n\n')
}

/* To deploy this function:
1. Install Supabase CLI: npm install -g supabase
2. Login: supabase login
3. Link to your project: supabase link --project-ref YOUR_PROJECT_REF
4. Deploy: supabase functions deploy generate-embeddings

Environment variables needed:
- OPENAI_API_KEY: Your OpenAI API key
- SUPABASE_URL: Your Supabase project URL
- SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key
*/

