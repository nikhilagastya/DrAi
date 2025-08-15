import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChatRequest {
  patientId: string;
  message: string;
  conversationHistory?: Array<{
    role: 'user' | 'ai';
    message: string;
    timestamp: string;
  }>;
  sessionId?: string;
}

interface VisitContext {
  id: string;
  visit_date: string;
  symptoms: string;
  diagnosis: string;
  treatment_notes: string;
  prescribed_medications: string;
  follow_up_instructions: string;
  vitals: any;
  doctor_name: string;
  similarity?: number;
}

interface DiagnosisResult {
  hasDiagnosis: boolean;
  diagnosis?: string;
  confidence?: string;
  recommendedTreatment?: string;
  followUpInstructions?: string;
  urgencyLevel?: 'low' | 'medium' | 'high' | 'urgent';
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

    const { patientId, message, conversationHistory = [], sessionId }: ChatRequest = await req.json()

    if (!patientId || !message) {
      return new Response(
        JSON.stringify({ error: 'Patient ID and message are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get comprehensive patient information
    const { data: patient, error: patientError } = await supabaseClient
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single()

    if (patientError || !patient) {
      return new Response(
        JSON.stringify({ error: 'Patient not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get ALL previous visits for comprehensive context
    const { data: allVisits, error: visitsError } = await supabaseClient
      .from('visits')
      .select(`
        *,
        field_doctors(name, specialization)
      `)
      .eq('patient_id', patientId)
      .order('visit_date', { ascending: false })
      .limit(10) // Get last 10 visits for context

    let visitHistory: VisitContext[] = []
    if (!visitsError && allVisits) {
      visitHistory = allVisits.map(visit => ({
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
            : null,
          heart_rate: visit.heart_rate,
          temperature: visit.temperature,
          blood_sugar: visit.blood_sugar,
          oxygen_saturation: visit.oxygen_saturation,
          respiratory_rate: visit.respiratory_rate,
        },
        doctor_name: visit.field_doctors?.name || 'Unknown',
        doctor_specialization: visit.field_doctors?.specialization || ''
      }))
    }

    // Get similar visits for additional context using existing similarity search
    const similarityResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/similarity-search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patientId,
        query: message,
        limit: 3,
        threshold: 0.5
      })
    })

    let similarVisits: VisitContext[] = []
    if (similarityResponse.ok) {
      const similarityData = await similarityResponse.json()
      similarVisits = similarityData.results || []
    }

    // Get recent chat messages for this patient
    const { data: recentChats } = await supabaseClient
      .from('chat_messages')
      .select('*')
      .eq('patient_id', patientId)
      .order('timestamp', { ascending: false })
      .limit(20)

    // Create enhanced system prompt
    const systemPrompt = createEnhancedSystemPrompt(patient, visitHistory, similarVisits, recentChats || [])
    const conversationContext = createConversationContext(conversationHistory, message)

    // Call Gemini API with enhanced prompt
    const geminiResponse = await callGeminiAPI(systemPrompt, conversationContext)

    if (!geminiResponse) {
      return new Response(
        JSON.stringify({ error: 'Failed to get AI response' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Analyze response for diagnosis
    const diagnosisResult = await analyzeDiagnosis(geminiResponse, systemPrompt, conversationContext)

    // Store user message
    const { data: userMessage } = await supabaseClient
      .from('chat_messages')
      .insert({
        patient_id: patientId,
        role: 'user',
        message,
        session_id: sessionId
      })
      .select()
      .single()

    // Store AI response
    const { data: aiMessage } = await supabaseClient
      .from('chat_messages')
      .insert({
        patient_id: patientId,
        role: 'ai',
        message: geminiResponse,
        session_id: sessionId,
        has_diagnosis: diagnosisResult.hasDiagnosis
      })
      .select()
      .single()

    // Link relevant visits to chat messages
    const visitIds = [...new Set([...visitHistory.slice(0, 5).map(v => v.id), ...similarVisits.map(v => v.id)])]
    if (visitIds.length > 0) {
      // Link visits to user message
      await supabaseClient
        .from('chat_message_visits')
        .insert(
          visitIds.map(visitId => ({
            chat_message_id: userMessage.id,
            visit_id: visitId
          }))
        )

      // Link visits to AI message
      await supabaseClient
        .from('chat_message_visits')
        .insert(
          visitIds.map(visitId => ({
            chat_message_id: aiMessage.id,
            visit_id: visitId
          }))
        )
    }

    // If diagnosis is detected, create a new visit record
    let newVisitId = null
    if (diagnosisResult.hasDiagnosis && diagnosisResult.diagnosis) {
      // Get a default doctor (you might want to assign based on specialization)
      const { data: defaultDoctor } = await supabaseClient
        .from('field_doctors')
        .select('id')
        .limit(1)
        .single()

      if (defaultDoctor) {
        const { data: newVisit, error: visitError } = await supabaseClient
          .from('visits')
          .insert({
            patient_id: patientId,
            visit_date: new Date().toISOString().split('T')[0], // Today's date
            symptoms: extractSymptomsFromConversation(conversationHistory, message),
            diagnosis: diagnosisResult.diagnosis,
            treatment_notes: diagnosisResult.recommendedTreatment || '',
            follow_up_instructions: diagnosisResult.followUpInstructions || '',
            visit_type: 'virtual_consultation',
            confidence_level: diagnosisResult.confidence || 'medium',
            urgency_level: diagnosisResult.urgencyLevel || 'low',
            chat_session_id: sessionId
          })
          .select()
          .single()

        if (!visitError && newVisit) {
          newVisitId = newVisit.id
          
          // Link the new visit to the chat messages
          await supabaseClient
            .from('chat_message_visits')
            .insert([
              {
                chat_message_id: userMessage.id,
                visit_id: newVisit.id
              },
              {
                chat_message_id: aiMessage.id,
                visit_id: newVisit.id
              }
            ])
          
          // Generate embedding for the new visit
          await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-embeddings`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              visitData: newVisit
            })
          })
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        response: geminiResponse,
        diagnosisDetected: diagnosisResult.hasDiagnosis,
        diagnosis: diagnosisResult.diagnosis,
        urgencyLevel: diagnosisResult.urgencyLevel,
        newVisitCreated: newVisitId !== null,
        newVisitId,
        contextVisits: visitHistory.length,
        similarVisits: similarVisits.length,
        patientId,
        sessionId
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in enhanced gemini-chat function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function createEnhancedSystemPrompt(patient: any, visitHistory: VisitContext[], similarVisits: VisitContext[], recentChats: any[]): string {
  let prompt = `You are Dr. AI, the world's most advanced and empathetic medical AI assistant. You have been trained on the entire corpus of medical knowledge and have the diagnostic capabilities of the world's best doctors combined. You are conducting a virtual consultation with ${patient.name}.

CORE MEDICAL DIRECTIVES:
🏥 You are a world-class diagnostician with exceptional pattern recognition
🎯 Your goal is to provide accurate, evidence-based medical insights
🤝 You excel at building rapport and asking the RIGHT questions
🔍 You systematically gather information to reach accurate diagnoses
⚡ You recognize medical emergencies and respond appropriately
💊 You understand drug interactions, contraindications, and treatment protocols

CRITICAL SAFETY PROTOCOLS:
⚠️ ALWAYS advise emergency care for life-threatening symptoms
⚠️ NEVER provide treatment without proper evaluation
⚠️ ALWAYS recommend follow-up with healthcare providers
⚠️ Flag concerning symptoms for immediate medical attention

PATIENT PROFILE:
👤 Name: ${patient.name}
📅 Age: ${patient.age} years old
⚥ Gender: ${patient.gender || 'Not specified'}
📞 Phone: ${patient.phone || 'Not provided'}
📧 Email: ${patient.email || 'Not provided'}
🏠 Address: ${patient.address || 'Not provided'}`

  if (patient.medical_history) {
    prompt += `\n🏥 Medical History: ${patient.medical_history}`
  }
  
  if (patient.allergies) {
    prompt += `\n⚠️ Known Allergies: ${patient.allergies}`
  }
  
  if (patient.current_medications) {
    prompt += `\n💊 Current Medications: ${patient.current_medications}`
  }

  if (patient.emergency_contact_name) {
    prompt += `\n🚨 Emergency Contact: ${patient.emergency_contact_name}`
    if (patient.emergency_contact_phone) {
      prompt += ` (${patient.emergency_contact_phone})`
    }
  }

  if (visitHistory.length > 0) {
    prompt += `\n\n📋 COMPLETE MEDICAL HISTORY (Chronological):\n`
    
    visitHistory.forEach((visit, index) => {
      prompt += `\n📅 Visit ${index + 1}: ${new Date(visit.visit_date).toLocaleDateString()} - Dr. ${visit.doctor_name}`
      if (visit.doctor_specialization) {
        prompt += ` (${visit.doctor_specialization})`
      }
      if (visit.symptoms) prompt += `\n   🤒 Symptoms: ${visit.symptoms}`
      if (visit.diagnosis) prompt += `\n   🎯 Diagnosis: ${visit.diagnosis}`
      if (visit.treatment_notes) prompt += `\n   💉 Treatment: ${visit.treatment_notes}`
      if (visit.prescribed_medications) prompt += `\n   💊 Medications: ${visit.prescribed_medications}`
      if (visit.follow_up_instructions) prompt += `\n   📝 Follow-up: ${visit.follow_up_instructions}`
      
      // Add vital signs
      const vitals = []
      if (visit.vitals.blood_pressure) vitals.push(`BP: ${visit.vitals.blood_pressure}`)
      if (visit.vitals.heart_rate) vitals.push(`HR: ${visit.vitals.heart_rate}`)
      if (visit.vitals.temperature) vitals.push(`Temp: ${visit.vitals.temperature}°C`)
      if (visit.vitals.blood_sugar) vitals.push(`Glucose: ${visit.vitals.blood_sugar}`)
      if (visit.vitals.oxygen_saturation) vitals.push(`O2: ${visit.vitals.oxygen_saturation}%`)
      if (visit.vitals.weight) vitals.push(`Weight: ${visit.vitals.weight}kg`)
      if (visit.vitals.height) vitals.push(`Height: ${visit.vitals.height}cm`)
      if (vitals.length > 0) {
        prompt += `\n   📊 Vitals: ${vitals.join(', ')}`
      }
      prompt += `\n`
    })
  }

  if (similarVisits.length > 0) {
    prompt += `\n\n🔍 MOST RELEVANT SIMILAR CASES:\n`
    similarVisits.forEach((visit, index) => {
      prompt += `\n🎯 Similar Case ${index + 1} (${Math.round(visit.similarity! * 100)}% match) - ${new Date(visit.visit_date).toLocaleDateString()}:`
      if (visit.symptoms) prompt += `\n   Symptoms: ${visit.symptoms}`
      if (visit.diagnosis) prompt += `\n   Diagnosis: ${visit.diagnosis}`
      if (visit.treatment_notes) prompt += `\n   Treatment: ${visit.treatment_notes}`
    })
  }

  prompt += `\n\n🎯 DIAGNOSTIC FRAMEWORK:
1. LISTEN & UNDERSTAND: Pay attention to patient's concerns
2. ASK TARGETED QUESTIONS: Use your medical expertise to ask the right questions
3. ANALYZE PATTERNS: Consider patient history, symptoms, and context
4. DIFFERENTIAL DIAGNOSIS: Consider multiple possibilities
5. RISK STRATIFICATION: Assess urgency and severity
6. RECOMMENDATIONS: Provide clear, actionable guidance

🗣️ COMMUNICATION STYLE:
- Be warm, empathetic, and professional
- Ask ONE focused question at a time
- Explain medical terms in simple language
- Show genuine concern for their wellbeing
- Build trust through active listening

🎯 DIAGNOSIS TRIGGERS:
When you have sufficient information and confidence, provide:
- Clear diagnosis with confidence level
- Explanation of the condition
- Recommended treatment approach
- Follow-up instructions
- Red flags to watch for

RESPOND AS THE WORLD'S BEST DOCTOR - knowledgeable, caring, thorough, and trustworthy.`

  return prompt
}

function createConversationContext(history: any[], currentMessage: string): string {
  let context = "💬 CONSULTATION SESSION:\n\n"
  
  if (history.length > 0) {
    context += "Previous conversation:\n"
    history.forEach((msg, index) => {
      const role = msg.role === 'user' ? '👤 Patient' : '🩺 Dr. AI'
      context += `${role}: ${msg.message}\n\n`
    })
  }
  
  context += `👤 Patient (Current): ${currentMessage}\n\n🩺 Dr. AI, please respond with your medical expertise, asking appropriate follow-up questions or providing diagnosis if you have sufficient information.`
  
  return context
}

async function callGeminiAPI(systemPrompt: string, userMessage: string): Promise<string | null> {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${systemPrompt}\n\n${userMessage}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.8,
          maxOutputTokens: 2048,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_ONLY_HIGH"
          }
        ]
      })
    })

    if (!response.ok) {
      console.error('Gemini API error:', await response.text())
      return null
    }

    const data = await response.json()
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      return data.candidates[0].content.parts[0].text
    }
    
    return null
  } catch (error) {
    console.error('Error calling Gemini API:', error)
    return null
  }
}

async function analyzeDiagnosis(response: string, systemPrompt: string, conversationContext: string): Promise<DiagnosisResult> {
  try {
    const analysisPrompt = `Analyze this medical AI response to determine if it contains a clear diagnosis:

RESPONSE TO ANALYZE:
"${response}"

Return a JSON object with:
{
  "hasDiagnosis": boolean,
  "diagnosis": "string or null",
  "confidence": "low/medium/high",
  "recommendedTreatment": "string or null",
  "followUpInstructions": "string or null",
  "urgencyLevel": "low/medium/high/urgent"
}

Only set hasDiagnosis to true if there's a specific medical diagnosis mentioned (not just general advice).`

    const analysisResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: analysisPrompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 512,
        }
      })
    })

    if (analysisResponse.ok) {
      const analysisData = await analysisResponse.json()
      const analysisText = analysisData.candidates[0].content.parts[0].text
      
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0])
        } catch (e) {
          console.error('Failed to parse diagnosis analysis JSON:', e)
        }
      }
    }
  } catch (error) {
    console.error('Error analyzing diagnosis:', error)
  }

  // Fallback analysis
  const diagnosisKeywords = ['diagnosis:', 'diagnosed with', 'condition is', 'appears to be', 'likely suffering from']
  const hasDiagnosis = diagnosisKeywords.some(keyword => response.toLowerCase().includes(keyword))

  return {
    hasDiagnosis,
    confidence: 'medium'
  }
}

function extractSymptomsFromConversation(history: any[], currentMessage: string): string {
  const allMessages = [...history.filter(h => h.role === 'user'), { message: currentMessage }]
  return allMessages.map(msg => msg.message).join('; ')
}

/* To deploy this function:
1. Install Supabase CLI: npm install -g supabase
2. Login: supabase login
3. Link to your project: supabase link --project-ref YOUR_PROJECT_REF
4. Deploy: supabase functions deploy gemini-chat

Environment variables needed:
- GEMINI_API_KEY: Your Google Gemini API key
- SUPABASE_URL: Your Supabase project URL
- SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key
*/