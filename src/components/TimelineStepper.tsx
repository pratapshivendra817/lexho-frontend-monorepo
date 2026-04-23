export default function TimelineStepper() {
  const steps = ["Booked", "Assigned", "In Progress", "Completed"];

  return (
    <div className="bg-gray-900 p-5 rounded-2xl shadow">
      <h3 className="font-semibold mb-4">Timeline</h3>

      <div className="flex flex-col gap-4">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center gap-3">
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
            <p>{step}</p>
          </div>
        ))}
      </div>
    </div>
  );
}