'use client';

import { BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function ConsensusTab() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center py-16 text-muted-foreground">
          <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">컨센서스</p>
          <p className="text-sm mt-2">준비 중입니다</p>
        </div>
      </CardContent>
    </Card>
  );
}
