'use client';

import { useState, useCallback, type FormEvent } from 'react';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@yourbestride/ui';
import { contactFormSchema, type ContactFormInput } from '@yourbestride/types';
import { Icon } from '@/components/icon';
import { trackEvent } from '@/lib/analytics';

type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

export function ContactForm({ sourcePage }: { sourcePage: string }) {
  const [formData, setFormData] = useState<ContactFormInput>({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormInput, string>>>({});
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const validateField = useCallback((name: keyof ContactFormInput, value: string) => {
    const fieldSchema = contactFormSchema.shape[name];
    if (!fieldSchema) return;
    const result = fieldSchema.safeParse(value);
    if (!result.success) {
      setErrors((prev) => ({
        ...prev,
        [name]: result.error.errors[0]?.message ?? 'Invalid value',
      }));
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
      validateField(name as keyof ContactFormInput, value);
    },
    [validateField],
  );

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage('');

    const result = contactFormSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ContactFormInput, string>> = {};
      for (const issue of result.error.errors) {
        const path = issue.path[0] as keyof ContactFormInput;
        if (!fieldErrors[path]) {
          fieldErrors[path] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setStatus('submitting');
    try {
      const response = await fetch('/api/inquiries/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: result.data, sourcePage, website }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit inquiry');
      }

      trackEvent('contact_form_submit', { source_page: sourcePage });
      setStatus('success');
      setFormData({
        name: '',
        email: '',
        phone: '',
        message: '',
      });
      setErrors({});
    } catch (err) {
      setStatus('error');
      setErrorMessage(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      );
    }
  };

  return (
    <Card className="contact-form public-form-card">
      <CardHeader className="public-form-header">
        <CardTitle>Get in Touch</CardTitle>
        <CardDescription>
          Have a question or need assistance? Send us a message and we&apos;ll respond as soon as
          possible.
        </CardDescription>
      </CardHeader>

      {status === 'success' && (
        <div className="form-status success" role="status" aria-live="polite">
          <Icon name="check" width={24} height={24} className="status-icon" />
          <p>Thank you! Your message has been sent. We&apos;ll get back to you shortly.</p>
          <Button variant="outline" onClick={() => setStatus('idle')} type="button">
            <Icon name="arrow" width={16} height={16} /> Send Another
          </Button>
        </div>
      )}

      {status === 'error' && (
        <div className="form-status error" role="alert" aria-live="assertive">
          <Icon name="close" width={24} height={24} className="status-icon" />
          <p>{errorMessage}</p>
        </div>
      )}

      <form
        className="public-form-body"
        onSubmit={handleSubmit}
        noValidate
        aria-label="Contact form"
      >
        <div className="form-honeypot" aria-hidden="true">
          <label htmlFor="contact-website">Website</label>
          <input
            id="contact-website"
            name="website"
            type="text"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="name">
              Name{' '}
              <span className="required" aria-hidden="true">
                *
              </span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={errors.name ? 'error' : ''}
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? 'contact-name-error' : undefined}
              placeholder="John Doe"
              disabled={status === 'submitting' || status === 'success'}
              required
              autoComplete="name"
            />
            {errors.name && (
              <span id="contact-name-error" className="field-error" role="alert">
                {errors.name}
              </span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="email">
              Email{' '}
              <span className="required" aria-hidden="true">
                *
              </span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? 'error' : ''}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? 'contact-email-error' : undefined}
              placeholder="john@example.com"
              disabled={status === 'submitting' || status === 'success'}
              required
              autoComplete="email"
            />
            {errors.email && (
              <span id="contact-email-error" className="field-error" role="alert">
                {errors.email}
              </span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="phone">
              Phone{' '}
              <span className="required" aria-hidden="true">
                *
              </span>
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={errors.phone ? 'error' : ''}
              aria-invalid={errors.phone ? true : undefined}
              aria-describedby={errors.phone ? 'contact-phone-error' : undefined}
              placeholder="+1 (555) 123-4567"
              disabled={status === 'submitting' || status === 'success'}
              required
              autoComplete="tel"
            />
            {errors.phone && (
              <span id="contact-phone-error" className="field-error" role="alert">
                {errors.phone}
              </span>
            )}
          </div>

          <div className="form-field full-width">
            <label htmlFor="message">
              Message{' '}
              <span className="required" aria-hidden="true">
                *
              </span>
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              className={errors.message ? 'error' : ''}
              aria-invalid={errors.message ? true : undefined}
              aria-describedby={errors.message ? 'contact-message-error' : undefined}
              placeholder="How can we help you?"
              rows={5}
              disabled={status === 'submitting' || status === 'success'}
              required
            />
            {errors.message && (
              <span id="contact-message-error" className="field-error" role="alert">
                {errors.message}
              </span>
            )}
          </div>
        </div>

        {status !== 'success' && (
          <CardFooter className="form-actions">
            <Button type="submit" disabled={status === 'submitting'} className="submit-button">
              {status === 'submitting' ? (
                <>
                  <span className="spinner" aria-hidden="true"></span>
                  Sending...
                </>
              ) : (
                <>
                  <Icon name="mail" width={18} />
                  Send Message
                </>
              )}
            </Button>
            <p className="form-disclaimer">
              <Icon name="check" width={14} height={14} />
              Please don&apos;t share medical or sensitive personal information through this form.
            </p>
          </CardFooter>
        )}
      </form>
    </Card>
  );
}
