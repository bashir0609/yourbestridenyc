'use client';

import { useState, useCallback, useEffect, type FormEvent } from 'react';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@yourbestride/ui';
import { transportationInquirySchema, type TransportationInquiryInput } from '@yourbestride/types';
import { Icon } from '@/components/icon';
import { trackEvent } from '@/lib/analytics';

type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

export interface TransportationInquiryFormProps {
  sourcePage: string;
  initialServiceType?: string;
  initialVehicle?: string;
  initialVehicleClass?: string;
  initialPickupArea?: string;
  initialDropoffArea?: string;
  initialMessage?: string;
}

function formatVehicleClassName(raw?: string): string {
  if (!raw) return '';
  const lower = raw.toLowerCase().trim();
  if (lower === 'standard-suv' || lower === 'standard suv') return 'Standard SUV';
  if (lower === 'premium-crossover-suv' || lower === 'premium crossover suv') return 'Premium Crossover SUV';
  return raw.trim();
}

function normalizeServiceType(raw?: string): string {
  if (!raw) return '';
  const lower = raw.toLowerCase().trim();
  if (lower === 'medical' || lower.includes('medical') || lower.includes('healthcare')) return 'medical';
  if (lower === 'airport' || lower.includes('airport') || lower.includes('flight')) return 'airport';
  if (lower === 'corporate' || lower.includes('corporate') || lower.includes('business') || lower === 'roadshow') return 'corporate';
  if (lower === 'private' || lower.includes('private') || lower.includes('chauffeur') || lower.includes('hourly') || lower === 'wedding' || lower === 'mileage') return 'private';
  if (lower === 'other') return 'other';
  return '';
}

function buildInitialMessage(opts: {
  customMessage?: string;
  vehicle?: string;
  vehicleClass?: string;
  route?: string;
  pricingModel?: string;
  packageType?: string;
}): string {
  if (opts.customMessage) return opts.customMessage;

  const vClass = formatVehicleClassName(opts.vehicleClass);

  if (opts.vehicle) {
    return `I would like to request a custom quote for the ${opts.vehicle}${vClass ? ` (${vClass})` : ''} for my upcoming journey.`;
  }
  if (opts.packageType === 'roadshow' || opts.packageType === 'corporate') {
    return 'I would like to request a custom quote for corporate roadshow transportation.';
  }
  if (opts.packageType === 'wedding') {
    return 'I would like to request a custom quote for wedding and celebration transportation.';
  }
  if (opts.packageType === 'meet-greet') {
    return 'I would like to request a custom quote for airport meet & greet transportation service.';
  }
  if (opts.route) {
    return `I am requesting a custom quote for ${opts.route}${vClass ? ` (${vClass})` : ''}.`;
  }
  if (opts.pricingModel === 'hourly') {
    return `I am requesting an hourly charter quote${vClass ? ` for the ${vClass} vehicle class` : ''} (3 hours minimum).`;
  }
  if (opts.pricingModel === 'mileage') {
    return 'I would like to request a custom distance / mileage quote for my planned itinerary.';
  }
  return '';
}

