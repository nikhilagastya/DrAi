import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChatHistoryRequest {
  patientId: string;
  sessionId?: string;
  limit?: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  message: string;
  timestamp: string;
  sessionId?: string;
  hasDiagnosis?: boolean;
  linkedVisits?: string[];
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

    if (req.method === 'GET') {
      // Get chat history
      const url = new URL(req.url)
      const patientId = url.searchParams.get('patientId')
      const sessionId = url.searchParams.get('sessionId')
      const limit = parseInt(url.searchParams.get('limit') || '50')

      if (!patientId) {
        return new Response(
          JSON.stringify({ error: 'Patient ID is required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Get chat history with linked visits using the function we created
      const { data: chatHistory, error } = await supabaseClient.rpc('get_chat_history_with_visits', {
        patient_uuid: patientId,
        session_uuid: sessionId,
        limit_count: limit
      })

      if (error) {
        console.error('Error fetching chat history:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch chat history' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Format the messages
      const messages: ChatMessage[] = chatHistory.map((chat: any) => ({
        id: chat.id,
        role: chat.role,
        message: chat.message,
        timestamp: chat.timestamp,
        sessionId: chat.session_id,
        hasDiagnosis: chat.has_diagnosis,
        linkedVisits: chat.linked_visits || []
      }))

      // Get unique sessions for this patient
      const { data: sessions } = await supabaseClient
        .from('chat_messages')
        .select('session_id, timestamp')
        .eq('patient_id', patientId)
        .not('session_id', 'is', null)
        .order('timestamp', { ascending: false })

      const uniqueSessions = sessions 
        ? [...new Set(sessions.map(s => s.session_id))].slice(0, 10)
        : []

      return new Response(
        JSON.stringify({ 
          success: true,
          messages: messages.reverse(), // Return in chronological order
          totalMessages: messages.length,
          currentSession: sessionId,
          availableSessions: uniqueSessions,
          patientId
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (req.method === 'POST') {
      // Create new chat session
      const { patientId }: { patientId: string } = await req.json()

      if (!patientId) {
        return new Response(
          JSON.stringify({ error: 'Patient ID is required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Create new session using our function
      const { data: sessionId, error } = await supabaseClient.rpc('create_chat_session', {
        patient_uuid: patientId
      })

      if (error) {
        console.error('Error creating chat session:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to create chat session' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          sessionId,
          message: 'New chat session created'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (req.method === 'DELETE') {
      // Delete chat session or messages
      const { sessionId, messageId }: { sessionId?: string, messageId?: string } = await req.json()

      if (messageId) {
        // Delete specific message
        const { error } = await supabaseClient
          .from('chat_messages')
          .delete()
          .eq('id', messageId)

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to delete message' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Message deleted' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (sessionId) {
        // Delete entire session
        const { error } = await supabaseClient
          .from('chat_messages')
          .delete()
          .eq('session_id', sessionId)

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to delete session' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Session deleted' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ error: 'Session ID or Message ID required for deletion' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in chat-history function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

/* To deploy this function:
1. Install Supabase CLI: npm install -g supabase
2. Login: supabase login
3. Link to your project: supabase link --project-ref YOUR_PROJECT_REF
4. Deploy: supabase functions deploy chat-history

Environment variables needed:
- SUPABASE_URL: Your Supabase project URL
- SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key

Usage:
- GET /chat-history?patientId=uuid&sessionId=session&limit=50
- POST /chat-history { "patientId": "uuid" } // Create new session
- DELETE /chat-history { "sessionId": "session" } // Delete session
- DELETE /chat-history { "messageId": "uuid" } // Delete message
*/