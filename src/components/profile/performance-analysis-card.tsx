
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart } from "lucide-react";

const performanceData = {
  kdRatio: 1.78,
  winRate: 62,
  headshotRate: 45,
};

export function PerformanceAnalysisCard() {
  // Normalize K/D ratio for progress bar (assuming a max of 3.0 for visual representation)
  const normalizedKd = (performanceData.kdRatio / 3.0) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <BarChart className="h-5 w-5" />
          Análisis de Rendimiento
        </CardTitle>
        <CardDescription>Estadísticas de partidas recientes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-2">
        <div className="space-y-2">
          <div className="flex justify-between items-baseline text-sm">
            <span className="text-muted-foreground">Ratio K/D</span>
            <span className="font-semibold text-lg">{performanceData.kdRatio.toFixed(2)}</span>
          </div>
          <Progress value={normalizedKd} aria-label={`${performanceData.kdRatio} K/D Ratio`} />
        </div>
        <div className="space-y-2">
            <div className="flex justify-between items-baseline text-sm">
            <span className="text-muted-foreground">Tasa de Victorias</span>
            <span className="font-semibold text-lg">{performanceData.winRate}%</span>
            </div>
          <Progress value={performanceData.winRate} aria-label={`${performanceData.winRate}% Win Rate`} />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-baseline text-sm">
            <span className="text-muted-foreground">% de Tiros a la Cabeza</span>
            <span className="font-semibold text-lg">{performanceData.headshotRate}%</span>
          </div>
          <Progress value={performanceData.headshotRate} aria-label={`${performanceData.headshotRate}% Headshot Rate`} />
        </div>
      </CardContent>
    </Card>
  );
}
