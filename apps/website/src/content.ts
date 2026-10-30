export type LegalPage = {
  slug: string;
  title: string;
  eyebrow: string;
  intro: string;
  apiSlug?: "terms" | "privacy" | "cancellation" | "partner-terms" | "about";
  sections: Array<{ heading: string; body: string[] }>;
};

const standardSections = (subject: string): LegalPage["sections"] => [
  { heading: "What this covers", body: [`This ${subject} explains the rules and information that apply when you use Lexho's services, website, or related communications.`] },
  { heading: "Our service", body: ["Lexho helps customers discover and book home services. Service availability, pricing, partner allocation and timing can vary by location and booking requirements."] },
  { heading: "Your responsibilities", body: ["Please provide accurate booking and contact details, maintain a safe service environment, and use the platform lawfully and respectfully."] },
  { heading: "Changes and contact", body: ["We may update this information when our service or legal requirements change. For questions, use the support form on this website."] },
];

export const legalPages: Record<string, LegalPage> = {
  "/terms": { slug: "terms-and-conditions", title: "Terms & Conditions", eyebrow: "Legal", intro: "The terms that govern your use of Lexho.", apiSlug: "terms", sections: standardSections("Terms & Conditions") },
  "/privacy": { slug: "privacy-policy", title: "Privacy Policy", eyebrow: "Legal", intro: "How Lexho handles information entrusted to us.", apiSlug: "privacy", sections: [
    { heading: "Information we collect", body: ["We collect information you provide for account creation, bookings, payments, customer support and service delivery."] },
    { heading: "How we use it", body: ["Information is used to operate and improve the service, coordinate bookings, communicate with you and meet legal obligations."] },
    { heading: "Your choices", body: ["You can ask support for help with your information or account. Some data may be retained where required for bookings, safety, fraud prevention or law."] },
    ...standardSections("Privacy Policy").slice(3),
  ] },
  "/cancellation-policy": { slug: "cancellation-policy", title: "Cancellation Policy", eyebrow: "Booking help", intro: "A simple guide to cancelling or changing a service booking.", apiSlug: "cancellation", sections: [
    { heading: "Cancelling a booking", body: ["You can request cancellation from your booking details before service delivery. Eligibility and any applicable charge are shown for the booking where available."] },
    { heading: "Refunds", body: ["If a refund is applicable, it is processed to the original payment method or according to the payment option used. Timing can depend on your bank or payment provider."] },
    ...standardSections("Cancellation Policy").slice(3),
  ] },
  "/partner-terms": { slug: "partner-terms", title: "Partner Terms", eyebrow: "For professionals", intro: "The expectations for service professionals working through Lexho.", apiSlug: "partner-terms", sections: [
    { heading: "Partner relationship", body: ["Partners are expected to maintain accurate profiles, required documentation, professional conduct and reliable availability."] },
    { heading: "Service standards", body: ["Partners must follow booking instructions, safety standards and applicable local laws while delivering services."] },
    ...standardSections("Partner Terms").slice(3),
  ] },
  "/about": { slug: "about", title: "About Lexho", eyebrow: "About", intro: "A more considered way to run a home.", apiSlug: "about", sections: [
    { heading: "What we do", body: ["Lexho brings trusted home services closer to the people who need them, with clarity at every step."] },
    { heading: "Built around trust", body: ["From booking to service completion, Lexho is designed to make the experience feel straightforward, safe and human."] },
  ] },
};

export const fallbackFaqs = [
  { category: "Bookings", question: "How do I change or cancel a booking?", answer: "Open your booking details in the Lexho app to view the available change or cancellation options." },
  { category: "Payments", question: "When will I receive a refund?", answer: "Eligible refunds are initiated after review. Bank and payment-provider processing times can vary." },
  { category: "Service", question: "What if I need help during a service?", answer: "Use the support option in your booking or submit a support request with the booking ID." },
  { category: "Account", question: "How can I update my account details?", answer: "You can manage most profile details from the Lexho app. Contact support if you need further help." },
];
