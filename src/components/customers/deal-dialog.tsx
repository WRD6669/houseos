'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle } from 'lucide-react';

interface DealDialogProps {
  customerId: string;
  propertyId: string;
  propertyName: string;
  listingType: string;
  propertyPrice: number;
}

export default function DealDialog({
  customerId,
  propertyId,
  propertyName,
  listingType,
  propertyPrice,
}: DealDialogProps) {
  const [open, setOpen] = useState(false);
  const [dealPrice, setDealPrice] = useState(String(propertyPrice || ''));
  const [commission, setCommission] = useState('');
  const [dealDate, setDealDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const price = Number(dealPrice);
    if (!price || price <= 0) {
      setError('请输入有效的成交价格');
      return;
    }
    setLoading(true);
    setError('');

    const isRent = listingType === 'rent';
    const supabase = createClient();

    // 1. Update customer status
    const { error: cErr } = await supabase
      .from('customers')
      .update({ status: 'deal', last_follow_up_time: new Date().toISOString() })
      .eq('id', customerId);
    if (cErr) { setError(cErr.message); setLoading(false); return; }

    // 2. Update property status
    const { error: pErr } = await supabase
      .from('properties')
      .update({ status: isRent ? 'occupied' : 'sold' })
      .eq('id', propertyId);
    if (pErr) { setError(pErr.message); setLoading(false); return; }

    // 3. Create relation
    const { error: rErr } = await supabase
      .from('customer_properties')
      .insert({
        customer_id: customerId,
        property_id: propertyId,
        relation_type: 'deal',
        status: 'active',
        notes: '成交房源: ' + propertyName,
        deal_price: price,
        deal_date: new Date(dealDate).toISOString(),
        commission: commission ? Number(commission) : null,
      });
    if (rErr) {
      // Fallback without deal columns
      const { error: fErr } = await supabase
        .from('customer_properties')
        .insert({
          customer_id: customerId,
          property_id: propertyId,
          relation_type: 'deal',
          status: 'active',
          notes: '成交房源: ' + propertyName + ' [价格:' + price + ' 佣金:' + (commission || '0') + ']',
        });
      if (fErr) { setError(fErr.message); setLoading(false); return; }
    }

    // 4. Auto follow-up
    await supabase.from('customer_follow_ups').insert({
      customer_id: customerId,
      property_id: propertyId,
      content: '成交! ' + (isRent ? '已出租' : '已出售') + ' ' + propertyName + ', 成交价:' + price,
      follow_up_type: 'other',
    });

    setLoading(false);
    setOpen(false);
    window.location.reload();
  };

  return (
    <>
      <Button variant="default" size="sm" onClick={() => setOpen(true)}>
        <CheckCircle className="size-3.5 mr-1" />
        成交
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative z-50 w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-1">
              确认成交 - {propertyName}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {listingType === 'rent' ? '出租' : '出售'} · 参考价格: {propertyPrice}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">成交价格</label>
                <Input
                  type="number"
                  value={dealPrice}
                  onChange={(e) => setDealPrice(e.target.value)}
                  placeholder={listingType === 'rent' ? '月租金额' : '出售总价'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">佣金 (可选)</label>
                <Input
                  type="number"
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                  placeholder="佣金金额"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">成交日期</label>
                <Input
                  type="date"
                  value={dealDate}
                  onChange={(e) => setDealDate(e.target.value)}
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
              <Button variant="default" onClick={handleSubmit} disabled={loading}>
                {loading ? '处理中...' : '确认成交'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
