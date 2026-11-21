
import { serve } from "https://deno.land/std@0.224.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  })
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { title, description, city, area, category } = await req.json()

    if (!title || !description || !city || !area || !category) {
      return jsonResponse({ error: "Missing required report details." }, 400)
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")
    const geminiKey = Deno.env.get("GEMINI_API_KEY")

    if (!supabaseUrl || !supabaseKey || !geminiKey) {
      throw new Error("Missing required Supabase or Gemini environment variable.")
    }

    const authHeader = req.headers.get("Authorization")

    if (!authHeader) {
      return jsonResponse({ error: "Authentication required." }, 401)
    }

    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseKey,
        Authorization: authHeader,
      },
    })

    if (!authResponse.ok) {
      const details = await authResponse.text()
      console.error("Authentication error:", details)
      return jsonResponse({ error: "Authentication failed." }, 401)
    }

    const reportsUrl = new URL(`${supabaseUrl}/rest/v1/reports`)

    reportsUrl.searchParams.set(
      "select",
      "id,title,description,category,city,area,status"
    )
    reportsUrl.searchParams.set("city", `eq.${city}`)
    reportsUrl.searchParams.set("area", `eq.${area}`)
    reportsUrl.searchParams.set("category", `eq.${category}`)
    reportsUrl.searchParams.set("status", "neq.Resolved")
    reportsUrl.searchParams.set("limit", "20")

    const reportsResponse = await fetch(reportsUrl.toString(), {
      headers: {
        apikey: supabaseKey,
        Authorization: authHeader,
      },
    })

    if (!reportsResponse.ok) {
      const details = await reportsResponse.text()
      console.error("Database query error:", details)
      throw new Error(`Database query failed: ${details}`)
    }

    const reports = await reportsResponse.json()

    if (!reports.length) {
      return jsonResponse({ duplicate: false, matches: [] })
    }

    const prompt = `
You detect duplicate civic issue reports.

Compare this new report with the existing reports.

NEW REPORT:
Title: ${title}
Description: ${description}
Category: ${category}
City: ${city}
Area: ${area}

EXISTING REPORTS:
${JSON.stringify(reports)}

Find reports describing the same real-world problem at the same or nearby location.

Different wording can describe the same issue.
Do not mark reports as duplicates just because their category is the same.

Return only JSON in this format:
{
  "matches": [
    {
      "id": "existing report id",
      "similarity": 90,
      "reason": "Short explanation"
    }
  ]
}

Only return likely duplicates with similarity of 75 or higher.
Return an empty matches array if there are no likely duplicates.
`

    
const aiResponse = await fetch(
  "https://generativelanguage.googleapis.com/v1beta/interactions",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": geminiKey,
    },
    body: JSON.stringify({
      model: "gemini-3.5-flash-lite",
      input: prompt,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: {
          type: "object",
          properties: {
            matches: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  similarity: { type: "integer" },
                  reason: { type: "string" },
                },
                required: ["id", "similarity", "reason"],
                additionalProperties: false,
              },
            },
          },
          required: ["matches"],
          additionalProperties: false,
        },
      },
    }),
  }
)

if (!aiResponse.ok) {
  const details = await aiResponse.text()
  console.error("Gemini API error:", details)
  throw new Error(`Gemini API failed: ${details}`)
}

const aiResult = await aiResponse.json()

const outputStep = aiResult.steps
  ?.filter((step: any) => step.type === "model_output")
  .at(-1)

const generatedText = outputStep?.content
  ?.filter((part: any) => part.type === "text")
  .map((part: any) => part.text)
  .join("")

if (!generatedText) {
  console.error("Unexpected Gemini response:", JSON.stringify(aiResult))
  throw new Error("Gemini returned an empty response.")
}

const parsed = JSON.parse(generatedText)

    const validMatches = (parsed.matches || []).filter((match: any) =>
      reports.some((report: any) => report.id === match.id) &&
      Number(match.similarity) >= 75
    )

    return jsonResponse({
      duplicate: validMatches.length > 0,
      matches: validMatches,
    })

  } catch (error) {
    console.error("DETECT DUPLICATE ERROR:", error)

    return jsonResponse({
      error: error instanceof Error ? error.message : "Unexpected server error.",
    }, 500)
  }
})
