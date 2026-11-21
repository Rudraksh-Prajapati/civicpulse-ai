
import { useState } from 'react'

const faqs = [
  {
    question: 'How do I report a civic issue?',
    answer: 'Open Report an Issue, enter the problem details, select a category and priority, add your location, and submit the report.',
  },
  {
    question: 'Where can I track my complaints?',
    answer: 'Open My Reports from the sidebar to view your submitted complaints, priorities and current statuses.',
  },
  {
    question: 'Can I report issues from different cities?',
    answer: 'Yes. You can enter the city and locality manually while submitting a report.',
  },
  {
    question: 'Does CivicPulse AI send complaints directly to government departments?',
    answer: 'Not yet. This portfolio prototype currently stores reports locally in your browser. Official department integration would require authorised access.',
  },
]

function HelpSupport() {
  const [openIndex, setOpenIndex] = useState(null)

  return (
    <main className="min-h-screen min-w-0 flex-1 bg-slate-950 px-4 py-6 text-white sm:px-6 sm:py-8 md:px-8">
      <div className="mx-auto w-full max-w-3xl">

        {/* Header */}
        <div>
          <p className="text-xs font-medium text-blue-400 sm:text-sm">
            Support Centre
          </p>

          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
            Help & Support
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-400 sm:text-base">
            Find answers to common questions about CivicPulse AI.
          </p>
        </div>

        {/* FAQs */}
        <section className="mt-6 rounded-xl border border-white/10 bg-slate-900 p-4 sm:mt-8 sm:rounded-2xl sm:p-6">
          <h3 className="mb-5 text-base font-semibold sm:text-lg">
            Frequently Asked Questions
          </h3>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index

              return (
                <div
                  key={faq.question}
                  className="overflow-hidden rounded-xl border border-white/10 bg-slate-950 transition-colors hover:border-blue-500/30"
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    className="flex min-h-14 w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-white/[0.02]"
                  >
                    <span className="min-w-0 text-sm font-medium leading-6 text-slate-200 sm:text-base">
                      {faq.question}
                    </span>

                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-lg font-medium transition ${
                        isOpen
                          ? 'bg-blue-500/15 text-blue-400'
                          : 'bg-white/5 text-blue-400'
                      }`}
                    >
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-white/5 px-4 pb-4 pt-3">
                      <p className="text-sm leading-7 text-slate-400">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Still need help */}
        <section className="mt-5 rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/[0.08] to-slate-900 p-5 sm:mt-6 sm:rounded-2xl sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10 text-xl text-blue-400">
              ?
            </div>

            <div className="min-w-0">
              <h3 className="text-base font-semibold sm:text-lg">
                Still need help?
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                CivicPulse AI is currently a portfolio prototype. Support contact integration will be added in a future version.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <p className="mt-6 pb-4 text-center text-xs text-slate-500">
          CivicPulse AI · Smarter Cities. Better Living.
        </p>
      </div>
    </main>
  )
}

export default HelpSupport
