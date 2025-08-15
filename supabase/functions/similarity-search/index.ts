import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SimilaritySearchRequest {
  patientId: string;
  query: string;
  limit?: number;
  threshold?: number;
}

interface VisitResult {
  id: string;
  visit_date: string;
  symptoms: string;
  diagnosis: string;
  treatment_notes: string;
  prescribed_medications: string;
  follow_up_instructions: string;
  vitals: {
    weight?: number;
    height?: number;
    blood_pressure?: string;
    heart_rate?: number;
    temperature?: number;
    blood_sugar?: number;
    oxygen_saturation?: number;
    respiratory_rate?: number;
  };
  similarity: number;
  doctor_name: string;
  doctor_specialization: string;
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

    const { patientId, query, limit = 5, threshold = 0.7 }: SimilaritySearchRequest = await req.json()

    if (!patientId || !query) {
      return new Response(
        JSON.stringify({ error: 'Patient ID and query are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Generate embedding for the query
    const queryEmbedding = await generateQueryEmbedding(query)

    if (!queryEmbedding) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate query embedding' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Perform similarity search using the updated function
    const { data: similarVisits, error } = await supabaseClient.rpc('search_similar_visits', {
      patient_uuid: patientId,
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit
    })

    if (error) {
      console.error('Similarity search error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to perform similarity search' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Format the results to match the expected interface
    const formattedResults: VisitResult[] = similarVisits.map((visit: any) => ({
      id: visit.id,
      visit_date: visit.visit_date,
      symptoms: visit.symptoms || '',
      diagnosis: visit.diagnosis || '',
      treatment_notes: visit.treatment_notes || '',
      prescribed_medications: visit.prescribed_medications || '',
      follow_up_instructions: visit.follow_up_instructions || '',
      vitals: {
        weight: visit.weight,
        height: visit.height,
        blood_pressure: visit.systolic_bp && visit.diastolic_bp 
          ? `${visit.systolic_bp}/${visit.diastolic_bp}` 
          : undefined,
        heart_rate: visit.heart_rate,
        temperature: visit.temperature,
        blood_sugar: visit.blood_sugar,
        oxygen_saturation: visit.oxygen_saturation,
        respiratory_rate: visit.respiratory_rate,
      },
      similarity: visit.similarity,
      doctor_name: visit.doctor_name || 'Unknown',
      doctor_specialization: visit.doctor_specialization || ''
    }))

    return new Response(
      JSON.stringify({ 
        success: true,
        results: formattedResults,
        query,
        patientId,
        totalResults: formattedResults.length,
        searchMetadata: {
          threshold,
          limit,
          avgSimilarity: formattedResults.length > 0 
            ? formattedResults.reduce((sum, r) => sum + r.similarity, 0) / formattedResults.length 
            : 0
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in similarity-search function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function generateQueryEmbedding(query: string): Promise<number[] | null> {
  try {
    const openaiResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: query,
        model: 'text-embedding-ada-002',
      }),
    })

    if (!openaiResponse.ok) {
      console.error('OpenAI API error:', await openaiResponse.text())
      return null
    }

    const embeddingData = await openaiResponse.json()
    return embeddingData.data[0].embedding
  } catch (error) {
    console.error('Error generating query embedding:', error)
    return null
  }
}

/* To deploy this function:
1. Install Supabase CLI: npm install -g supabase
2. Login: supabase login
3. Link to your project: supabase link --project-ref YOUR_PROJECT_REF
4. Deploy: supabase functions deploy similarity-search

Environment variables needed:
- OPENAI_API_KEY: Your OpenAI API key
- SUPABASE_URL: Your Supabase project URL
- SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key

Note: This function now works with your existing schema (field_doctors table).
The search_similar_visits RPC function should be created using the schema updates provided.
*/