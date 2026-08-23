import { BookOpen, Database, LifeBuoy } from "lucide-react";
import Badge from "./Badge";

const ROUTES = {
  rag: { label: "Policy lookup", tone: "moss", icon: BookOpen },
  hris: { label: "Personal record", tone: "amber", icon: Database },
  escalation: { label: "Escalated to HR", tone: "warn", icon: LifeBuoy },
};

export default function RouteBadge({ route }) {
  const config = ROUTES[route];
  if (!config) return null;
  return (
    <Badge tone={config.tone} icon={config.icon}>
      {config.label}
    </Badge>
  );
}
