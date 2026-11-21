
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

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  }

  try {
    const { description } = await req.json()

    if (
      !description ||
      typeof description !== "string" ||
      description.trim().length < 10
    ) {
      return new Response(
        JSON.stringify({
          error: "Please enter at least 10 characters describing the issue.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    if (description.length > 2000) {
      return new Response(
        JSON.stringify({ error: "Description must be under 2000 characters." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY")

    if (!apiKey) {
      throw new Error("Gemini API key is not configured.")
    }

    const prompt = `Analyze this civic complaint from India.

Return a classification using these exact fields:
- category: one of Roads, Water, Electricity, Sanitation, Public Safety, Drainage, Other
- priority: one of Low, Medium, High, Critical
- reason: a short explanation
- summary: a one-sentence summary

Priority guidance:
Critical: immediate threat to life, major accident, exposed live electrical wires, severe flooding with danger.
High: serious disruption or significant public hazard.
Medium: noticeable issue requiring attention.
Low: minor issue with limited impact.

Do not invent facts. If information is insufficient, choose Medium.

Complaint: ${description.trim()}`

   
let response: Response | null = null

for (let attempt = 1; attempt <= 2; attempt++) {
  response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/interactions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
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
              category: {
                type: "string",
                enum: [
                  "Roads",
                  "Water",
                  "Electricity",
                  "Sanitation",
                  "Public Safety",
                  "Drainage",
                  "Other",
                ],
              },
              priority: {
                type: "string",
                enum: ["Low", "Medium", "High", "Critical"],
              },
              reason: { type: "string" },
              summary: { type: "string" },
            },
            required: ["category", "priority", "reason", "summary"],
            additionalProperties: false,
          },
        },
      }),
    },
  )

  if (
    response.ok ||
    ![429, 500, 502, 503, 504].includes(response.status) ||
    attempt === 2
  ) {
    break
  }

  await new Promise((resolve) => setTimeout(resolve, 1500))
}


    if (!response.ok) {
      const details = await response.text()
      console.error("Gemini API error:", details)
      throw new Error("Gemini AI service returned an error. Check function logs.")
    }

    const result = await response.json()

    const outputStep = result.steps
      ?.filter((step) => step.type === "model_output")
      .at(-1)

    const generatedText = outputStep?.content
      ?.filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("")

    if (!generatedText) {
      throw new Error("Gemini returned an empty response.")
    }

    const classification = JSON.parse(generatedText)

    const allowedCategories = [
      "Roads",
      "Water",
      "Electricity",
      "Sanitation",
      "Public Safety",
      "Drainage",
      "Other",
    ]

    const allowedPriorities = ["Low", "Medium", "High", "Critical"]

    if (
      !allowedCategories.includes(classification.category) ||
      !allowedPriorities.includes(classification.priority) ||
      typeof classification.reason !== "string" ||
      typeof classification.summary !== "string"
    ) {
      throw new Error("AI returned an invalid classification.")
    }

    return new Response(
      JSON.stringify(classification),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("Classification function error:", error)

    return new Response(
      JSON.stringify({
        error: error.message || "Something went wrong.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  }
})
