import ProviderInfo from "../components/provider/ProviderInfo";
import ProviderDocuments from "../components/provider/ProviderDocuments";
import VerificationStatusComp from "../components/provider/VerificationStatus";
import { providerData } from "../data/mockProvider";

export default function ProviderVerification() {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <h1 className="text-2xl font-bold mb-6">Provider Verification</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ProviderInfo data={providerData} />
        <ProviderDocuments data={providerData} />
        <VerificationStatusComp data={providerData} />
      </div>
    </div>
  );
}