import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function DashboardEmptyState({
  title,
  description,
  icon: Icon,
  action,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}) {
  return (
    <Card className="border-dashed border-[#404040] bg-[#0a0a0a]">
      <CardHeader>
        {Icon ? (
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg border border-[#262626] bg-[#111]">
            <Icon className="h-5 w-5 text-neutral-400" />
          </div>
        ) : null}
        <CardTitle className="text-base text-white">{title}</CardTitle>
        <CardDescription className="text-neutral-500">{description}</CardDescription>
      </CardHeader>
      {action ? <CardContent>{action}</CardContent> : null}
    </Card>
  );
}
