'use client';

import { useState, useCallback, type FormEvent } from 'react';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@yourbestride/ui';
import { driverApplicationSchema, type DriverApplicationInput } from '@yourbestride/types';
import { Icon } from '@/components/icon';
import { trackEvent } from '@/lib/analytics';

type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

export function DriverApplicationForm({ sourcePage }: { sourcePage: string }) {
  const [formData, setFormData] = useState<DriverApplicationInput>({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    drivingExperience: '',
    licenseClass: '',
    availability: '',
    message: '',
  });
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof DriverApplicationInput, string>>>({});
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const validateField = useCallback((name: keyof DriverApplicationInput, value: string) => {
    const fieldSchema = driverApplicationSchema.shape[name];
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
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
      validateField(name as keyof DriverApplicationInput, value);
    },
    [validateField],
  );

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage('');

    const result = driverApplicationSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof DriverApplicationInput, string>> = {};
      for (const issue of result.error.errors) {
        const path = issue.path[0] as keyof DriverApplicationInput;
        if (!fieldErrors[path]) {
          fieldErrors[path] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setStatus('submitting');
    try {
      const response = await fetch('/api/applications/driver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: result.data, sourcePage, website }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit application');
      }

      trackEvent('driver_application_submit', { source_page: sourcePage });
      setStatus('success');
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        location: '',
        drivingExperience: '',
        licenseClass: '',
        availability: '',
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
    <Card className="driver-application-form public-form-card">
      <CardHeader className="driver-application-header public-form-header">
        <CardTitle>Join Our Team</CardTitle>
        <CardDescription>
          Apply to become a driver with YourBestRide. Our team reviews all applications carefully.
        </CardDescription>
      </CardHeader>

      {status === 'success' && (
        <div className="form-status success" role="status" aria-live="polite">
          <Icon name="check" width={24} height={24} className="status-icon" />
          <p>
            Thank you! Your driver application has been submitted. Our team will review it and
            contact you soon.
          </p>
          <Button variant="outline" onClick={() => setStatus('idle')} type="button">
            <Icon name="arrow" width={16} height={16} /> Submit Another
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
        className="driver-application-body public-form-body"
        onSubmit={handleSubmit}
        noValidate
        aria-label="Driver application form"
      >
        <div className="form-honeypot" aria-hidden="true">
          <label htmlFor="driver-website">Website</label>
          <input
            id="driver-website"
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
            <label htmlFor="fullName">
              Full Name{' '}
              <span className="required" aria-hidden="true">
                *
              </span>
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className={errors.fullName ? 'error' : ''}
              aria-invalid={errors.fullName ? true : undefined}
              aria-describedby={errors.fullName ? 'driver-application-fullName-error' : undefined}
              placeholder="John Doe"
              disabled={status === 'submitting' || status === 'success'}
              required
              autoComplete="name"
            />
            {errors.fullName && (
              <span id="driver-application-fullName-error" className="field-error" role="alert">
                {errors.fullName}
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
              aria-describedby={errors.email ? 'driver-application-email-error' : undefined}
              placeholder="john@example.com"
              disabled={status === 'submitting' || status === 'success'}
              required
              autoComplete="email"
            />
            {errors.email && (
              <span id="driver-application-email-error" className="field-error" role="alert">
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
              aria-describedby={errors.phone ? 'driver-application-phone-error' : undefined}
              placeholder="+1 (555) 123-4567"
              disabled={status === 'submitting' || status === 'success'}
              required
              autoComplete="tel"
            />
            {errors.phone && (
              <span id="driver-application-phone-error" className="field-error" role="alert">
                {errors.phone}
              </span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="location">
              Location{' '}
              <span className="required" aria-hidden="true">
                *
              </span>
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className={errors.location ? 'error' : ''}
              aria-invalid={errors.location ? true : undefined}
              aria-describedby={errors.location ? 'driver-application-location-error' : undefined}
              placeholder="City, State"
              disabled={status === 'submitting' || status === 'success'}
              required
              autoComplete="address-line1"
            />
            {errors.location && (
              <span id="driver-application-location-error" className="field-error" role="alert">
                {errors.location}
              </span>
            )}
          </div>

          <div className="form-field full-width">
            <label htmlFor="drivingExperience">
              Driving Experience{' '}
              <span className="required" aria-hidden="true">
                *
              </span>
            </label>
            <textarea
              id="drivingExperience"
              name="drivingExperience"
              value={formData.drivingExperience}
              onChange={handleChange}
              className={errors.drivingExperience ? 'error' : ''}
              aria-invalid={errors.drivingExperience ? true : undefined}
              aria-describedby={
                errors.drivingExperience ? 'driver-application-drivingExperience-error' : undefined
              }
              placeholder="Describe your professional driving experience, years, types of vehicles, etc."
              rows={4}
              disabled={status === 'submitting' || status === 'success'}
              required
            />
            {errors.drivingExperience && (
              <span
                id="driver-application-drivingExperience-error"
                className="field-error"
                role="alert"
              >
                {errors.drivingExperience}
              </span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="licenseClass">
              License Class{' '}
              <span className="required" aria-hidden="true">
                *
              </span>
            </label>
            <select
              id="licenseClass"
              name="licenseClass"
              value={formData.licenseClass}
              onChange={handleChange}
              className={errors.licenseClass ? 'error' : ''}
              aria-invalid={errors.licenseClass ? true : undefined}
              aria-describedby={
                errors.licenseClass ? 'driver-application-licenseClass-error' : undefined
              }
              disabled={status === 'submitting' || status === 'success'}
              required
            >
              <option value="">Select license class</option>
              <option value="CDL-A">CDL Class A</option>
              <option value="CDL-B">CDL Class B</option>
              <option value="CDL-C">CDL Class C</option>
              <option value="Class D">Class D (Standard)</option>
              <option value="other">Other</option>
            </select>
            {errors.licenseClass && (
              <span id="driver-application-licenseClass-error" className="field-error" role="alert">
                {errors.licenseClass}
              </span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="availability">
              Availability{' '}
              <span className="required" aria-hidden="true">
                *
              </span>
            </label>
            <input
              type="text"
              id="availability"
              name="availability"
              value={formData.availability}
              onChange={handleChange}
              className={errors.availability ? 'error' : ''}
              aria-invalid={errors.availability ? true : undefined}
              aria-describedby={
                errors.availability ? 'driver-application-availability-error' : undefined
              }
              placeholder="e.g., Mon-Fri 7am-5pm, Weekends available"
              disabled={status === 'submitting' || status === 'success'}
              required
            />
            {errors.availability && (
              <span id="driver-application-availability-error" className="field-error" role="alert">
                {errors.availability}
              </span>
            )}
          </div>

          <div className="form-field full-width">
            <label htmlFor="message">
              Additional Information{' '}
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
              aria-describedby={errors.message ? 'driver-application-message-error' : undefined}
              placeholder="Any additional information you'd like to share (certifications, languages, special training, etc.)"
              rows={4}
              disabled={status === 'submitting' || status === 'success'}
              required
            />
            {errors.message && (
              <span id="driver-application-message-error" className="field-error" role="alert">
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
                  Submitting...
                </>
              ) : (
                <>
                  <Icon name="mail" width={18} />
                  Submit Application
                </>
              )}
            </Button>
            <p className="form-disclaimer">
              <Icon name="award" width={14} height={14} />
              Do not include medical details, identity documents, or other sensitive personal
              information.
            </p>
          </CardFooter>
        )}
      </form>
    </Card>
  );
}
