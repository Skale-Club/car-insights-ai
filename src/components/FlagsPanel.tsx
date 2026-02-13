import { AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Flag {
  severity: string;
  canonical_key: string;
  parameter_key: string;
  message: string;
  evidence?: Record<string, unknown> | null;
}

interface FlagsPanelProps {
  flags: Flag[];
  limit?: number;
}

export default function FlagsPanel({ flags, limit }: FlagsPanelProps) {
  const displayed = limit ? flags.slice(0, limit) : flags;
  const criticals = flags.filter(f => f.severity === 'critical');
  const attentions = flags.filter(f => f.severity === 'attention');

  if (flags.length === 0) {
    return (
      <Card className="bg-card border-success/30">
        <CardContent className="p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-success" />
          <div>
            <p className="text-sm font-medium text-foreground">All parameters look normal</p>
            <p className="text-xs text-muted-foreground">No attention or critical flags detected.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {displayed.map((flag, i) => {
        const isCritical = flag.severity === 'critical';
        const Icon = isCritical ? AlertCircle : AlertTriangle;
        const evidence = flag.evidence as Record<string, number> | null;

        return (
          <Card key={i} className={isCritical ? 'severity-critical border' : 'severity-attention border'}>
            <CardContent className="p-3 flex gap-3">
              <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isCritical ? 'text-destructive' : 'text-warn'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] uppercase font-mono font-bold tracking-wider ${isCritical ? 'text-destructive' : 'text-warn'}`}>
                    {flag.severity}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">{flag.canonical_key}</span>
                </div>
                <p className="text-xs text-foreground leading-relaxed">{flag.message}</p>
                {evidence && (
                  <div className="flex gap-3 mt-2 text-[10px] font-mono text-muted-foreground">
                    {evidence.max !== undefined && <span>max: {Number(evidence.max).toFixed(1)}</span>}
                    {evidence.avg !== undefined && <span>avg: {Number(evidence.avg).toFixed(1)}</span>}
                    {evidence.pct_out_of_range !== undefined && <span>{Number(evidence.pct_out_of_range).toFixed(1)}% out</span>}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
      {limit && flags.length > limit && (
        <p className="text-xs text-muted-foreground text-center">+{flags.length - limit} more flags</p>
      )}
    </div>
  );
}
