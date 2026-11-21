'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { createPayment } from '@/lib/api/payments';
import type { CreatePaymentInput } from '@/lib/types';

const DESCRIPTION_MAX_LENGTH = 500;

export function PaymentForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreatePaymentInput>({
    amount: '',
    currency: 'USD',
    description: '',
    recipient: '',
  });

  const descriptionLength = formData.description.length;
  const isDescriptionTooLong = descriptionLength > DESCRIPTION_MAX_LENGTH;

  const handleChange = (field: keyof CreatePaymentInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDescriptionTooLong) return;

    setIsSubmitting(true);
    try {
      await createPayment(formData);
      toast({
        title: 'Payment created',
        description: 'Your payment has been created successfully.',
      });
      router.push('/dashboard/payments');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create payment.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Payment</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => handleChange('amount', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select
              value={formData.currency}
              onValueChange={(value) => handleChange('currency', value)}
            >
              <SelectTrigger id="currency">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient</Label>
            <Input
              id="recipient"
              placeholder="Recipient address or email"
              value={formData.recipient}
              onChange={(e) => handleChange('recipient', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              maxLength={DESCRIPTION_MAX_LENGTH}
            />
            <p
              className={`text-xs ${
                isDescriptionTooLong ? 'text-destructive' : 'text-muted-foreground'
              }`}
            >
              {descriptionLength} / {DESCRIPTION_MAX_LENGTH}
            </p>
          </div>
        </CardContent>

        <CardFooter>
          <Button type="submit" disabled={isSubmitting || isDescriptionTooLong}>
            {isSubmitting ? 'Creating...' : 'Create Payment'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
