// web-application/src/components/builder/AnalyticsPanel.tsx

import React from "react";
import type { Dataset } from "@/types/index";

interface AnalyticsPanelProps {
  datasets?: Dataset[];
}

export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ datasets }) => {
  // Temporary empty component to satisfy type checking
  return (
    <div>
      {/* TODO: implement AnalyticsPanel */}
      <pre>{JSON.stringify(datasets, null, 2)}</pre>
    </div>
  );
};
