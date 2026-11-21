
import { supabase } from './supabase'

export async function classifyIssue(description) {
  const timeout = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error('AI is taking too long to respond. Please try again.'))
    }, 20000)
  })

  const request = supabase.functions.invoke('classify-issue', {
    body: { description },
  })

  const { data, error } = await Promise.race([request, timeout])

  if (error) {
    throw new Error(error.message || 'AI classification failed.')
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  return data
}

export async function detectDuplicate(report) {
  const { data, error } = await supabase.functions.invoke('detect-duplicate', {
    body: {
      title: report.title,
      description: report.description,
      city: report.city,
      area: report.area,
      category: report.category,
    },
  })

  if (error) {
    let details = error.message

    if (error.context) {
      try {
        details = await error.context.text()
      } catch (readError) {
        console.error('Could not read Edge Function response:', readError)
      }
    }

    console.error('Duplicate detection backend error:', details)
    throw new Error(details || 'Duplicate detection failed.')
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  return data
}

export async function verifyReportImage(image, category, description) {
  if (!image) {
    throw new Error('Please select an image first.')
  }

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(image.type)) {
    throw new Error('Please upload a JPG, PNG or WEBP image.')
  }

  if (image.size > 5 * 1024 * 1024) {
    throw new Error('Image must be smaller than 5 MB.')
  }

  const imageBase64 = await new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(
      new Error('Could not read the uploaded image.')
    )

    reader.readAsDataURL(image)
  })

  const { data, error } = await supabase.functions.invoke('verify-image', {
    body: {
      imageBase64,
      mimeType: image.type,
      category,
      description,
    },
  })

  if (error) {
    let details = error.message

    if (error.context) {
      try {
        details = await error.context.text()
      } catch (readError) {
        console.error('Could not read verification response:', readError)
      }
    }

    console.error('Image verification backend error:', details)
    throw new Error(details || 'Image verification failed.')
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  return data
}

export async function generateCivicInsights(reports) {
  const { data, error } = await supabase.functions.invoke('civic-insights', {
    body: { reports },
  })

  if (error) {
    throw new Error(error.message || 'Unable to generate AI insights.')
  }

  if (!data?.success || !data?.insights) {
    throw new Error(data?.error || 'AI returned an invalid response.')
  }

  return data.insights
}
