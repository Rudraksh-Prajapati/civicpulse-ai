
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

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405)
  }

  try {
    const {
      imageBase64,
      mimeType,
      category,
      description,
    } = await req.json()

    if (!imageBase64 || !mimeType || !category || !description) {
      return jsonResponse({
        error: "Image and complaint details are required.",
      }, 400)
    }

    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ]

    if (!allowedMimeTypes.includes(mimeType)) {
      return jsonResponse({
        error: "Only JPG, PNG and WEBP images are supported.",
      }, 400)
    }

    const cleanBase64 = imageBase64.replace(
      /^data:image\/[a-zA-Z0-9.+-]+;base64,/,
      "",
    )

    if (
      typeof cleanBase64 !== "string" ||
      cleanBase64.length > 7_000_000 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64)
    ) {
      return jsonResponse({
        error: "Invalid image or image is too large. Please upload a smaller image.",
      }, 400)
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY")

    if (!apiKey) {
      throw new Error("Gemini API key is not configured.")
    }

    const prompt = `
You are an AI image verification assistant for CivicPulse AI, an Indian civic complaint reporting platform.

Analyse the uploaded image and compare it with the citizen's complaint.

COMPLAINT CATEGORY: ${category}

COMPLAINT DESCRIPTION: ${description}

Determine:
1. Whether the image appears relevant to the complaint.
2. What visible issue, if any, is present.
3. Whether the image is unclear, unrelated, or does not show enough evidence.

Rules:
- Do not invent details that are not visible.
- Do not claim to verify the exact location or authenticity of an image.
- A relevant image does not prove that the complaint is genuine.
- If the image is unclear, return needs_review as true.
- If the image is unrelated, return relevant as false.

Return only structured JSON.
`

    const aiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          model: "gemini-3.5-flash-lite",
          input: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image",
              data: cleanBase64,
              mime_type: mimeType,
            },
          ],
          response_format: {
            type: "text",
            mime_type: "application/json",
            schema: {
              type: "object",
              properties: {
                relevant: { type: "boolean" },
                needs_review: { type: "boolean" },
                detected_issue: { type: "string" },
                confidence: { type: "integer" },
                reason: { type: "string" },
              },
              required: [
                "relevant",
                "needs_review",
                "detected_issue",
                "confidence",
                "reason",
              ],
              additionalProperties: false,
            },
          },
        }),
      },
    )

    if (!aiResponse.ok) {
      const details = await aiResponse.text()
      console.error("Gemini API error:", details)
      throw new Error("Gemini image analysis failed. Check function logs.")
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
      throw new Error("Gemini returned an empty response.")
    }

    const result = JSON.parse(generatedText)

    if (
      typeof result.relevant !== "boolean" ||
      typeof result.needs_review !== "boolean" ||
      typeof result.detected_issue !== "string" ||
      typeof result.confidence !== "number" ||
      typeof result.reason !== "string"
    ) {
      throw new Error("AI returned an invalid verification result.")
    }

    return jsonResponse(result)

  } catch (error) {
    console.error("Image verification error:", error)

    return jsonResponse({
      error: error instanceof Error
        ? error.message
        : "Unexpected server error.",
    }, 500)
  }
})
