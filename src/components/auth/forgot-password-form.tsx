'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/contexts/i18n-context';
import Link from 'next/link';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

export function ForgotPasswordForm() {
  const { toast } = useToast();
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, values.email);
      toast({
        title: t('ForgotPasswordPage.success_title'),
        description: t('ForgotPasswordPage.success_description', { email: values.email }),
      });
      setIsSubmitted(true);
    } catch (error: any) {
      // We show a generic success message to prevent user enumeration attacks
      // but log the real error for debugging.
      console.error("Password reset error:", error);
      toast({
        title: t('ForgotPasswordPage.success_title'),
        description: t('ForgotPasswordPage.success_description', { email: values.email }),
      });
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      {isSubmitted ? (
        <>
            <CardContent className="pt-6 text-center">
                 <p className="text-muted-foreground">{t('ForgotPasswordPage.success_description', { email: form.getValues('email') })}</p>
            </CardContent>
            <CardFooter className="flex-col">
                <Button variant="outline" className="w-full" asChild>
                    <Link href="/login">{t('ForgotPasswordPage.back_to_login')}</Link>
                </Button>
            </CardFooter>
        </>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4 pt-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('ForgotPasswordPage.email_label')}</FormLabel>
                    <FormControl>
                      <Input placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t('ForgotPasswordPage.sending') : t('ForgotPasswordPage.submit_button')}
              </Button>
               <Button variant="link" className="text-sm" asChild>
                    <Link href="/login">{t('ForgotPasswordPage.back_to_login')}</Link>
                </Button>
            </CardFooter>
          </form>
        </Form>
      )}
    </Card>
  );
}
