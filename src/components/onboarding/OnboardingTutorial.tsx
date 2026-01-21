'use client'

import { useState } from 'react'

interface OnboardingTutorialProps {
  onComplete: () => void
}

const TUTORIAL_STEPS = [
  {
    icon: '🌙',
    title: 'Welcome to Your Sleep Journey',
    description: 'This app helps you and your therapist track your sleep patterns and improve your rest through CBT-I (Cognitive Behavioral Therapy for Insomnia).',
  },
  {
    icon: '📝',
    title: 'Log Your Sleep Daily',
    description: 'Every morning, take a couple minutes to record when you went to bed, when you fell asleep, any wake-ups during the night, and when you got up.',
  },
  {
    icon: '📊',
    title: 'Your Therapist Reviews Your Data',
    description: 'Your therapist will analyze your sleep patterns and create a personalized sleep window - specific times to go to bed and wake up.',
  },
  {
    icon: '✨',
    title: 'Better Sleep Ahead',
    description: 'By following your sleep schedule and logging consistently, most people see significant improvements in their sleep within a few weeks.',
  },
]

export function OnboardingTutorial({ onComplete }: OnboardingTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1
  const step = TUTORIAL_STEPS[currentStep]

  const handleNext = () => {
    if (isLastStep) {
      onComplete()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {TUTORIAL_STEPS.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentStep
                  ? 'w-6 bg-blue-600'
                  : index < currentStep
                    ? 'bg-blue-400'
                    : 'bg-slate-300'
              }`}
            />
          ))}
        </div>

        {/* Content card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <div className="text-6xl mb-6">{step.icon}</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">{step.title}</h2>
          <p className="text-slate-600 mb-8 leading-relaxed">{step.description}</p>

          {/* Navigation */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="flex-1 py-3 px-6 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className={`py-3 px-6 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition ${
                currentStep === 0 ? 'flex-1' : 'flex-1'
              }`}
            >
              {isLastStep ? "Let's Get Started!" : 'Next'}
            </button>
          </div>

          {/* Skip option */}
          {!isLastStep && (
            <button
              onClick={onComplete}
              className="w-full mt-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition"
            >
              Skip tutorial
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
