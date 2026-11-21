
import { serve } from "https://deno.land/std@0.224.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY")

    if (!apiKey) {
      throw new Error("Gemini API key is not configured.")
    }

    const { reports } = await req.json()

    if (!Array.isArray(reports) || reports.length === 0) {
      return new Response(
        JSON.stringify({ error: "No reports available for analysis." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Send only aggregated and non-identifying report information.
    const summary = {
      total: reports.length,
      statuses: {},
      priorities: {},
      categories: {},
      locations: {},
    }

    for (const report of reports) {
      const status = report.status || "Unknown"
      const priority = report.priority || "Unknown"
      const category = report.category || "Other"
      const location = [report.area, report.city].filter(Boolean).join(", ") || "Unknown"

      summary.statuses[status] = (summary.statuses[status] || 0) + 1
      summary.priorities[priority] = (summary.priorities[priority] || 0) + 1
      summary.categories[category] = (summary.categories[category] || 0) + 1
      summary.locations[location] = (summary.locations[location] || 0) + 1
    }

    const prompt = `
You are CivicPulse AI, an expert civic administration intelligence assistant.

Analyze the following aggregated civic complaint statistics.

DATA:
${JSON.stringify(summary, null, 2)}

Generate a useful administrative intelligence report.

Return ONLY valid JSON in this exact structure:

{
  "executive_summary": "A concise overview of the civic situation.",
  "key_insights": [
    {
      "title": "Insight title",
      "description": "What the data indicates.",
      "severity": "High"
    }
  ],
  "recommendations": [
    {
      "title": "Recommended action",
      "description": "What administrators should do.",
      "priority": "High"
    }
  ],
  "risk_areas": [
    {
      "location": "Area name",
      "reason": "Why this area deserves attention."
    }
  ]
}

Rules:
- Base every observation on the supplied data.
- Never invent facts, causes, or trends.
- Do not claim that a location is dangerous.
- Treat high report counts as possible workload hotspots, not proof of risk.
- Provide 3 to 5 useful insights.
- Provide 3 to 5 practical recommendations.
- Mention when the data is insufficient.
- Keep the language concise and professional.
`

    const geminiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=" + apiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json",
          },
        }),
      }
    )

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error("Gemini API error:", errorText)
      throw new Error("Gemini could not generate the civic analysis.")
    }

    const result = await geminiResponse.json()
    const generatedText =
      result.candidates?.[0]?.content?.parts?.[0]?.text

    if (!generatedText) {
      throw new Error("Gemini returned an empty response.")
    }

    const insights = JSON.parse(generatedText)

    return new Response(
      JSON.stringify({ success: true, insights }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    )
  } catch (error) {
    console.error("Civic insights error:", error)

    return new Response(
      JSON.stringify({
        error: error.message || "Unable to generate civic insights.",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    )
  }
})
