
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  classifyIssue,
  detectDuplicate,
  verifyReportImage,
} from '../lib/ai'

function ReportIssue() {
  const [form, setForm] = useState({
    title: '',
    category: 'Roads',
    description: '',
    city: 'Chandigarh',
    area: '',
    priority: 'Medium',
  })

  const [image, setImage] = useState(null)
  const [location, setLocation] = useState(null)
  const [gettingLocation, setGettingLocation] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [aiLoading, setAiLoading] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState(null)
  const [aiError, setAiError] = useState('')

  const [imageVerification, setImageVerification] = useState(null)
  const [imageVerificationLoading, setImageVerificationLoading] = useState(false)
  const [imageVerificationError, setImageVerificationError] = useState('')

  const inputClass =
    'w-full min-w-0 rounded-xl border border-white/10 bg-[#171717] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'

  const labelClass = 'mb-2 block text-sm font-medium text-slate-300'

  const handleChange = (e) => {
    const { name, value } = e.target

    setForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }))

    if (name === 'description') {
      setAiSuggestion(null)
      setAiError('')
    }
  }

  const handleAIAnalysis = async () => {
    setAiError('')
    setAiSuggestion(null)
    setAiLoading(true)

    try {
      const result = await classifyIssue(form.description)
      setAiSuggestion(result)
    } catch (err) {
      console.error('AI classification error:', err)
      setAiError(err.message || 'AI analysis failed. Please try again.')
    } finally {
      setAiLoading(false)
    }
  }

  const handleImageVerification = async () => {
    setImageVerification(null)
    setImageVerificationError('')

    if (!image) {
      setImageVerificationError('Please upload an image first.')
      return
    }

    if (form.description.trim().length < 10) {
      setImageVerificationError(
        'Please enter at least 10 characters describing the issue.'
      )
      return
    }

    setImageVerificationLoading(true)

    try {
      const result = await verifyReportImage(
        image,
        form.category,
        form.description
      )

      setImageVerification(result)
    } catch (err) {
      console.error('Image verification error:', err)
      setImageVerificationError(
        err.message || 'Image verification failed. Please try again.'
      )
    } finally {
      setImageVerificationLoading(false)
    }
  }

  const applyAISuggestions = () => {
    if (!aiSuggestion) return

    const categoryMap = {
      Water: 'Water Supply',
    }

    setForm((previousForm) => ({
      ...previousForm,
      category: categoryMap[aiSuggestion.category] || aiSuggestion.category,
      priority: aiSuggestion.priority,
    }))
  }

  const getCurrentLocation = () => {
    setLocationError('')

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.')
      return
    }

    setGettingLocation(true)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude
        const longitude = position.coords.longitude

        setLocation({ latitude, longitude })

        try {
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          )

          if (!response.ok) {
            throw new Error('Address lookup failed')
          }

          const data = await response.json()

          const detectedCity =
            data.city ||
            data.locality ||
            data.principalSubdivision ||
            ''

          setForm((previousForm) => ({
            ...previousForm,
            city: detectedCity || previousForm.city,
          }))

          setLocationError('')
        } catch (err) {
          console.error('Reverse geocoding error:', err)
          setLocationError(
            'Coordinates captured, but automatic address lookup failed. You can enter the city and area manually.'
          )
        } finally {
          setGettingLocation(false)
        }
      },
      (err) => {
        setLocationError(
          err.code === 1
            ? 'Location permission denied. Please allow location access in your browser.'
            : 'Unable to get your location. Please try again.'
        )
        setGettingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSuccess(false)
    setError('')
    setLoading(true)

    const reportId = `CP-${Date.now()}`
    let imageUrl = null

    try {
      // Check for possible duplicate reports
      const { data: possibleDuplicates, error: duplicateError } =
        await supabase
          .from('reports')
          .select('id, title, category, description, city, area, status')
          .eq('city', form.city)
          .eq('area', form.area)
          .eq('category', form.category)
          .neq('status', 'Resolved')
          .limit(20)

      if (duplicateError) {
        throw duplicateError
      }

      const newText = `${form.title} ${form.description}`.toLowerCase()

      const newWords = new Set(
        newText.split(/\W+/).filter((word) => word.length > 3)
      )

      const duplicateMatches = (possibleDuplicates || []).filter((item) => {
        const oldText = `${item.title} ${item.description}`.toLowerCase()

        const oldWords = new Set(
          oldText.split(/\W+/).filter((word) => word.length > 3)
        )

        const commonWords = [...newWords].filter((word) =>
          oldWords.has(word)
        )

        return commonWords.length >= 3
      })

      if (duplicateMatches.length > 0) {
        const match = duplicateMatches[0]

        setError(
          `A possible duplicate report already exists: ${match.id}. Please check before submitting.`
        )
        return
      }

      // AI-powered semantic duplicate detection
      try {
        const aiDuplicateResult = await detectDuplicate({
          title: form.title,
          description: form.description,
          city: form.city,
          area: form.area,
          category: form.category,
        })

        if (
          aiDuplicateResult?.duplicate &&
          aiDuplicateResult.matches?.length > 0
        ) {
          const match = aiDuplicateResult.matches[0]

          setError(
            `AI detected a possible duplicate! Existing report: ${match.id}. Similarity: ${match.similarity}%. Reason: ${match.reason}. Please check before submitting.`
          )

          return
        }
      } catch (aiDuplicateError) {
        console.warn(
          'AI duplicate detection unavailable. Continuing with standard checks:',
          aiDuplicateError
        )
      }

      // Verify logged-in user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!user) {
        throw new Error('Please log in before submitting a report.')
      }

      // Verify uploaded image before saving the report
      if (image) {
        setImageVerificationLoading(true)

        try {
          const verification = await verifyReportImage(
            image,
            form.category,
            form.description
          )

          setImageVerification(verification)

          if (!verification.relevant) {
            throw new Error(
              'AI could not verify that this image matches your complaint. Please upload a relevant image.'
            )
          }

          if (verification.needs_review) {
            throw new Error(
              'This image needs further review. Please upload a clearer photograph.'
            )
          }
        } finally {
          setImageVerificationLoading(false)
        }
      }

      // Upload photograph if provided
      if (image) {
        const fileExtension = image.name.split('.').pop()
        const filePath = `${reportId}.${fileExtension}`

        const { error: uploadError } = await supabase.storage
          .from('report-images')
          .upload(filePath, image, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          throw uploadError
        }

        const { data: imageData } = supabase.storage
          .from('report-images')
          .getPublicUrl(filePath)

        imageUrl = imageData.publicUrl
      }

      // Prepare report
      const report = {
        ...form,
        id: reportId,
        imageName: image?.name || null,
        imageUrl,
        status: 'Pending',
        createdAt: new Date().toISOString(),
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
      }

      // Save report to Supabase
      const { error: databaseError } = await supabase
        .from('reports')
        .insert({
          id: report.id,
          user_id: user.id,
          title: report.title,
          category: report.category,
          description: report.description,
          city: report.city,
          area: report.area,
          priority: report.priority,
          image_name: report.imageName,
          image_url: report.imageUrl,
          status: report.status,
          latitude: report.latitude,
          longitude: report.longitude,
        })

      if (databaseError) {
        throw databaseError
      }

      // Update local reports
      const existingReports = JSON.parse(
        localStorage.getItem('civicpulse-reports') || '[]'
      )

      localStorage.setItem(
        'civicpulse-reports',
        JSON.stringify([report, ...existingReports])
      )

      // Reset form after successful submission
      setSuccess(true)

      setForm({
        title: '',
        category: 'Roads',
        description: '',
        city: 'Chandigarh',
        area: '',
        priority: 'Medium',
      })

      setImage(null)
      setLocation(null)
      setAiSuggestion(null)
      setAiError('')
      setImageVerification(null)
      setImageVerificationError('')

      e.target.reset()
    } catch (err) {
      console.error('Report submission error:', err)
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen min-w-0 flex-1 bg-[#101010] px-3 py-5 text-white sm:px-5 sm:py-7 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-3xl min-w-0">

        <div className="mb-6 sm:mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400 sm:text-sm">
            Civic Reporting
          </p>

          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            Report an Issue
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
            Help improve your city by reporting a civic problem.
          </p>
        </div>

        {success && (
          <div className="mb-5 break-words rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400 sm:text-base">
            Report submitted successfully! Your report has been saved to the database.
          </div>
        )}

        {error && (
          <div className="mb-5 break-words rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-relaxed text-red-400">
            Submission failed: {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="min-w-0 space-y-5 rounded-2xl border border-white/10 bg-[#191919] p-4 shadow-xl shadow-black/20 sm:space-y-6 sm:p-6 lg:p-8"
        >
          {/* Issue title */}
          <div className="min-w-0">
            <label className={labelClass}>Issue Title</label>

            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              placeholder="Example: Large pothole near main road"
              className={inputClass}
            />
          </div>

          {/* Category and priority */}
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
            <div className="min-w-0">
              <label className={labelClass}>Category</label>

              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className={inputClass}
              >
                <option>Roads</option>
                <option>Water Supply</option>
                <option>Sanitation</option>
                <option>Electricity</option>
                <option>Streetlights</option>
                <option>Drainage</option>
                <option>Public Safety</option>
                <option>Other</option>
              </select>
            </div>

            <div className="min-w-0">
              <label className={labelClass}>Priority</label>

              <select
                name="priority"
                value={form.priority}
                onChange={handleChange}
                className={inputClass}
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Critical</option>
              </select>
            </div>
          </div>

          {/* Description and AI */}
          <div className="min-w-0">
            <label className={labelClass}>Description</label>

            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              required
              rows={4}
              placeholder="Describe the problem and how it affects the area..."
              className={`${inputClass} min-h-32 resize-y`}
            />

            <div className="mt-3">
              <button
                type="button"
                onClick={handleAIAnalysis}
                disabled={aiLoading || form.description.trim().length < 10}
                className="w-full rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm font-semibold text-orange-300 transition hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-5"
              >
                {aiLoading ? 'Analyzing Complaint...' : '✨ Analyze with AI'}
              </button>

              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                AI will suggest the issue category and priority based on your description.
              </p>
            </div>

            {aiError && (
              <div className="mt-4 break-words rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
                {aiError}
              </div>
            )}

            {aiSuggestion && (
              <div className="mt-4 min-w-0 rounded-xl border border-orange-500/30 bg-orange-500/5 p-4 sm:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-orange-300">
                    AI Analysis Results
                  </h3>

                  <span className="rounded-full bg-orange-500/15 px-3 py-1 text-xs text-orange-300">
                    AI Generated
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-500">Suggested Category</p>
                    <p className="mt-1 break-words font-medium text-white">
                      {aiSuggestion.category === 'Water'
                        ? 'Water Supply'
                        : aiSuggestion.category}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Suggested Priority</p>
                    <p className="mt-1 font-medium text-white">
                      {aiSuggestion.priority}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">AI Summary</p>
                    <p className="mt-1 break-words text-sm leading-relaxed text-slate-300">
                      {aiSuggestion.summary}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Reasoning</p>
                    <p className="mt-1 break-words text-sm leading-relaxed text-slate-300">
                      {aiSuggestion.reason}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={applyAISuggestions}
                  className="mt-5 w-full rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-500"
                >
                  Apply AI Suggestions
                </button>

                <p className="mt-2 text-center text-xs text-slate-500">
                  Review the suggestions before applying them to your report.
                </p>
              </div>
            )}
          </div>

          {/* City and area */}
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
            <div className="min-w-0">
              <label className={labelClass}>City</label>

              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>

            <div className="min-w-0">
              <label className={labelClass}>Area / Locality</label>

              <input
                name="area"
                value={form.area}
                onChange={handleChange}
                required
                placeholder="Example: Sector 17"
                className={inputClass}
              />
            </div>
          </div>

          {/* Location */}
          <div className="min-w-0 rounded-xl border border-white/10 bg-[#141414] p-4 sm:p-5">
            <label className="mb-3 block text-sm font-semibold text-slate-200">
              Report Location (Optional)
            </label>

            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={gettingLocation}
              className="w-full rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm font-semibold text-orange-300 transition hover:bg-orange-500/20 disabled:opacity-50 sm:w-auto"
            >
              {gettingLocation
                ? 'Getting Location...'
                : '📍 Use My Current Location'}
            </button>

            {location && (
              <p className="mt-3 text-sm text-emerald-400">
                ✓ Location captured successfully
              </p>
            )}

            {location && (
              <p className="mt-2 break-all text-xs leading-relaxed text-slate-400">
                Latitude: {location.latitude.toFixed(6)}
                <br />
                Longitude: {location.longitude.toFixed(6)}
              </p>
            )}

            {locationError && (
              <p className="mt-3 break-words text-sm leading-relaxed text-red-400">
                {locationError}
              </p>
            )}

            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Your browser will ask for permission. Coordinates will be attached to your report only if you allow access.
            </p>
          </div>

          {/* Photograph upload */}
          <div className="min-w-0">
            <label className={labelClass}>
              Upload Photograph (Optional)
            </label>

            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                setImage(e.target.files[0] || null)
                setImageVerification(null)
                setImageVerificationError('')
              }}
              className="w-full min-w-0 rounded-xl border border-white/10 bg-[#171717] p-3 text-xs text-slate-400 file:mb-2 file:mr-2 file:rounded-lg file:border-0 file:bg-orange-600 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-orange-500 sm:text-sm sm:file:mb-0 sm:file:mr-4 sm:file:px-4"
            />

            {image && (
              <p className="mt-2 break-all text-xs text-slate-400">
                Selected: {image.name}
              </p>
            )}

            <button
              type="button"
              onClick={handleImageVerification}
              disabled={!image || imageVerificationLoading}
              className="mt-4 w-full rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm font-semibold text-orange-300 transition hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              {imageVerificationLoading
                ? 'Verifying Image with AI...'
                : '🔍 Verify Image with AI'}
            </button>

            {imageVerificationError && (
              <div className="mt-4 break-words rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
                {imageVerificationError}
              </div>
            )}

            {imageVerification && (
              <div className="mt-4 min-w-0 rounded-xl border border-orange-500/30 bg-orange-500/5 p-4 sm:p-5">
                <h3 className="font-semibold text-orange-300">
                  AI Image Verification Results
                </h3>

                <p className="mt-3 text-sm text-slate-300">
                  Image relevance:{' '}
                  <span
                    className={
                      imageVerification.relevant
                        ? 'text-emerald-400'
                        : 'text-red-400'
                    }
                  >
                    {imageVerification.relevant ? 'Relevant' : 'Not relevant'}
                  </span>
                </p>

                <p className="mt-2 break-words text-sm text-slate-300">
                  Detected issue: {imageVerification.detected_issue}
                </p>

                <p className="mt-2 text-sm text-slate-300">
                  AI confidence: {imageVerification.confidence}%
                </p>

                <p className="mt-2 break-words text-sm leading-relaxed text-slate-300">
                  Explanation: {imageVerification.reason}
                </p>

                {imageVerification.needs_review && (
                  <p className="mt-3 text-sm text-amber-400">
                    Manual review recommended.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="border-t border-white/10 pt-5">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-orange-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-950/20 transition hover:bg-orange-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 sm:py-4 sm:text-base"
            >
              {loading
                ? 'Checking & Submitting Report...'
                : 'Submit Civic Report →'}
            </button>

            <p className="mt-3 text-center text-xs leading-relaxed text-slate-500">
              Please review your report details before submitting.
            </p>
          </div>
        </form>
      </div>
    </main>
  )
}

export default ReportIssue