export function TransportationInquiryForm({
  sourcePage,
  initialServiceType = '',
  initialVehicle = '',
  initialVehicleClass = '',
  initialPickupArea = '',
  initialDropoffArea = '',
  initialMessage = '',
}: TransportationInquiryFormProps) {
  const [formData, setFormData] = useState<TransportationInquiryInput>({
    fullName: '',
    email: '',
    phone: '',
    serviceType: normalizeServiceType(initialServiceType),
    pickupArea: initialPickupArea,
    dropoffArea: initialDropoffArea,
    message: buildInitialMessage({
      customMessage: initialMessage,
      vehicle: initialVehicle,
      vehicleClass: initialVehicleClass,
    }),
    preferredDate: '',
    preferredTime: '',
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const applyUrlParams = () => {
      const params = new URLSearchParams(window.location.search);
      if (window.location.hash && window.location.hash.includes('?')) {
        const hashQuery = window.location.hash.split('?')[1];
        if (hashQuery) {
          new URLSearchParams(hashQuery).forEach((val, key) => {
            params.set(key, val);
          });
        }
      }

      const urlService = params.get('service') || params.get('serviceType');
      const urlVehicle = params.get('vehicle');
      const urlClass = params.get('vehicleClass') || params.get('class');
      const urlPickup = params.get('pickup') || params.get('pickupArea');
      const urlDropoff = params.get('dropoff') || params.get('dropoffArea');
      const urlRoute = params.get('route');
      const urlPricingModel = params.get('pricingModel') || params.get('model');
      const urlPackage = params.get('package');
      const urlMessage = params.get('message');

      setFormData((prev) => {
        const normalizedService = urlService ? normalizeServiceType(urlService) : prev.serviceType;
        const newPickup = urlPickup || prev.pickupArea;
        const newDropoff = urlDropoff || prev.dropoffArea;

        const hasAutoMessage =
          !prev.message ||
          prev.message.startsWith('I would like to request') ||
          prev.message.startsWith('I am requesting');

        let newMessage = prev.message;
        if (hasAutoMessage || urlMessage) {
          const generated = buildInitialMessage({
            customMessage: urlMessage || undefined,
            vehicle: urlVehicle || initialVehicle || undefined,
            vehicleClass: urlClass || initialVehicleClass || undefined,
            route: urlRoute || undefined,
            pricingModel: urlPricingModel || undefined,
            packageType: urlPackage || undefined,
          });
          if (generated) newMessage = generated;
        }

        return {
          ...prev,
          serviceType: normalizedService || prev.serviceType,
          pickupArea: newPickup,
          dropoffArea: newDropoff,
          message: newMessage,
        };
      });
    };

    applyUrlParams();
    window.addEventListener('hashchange', applyUrlParams);
    return () => window.removeEventListener('hashchange', applyUrlParams);
  }, [initialVehicle, initialVehicleClass]);
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof TransportationInquiryInput, string>>>(
    {},
  );
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const validateField = useCallback((name: keyof TransportationInquiryInput, value: string) => {
    const fieldSchema = transportationInquirySchema.shape[name];
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
      validateField(name as keyof TransportationInquiryInput, value);
    },
    [validateField],
  );

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage('');

    const result = transportationInquirySchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof TransportationInquiryInput, string>> = {};
      for (const issue of result.error.errors) {
        const path = issue.path[0] as keyof TransportationInquiryInput;
        if (!fieldErrors[path]) {
          fieldErrors[path] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setStatus('submitting');
    try {
      const response = await fetch('/api/inquiries/transportation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: result.data, sourcePage, website }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit inquiry');
      }

      trackEvent('transportation_inquiry_submit', {
        source_page: sourcePage,
        ...(sourcePage.startsWith('/services/') ? { service_page: sourcePage } : {}),
      });
      setStatus('success');
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        serviceType: '',
        pickupArea: '',
        dropoffArea: '',
        message: '',
        preferredDate: '',
        preferredTime: '',
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
    <Card className="transportation-inquiry-form public-form-card">
      <CardHeader className="public-form-header">
        <CardTitle>Request Transportation</CardTitle>
        <CardDescription>
          Fill out the form below and our team will get back to you shortly to discuss your
          transportation needs.
        </CardDescription>
      </CardHeader>

      {status === 'success' && (
        <div className="form-status success" role="status" aria-live="polite">
          <Icon name="check" width={24} height={24} className="status-icon" />
          <p>
            Thank you! Your transportation inquiry has been submitted. We&apos;ll contact you soon.
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
        className="public-form-body"
        onSubmit={handleSubmit}
        noValidate
        aria-label="Transportation inquiry form"
      >
        <div className="form-honeypot" aria-hidden="true">
          <label htmlFor="transportation-website">Website</label>
          <input
            id="transportation-website"
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
              aria-describedby={
                errors.fullName ? 'transportation-inquiry-fullName-error' : undefined
              }
              placeholder="John Doe"
              disabled={status === 'submitting' || status === 'success'}
              required
              autoComplete="name"
            />
            {errors.fullName && (
              <span id="transportation-inquiry-fullName-error" className="field-error" role="alert">
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
              aria-describedby={errors.email ? 'transportation-inquiry-email-error' : undefined}
              placeholder="john@example.com"
              disabled={status === 'submitting' || status === 'success'}
              required
              autoComplete="email"
            />
            {errors.email && (
              <span id="transportation-inquiry-email-error" className="field-error" role="alert">
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
              aria-describedby={errors.phone ? 'transportation-inquiry-phone-error' : undefined}
              placeholder="+1 (555) 123-4567"
              disabled={status === 'submitting' || status === 'success'}
              required
              autoComplete="tel"
            />
            {errors.phone && (
              <span id="transportation-inquiry-phone-error" className="field-error" role="alert">
                {errors.phone}
              </span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="serviceType">
              Service Type{' '}
              <span className="required" aria-hidden="true">
                *
              </span>
            </label>
            <select
              id="serviceType"
              name="serviceType"
              value={formData.serviceType}
              onChange={handleChange}
              className={errors.serviceType ? 'error' : ''}
              aria-invalid={errors.serviceType ? true : undefined}
              aria-describedby={
                errors.serviceType ? 'transportation-inquiry-serviceType-error' : undefined
              }
              disabled={status === 'submitting' || status === 'success'}
              required
            >
              <option value="">Select a service type</option>
              <option value="medical">Medical Transportation</option>
              <option value="airport">Airport Transfers</option>
              <option value="corporate">Corporate Travel</option>
              <option value="private">Private Journeys</option>
              <option value="other">Other</option>
            </select>
            {errors.serviceType && (
              <span
                id="transportation-inquiry-serviceType-error"
                className="field-error"
                role="alert"
              >
                {errors.serviceType}
              </span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="pickupArea">
              Pickup Area{' '}
              <span className="required" aria-hidden="true">
                *
              </span>
            </label>
            <input
              type="text"
              id="pickupArea"
              name="pickupArea"
              value={formData.pickupArea}
              onChange={handleChange}
              className={errors.pickupArea ? 'error' : ''}
              aria-invalid={errors.pickupArea ? true : undefined}
              aria-describedby={
                errors.pickupArea ? 'transportation-inquiry-pickupArea-error' : undefined
              }
              placeholder="e.g., Manhattan, NY"
              disabled={status === 'submitting' || status === 'success'}
              required
              autoComplete="address-line1"
            />
            {errors.pickupArea && (
              <span
                id="transportation-inquiry-pickupArea-error"
                className="field-error"
                role="alert"
              >
                {errors.pickupArea}
              </span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="dropoffArea">
              Dropoff Area{' '}
              <span className="required" aria-hidden="true">
                *
              </span>
            </label>
            <input
              type="text"
              id="dropoffArea"
              name="dropoffArea"
              value={formData.dropoffArea}
              onChange={handleChange}
              className={errors.dropoffArea ? 'error' : ''}
              aria-invalid={errors.dropoffArea ? true : undefined}
              aria-describedby={
                errors.dropoffArea ? 'transportation-inquiry-dropoffArea-error' : undefined
              }
              placeholder="e.g., JFK Airport, NY"
              disabled={status === 'submitting' || status === 'success'}
              required
              autoComplete="address-line2"
            />
            {errors.dropoffArea && (
              <span
                id="transportation-inquiry-dropoffArea-error"
                className="field-error"
                role="alert"
              >
                {errors.dropoffArea}
              </span>
            )}
          </div>

          <div className="form-field full-width">
            <label htmlFor="preferredDate">Preferred Date (Optional)</label>
            <input
              type="date"
              id="preferredDate"
              name="preferredDate"
              value={formData.preferredDate}
              onChange={handleChange}
              className={errors.preferredDate ? 'error' : ''}
              aria-invalid={errors.preferredDate ? true : undefined}
              aria-describedby={
                errors.preferredDate ? 'transportation-inquiry-preferredDate-error' : undefined
              }
              disabled={status === 'submitting' || status === 'success'}
              min={new Date().toISOString().split('T')[0]}
            />
            {errors.preferredDate && (
              <span
                id="transportation-inquiry-preferredDate-error"
                className="field-error"
                role="alert"
              >
                {errors.preferredDate}
              </span>
            )}
          </div>

          <div className="form-field full-width">
            <label htmlFor="preferredTime">Preferred Time (Optional)</label>
            <input
              type="time"
              id="preferredTime"
              name="preferredTime"
              value={formData.preferredTime}
              onChange={handleChange}
              className={errors.preferredTime ? 'error' : ''}
              aria-invalid={errors.preferredTime ? true : undefined}
              aria-describedby={
                errors.preferredTime ? 'transportation-inquiry-preferredTime-error' : undefined
              }
              disabled={status === 'submitting' || status === 'success'}
            />
            {errors.preferredTime && (
              <span
                id="transportation-inquiry-preferredTime-error"
                className="field-error"
                role="alert"
              >
                {errors.preferredTime}
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
              aria-describedby={errors.message ? 'transportation-inquiry-message-error' : undefined}
              placeholder="Please describe your transportation needs, any special requirements, or questions..."
              rows={5}
              disabled={status === 'submitting' || status === 'success'}
              required
            />
            {errors.message && (
              <span id="transportation-inquiry-message-error" className="field-error" role="alert">
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
                  Submit Inquiry
                </>
              )}
            </Button>
            <p className="form-disclaimer">
              <Icon name="check" width={14} height={14} />
              Please do not include medical details or other sensitive personal information.
            </p>
          </CardFooter>
        )}
      </form>
    </Card>
  );
}
