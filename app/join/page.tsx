import { JoinExperience } from "@/components/join-experience";
import { enabledSocialProviders } from "@/lib/auth-providers";

export default function JoinPage() {
  return <JoinExperience enabledProviders={enabledSocialProviders()} />;
}
