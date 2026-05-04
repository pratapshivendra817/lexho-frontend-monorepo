type OnboardingProgressProps = {
  currentStep: number;
  steps: string[];
};

export function OnboardingProgress({ currentStep, steps }: OnboardingProgressProps) {
  const progress = Math.round(((currentStep + 1) / steps.length) * 100);

  return (
    <div className="onboarding-progress">
      <div className="onboarding-progress-head">
        <p className="item-title">Onboarding Progress</p>
        <p className="item-subtitle">{progress}% complete</p>
      </div>
      <div className="onboarding-progress-track">
        <div className="onboarding-progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="onboarding-steps">
        {steps.map((step, index) => (
          <div key={step} className={`onboarding-step ${index <= currentStep ? "active" : ""}`}>
            {index + 1}. {step}
          </div>
        ))}
      </div>
    </div>
  );
}
