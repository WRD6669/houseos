'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from 'lucide-react';

interface ScheduleViewingDialogProps {
  customerId: string;
  propertyId: string;
  propertyName: string;
  manager?: string;
}

export default function ScheduleViewingDialog({
  customerId,
  propertyId,
  propertyName,
  manager,
}: ScheduleViewingDialogProps) {
  const [open, setOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [notes, setNotes] = useState('');
  const [managerName, setManagerName] = useState(manager || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!scheduledAt) {
      setError('请选择看房时间');
      return;
    }
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error: insertErr } = await supabase.from('customer_follow_ups').insert({
      customer_id: customerId,
      property_id: propertyId,
      content: notes || `预约看房: ${propertyName}`,
      follow_up_type: 'visit',
      scheduled_at: new Date(scheduledAt).toISOString(),
      manager: managerName || null,
      result: 'pending',
    });

    if (insertErr) {
      setError(insertErr.message);
      setLoading(false);
      return;
    }

    await supabase
      .from('customers')
      .update({ last_follow_up_time: new Date().toISOString(), status: 'viewing' })
      .eq('id', customerId);

    setLoading(false);
    setOpen(false);
    setScheduledAt('');
    setNotes('');
    window.location.reload();
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Calendar className="size-3.5 mr-1" />
        预约带看
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative z-50 w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">
              预约带看 - {propertyName}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">看房时间</label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">备注</label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="例: 客户希望看下午的"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">负责人</label>
                <Input
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="负责人姓名"
                />
              </div>

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                取消
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? '提交中...' : '确认预约'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
