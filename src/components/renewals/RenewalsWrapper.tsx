import { RenewalsModule as RenewalsTracker } from "./RenewalsModule";
import { RenewalCustomersView } from "./RenewalCustomersView";

interface RenewalsWrapperProps {
  initialTab?: string;
}

export function RenewalsWrapper({ initialTab = "tracker" }: RenewalsWrapperProps) {
  const renderContent = () => {
    switch (initialTab) {
      case "customers":
        return <RenewalCustomersView />;
      case "contracts":
      case "licenses":
      case "subscriptions":
      case "tracker":
      default:
        return <RenewalsTracker />;
    }
  };

  return renderContent();
}
