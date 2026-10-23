'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/icon';
import { TrackLink } from '@/components/analytics';
import {
  isRouteMatchingOriginLocation,
  resolveLocationDisplayName,
  isRouteMatchingVehicleClass,
  isHourlyMatchingVehicleClass,
  resolveVehicleClassDisplayName,
} from '@/lib/cms/pricing-rules';
import type {
  FeeRuleEntry,
  FixedRouteEntry,
  HourlyCharterEntry,
  MileagePolicyEntry,
  PricingSettingsView,
  VehicleClassCard,
} from '@/lib/cms/pricing-types';

type TabKey = 'fixed' | 'hourly' | 'mileage' | 'custom';

interface RatesAndOptionsTabsProps {
  vehicleClasses: VehicleClassCard[];
  fixedRoutes: FixedRouteEntry[];
  hourlyCharters: HourlyCharterEntry[];
  mileagePolicies: MileagePolicyEntry[];
  applicableFees: FeeRuleEntry[];
  settings: PricingSettingsView;
  initialTab?: string;
  initialLocation?: string;
  initialVehicleClass?: string;
}

function getInitialTab(): TabKey {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'airport' || tabParam === 'fixed') {
      return 'fixed';
    }
    if (tabParam === 'hourly' || tabParam === 'mileage' || tabParam === 'custom') {
      return tabParam;
    }
  }
  return 'fixed';
}

function getInitialVehicleClass(): string | null {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    return params.get('vehicleClass');
  }
  return null;
}

function getInitialLocation(): string | null {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    return params.get('location');
  }
  return null;
}

export function RatesAndOptionsTabs({
  vehicleClasses,
  fixedRoutes,
  hourlyCharters,
  mileagePolicies,
  applicableFees,
  settings,
  initialTab,
  initialLocation,
  initialVehicleClass,
}: RatesAndOptionsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    if (initialTab === 'airport' || initialTab === 'fixed') return 'fixed';
    if (initialTab === 'hourly' || initialTab === 'mileage' || initialTab === 'custom')
      return initialTab;
    return getInitialTab();
  });
  const [selectedVehicleClass, setSelectedVehicleClass] = useState<string | null>(() => {
    if (typeof initialVehicleClass === 'string' && initialVehicleClass.trim()) {
      return initialVehicleClass.trim();
    }
    return getInitialVehicleClass();
  });
  const [selectedLocation, setSelectedLocation] = useState<string | null>(() => {
    if (typeof initialLocation === 'string' && initialLocation.trim()) {
      return initialLocation.trim();
    }
    return getInitialLocation();
  });

  const highlightedClass = selectedVehicleClass;

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'airport' || tabParam === 'fixed') {
        setActiveTab('fixed');
      } else if (tabParam === 'hourly' || tabParam === 'mileage' || tabParam === 'custom') {
        setActiveTab(tabParam);
      }
      setSelectedVehicleClass(params.get('vehicleClass'));
      setSelectedLocation(params.get('location'));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleClearLocationFilter = () => {
    setSelectedLocation(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('location');
      window.history.replaceState(null, '', url.toString());
    }
  };

  const handleClearVehicleClassFilter = () => {
    setSelectedVehicleClass(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('vehicleClass');
      window.history.replaceState(null, '', url.toString());
    }
  };

  const handleClearAllFilters = () => {
    setSelectedLocation(null);
    setSelectedVehicleClass(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('location');
      url.searchParams.delete('vehicleClass');
      window.history.replaceState(null, '', url.toString());
    }
  };

  const displayedFixedRoutes = fixedRoutes.filter((route) => {
    const matchesLocation =
      !selectedLocation || isRouteMatchingOriginLocation(route, selectedLocation);
    const matchesClass =
      !selectedVehicleClass || isRouteMatchingVehicleClass(route, selectedVehicleClass);
    return matchesLocation && matchesClass;
  });

  const displayedHourlyCharters = hourlyCharters.filter((charter) => {
    return !selectedVehicleClass || isHourlyMatchingVehicleClass(charter, selectedVehicleClass);
  });

  const locationDisplayName = resolveLocationDisplayName(selectedLocation, fixedRoutes);
  const vehicleClassDisplayName = resolveVehicleClassDisplayName(
    selectedVehicleClass,
    vehicleClasses,
  );

  const handleTabChange = (key: TabKey) => {
    setActiveTab(key);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', key);
      window.history.replaceState(null, '', url.toString());
    }
  };

  const tabs: Array<{ key: TabKey; label: string; icon: string }> = [
    { key: 'fixed', label: 'Airport & Fixed Routes', icon: 'airport' },
    { key: 'hourly', label: 'Hourly Charters', icon: 'corporate' },
    { key: 'mileage', label: 'Mileage Quotations', icon: 'private' },
    { key: 'custom', label: 'Custom & Event Packages', icon: 'medical' },
  ];

  return (
    <div className="rates-tabs-container">
      {/* Tab Navigation */}
      <div className="rates-tab-nav" role="tablist" aria-label="Pricing and Tariff Options">
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              id={`tab-${tab.key}`}
              aria-selected={isSelected}
              aria-controls={`panel-${tab.key}`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => handleTabChange(tab.key)}
              className={`rates-tab-btn ${isSelected ? 'active' : ''}`}
            >
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="rates-tab-content">
        {/* 1. Fixed Route Transfers Panel */}
        {activeTab === 'fixed' && (
          <div
            id="panel-fixed"
            role="tabpanel"
            aria-labelledby="tab-fixed"
            className="rates-tab-panel"
          >
            <div className="rates-panel-header">
              <div>
                <h2>Airport & Point-to-Point Flat Rates</h2>
                <p>
                  Predictable, upfront flat-rate pricing for all major New York metropolitan
                  airports (JFK, LGA, EWR) and regional transfer corridors.
                </p>
              </div>
              <div className="rates-header-action rates-header-actions-group">
                <a
                  href="/rates-and-options?service=airport#rates-inquiry"
                  className="button button-secondary"
                >
                  Request a Custom Quote
                </a>
                <TrackLink
                  href="/book"
                  className="button button-gold"
                  eventName="booking_click"
                  eventParams={{
                    source_page: '/rates-and-options',
                    button_location: 'fixed_header',
                  }}
                >
                  Check Availability & Book <Icon name="arrow" width={16} />
                </TrackLink>
              </div>
            </div>

            {(selectedLocation || selectedVehicleClass) && (
              <div className="location-filter-banner">
                <div className="location-filter-info">
                  {selectedLocation && (
                    <span style={{ marginRight: selectedVehicleClass ? '14px' : '0' }}>
                      <span className="location-filter-label">Filtered by Location:</span>{' '}
                      <strong>{locationDisplayName}</strong>
                    </span>
                  )}
                  {selectedVehicleClass && (
                    <span>
                      <span className="location-filter-label">Vehicle Class:</span>{' '}
                      <strong>{vehicleClassDisplayName}</strong>
                    </span>
                  )}
                  {displayedFixedRoutes.length > 0 && (
                    <span className="location-filter-count">
                      {' '}
                      ({displayedFixedRoutes.length} route
                      {displayedFixedRoutes.length === 1 ? '' : 's'})
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={
                    selectedLocation && !selectedVehicleClass
                      ? handleClearLocationFilter
                      : !selectedLocation && selectedVehicleClass
                        ? handleClearVehicleClassFilter
                        : handleClearAllFilters
                  }
                  className="clear-location-filter-btn"
                  aria-label="Clear location filter"
                >
                  Show All Locations &times;
                </button>
              </div>
            )}

            {displayedFixedRoutes.length > 0 ? (
              <div className="rates-table-wrapper">
                <table className="rates-comparison-table">
                  <thead>
                    <tr>
                      <th scope="col">Route / Corridor</th>
                      <th scope="col">Vehicle Class</th>
                      <th scope="col">Starting Rate</th>
                      <th scope="col">Inclusions & Conditions</th>
                      <th scope="col" className="text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedFixedRoutes.map((route) => {
                      const isHighlighted = Boolean(
                        highlightedClass &&
                          (route.vehicleClassName.toLowerCase() ===
                            highlightedClass.toLowerCase() ||
                            route.vehicleClassSlug?.toLowerCase() ===
                              highlightedClass.toLowerCase()),
                      );
                      return (
                        <tr
                          key={route.id}
                          className={isHighlighted ? 'highlighted-rate-row' : undefined}
                        >
                          <td className="font-semibold">
                            <div className="route-name">{route.routeLabel}</div>
                            <div className="route-endpoints text-muted">
                              {route.originZone} ↔ {route.destinationZone}
                            </div>
                          </td>
                          <td>
                            <span className="vehicle-class-pill">{route.vehicleClassName}</span>
                          </td>
                          <td className="rate-amount">
                            ${route.flatRate.toFixed(2)}
                            {route.additionalStopFee && (
                              <div className="rate-addon-note text-muted">
                                En-route stops: quoted on request (est. ${route.additionalStopFee},
                                pending LA confirmation)
                              </div>
                            )}
                          </td>
                          <td className="rate-notes">
                            {route.notes || 'Includes flight tracking & standard grace period.'}
                          </td>
                          <td className="text-right">
                            <div className="table-actions-cell">
                              <TrackLink
                                href="/book"
                                className="button button-small button-gold"
                                eventName="booking_click"
                                eventParams={{
                                  source_page: '/rates-and-options',
                                  button_location: 'fixed_route_row',
                                }}
                              >
                                Book Now
                              </TrackLink>
                              <a
                                href={`/rates-and-options?service=airport&route=${encodeURIComponent(route.routeLabel)}&vehicleClass=${encodeURIComponent(route.vehicleClassName)}&pickup=${encodeURIComponent(route.originZone)}&dropoff=${encodeURIComponent(route.destinationZone)}#rates-inquiry`}
                                className="button button-small button-secondary"
                              >
                                Request a Custom Quote
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : selectedLocation || selectedVehicleClass ? (
              <div className="rates-empty-card">
                <div className="rates-empty-icon">
                  <Icon name="airport" width={28} height={28} />
                </div>
                <h3>
                  No Published Routes for{' '}
                  {selectedVehicleClass && selectedLocation
                    ? `${vehicleClassDisplayName} from ${locationDisplayName}`
                    : selectedVehicleClass
                      ? vehicleClassDisplayName
                      : locationDisplayName}
                </h3>
                <p>
                  No published route rates are currently available for{' '}
                  {selectedLocation && selectedVehicleClass
                    ? `${vehicleClassDisplayName} departing from ${locationDisplayName}`
                    : selectedLocation
                      ? locationDisplayName
                      : vehicleClassDisplayName}
                  . Request a Custom Quote.
                </p>
                <div className="rates-empty-actions">
                  <button
                    type="button"
                    onClick={
                      selectedLocation && !selectedVehicleClass
                        ? handleClearLocationFilter
                        : !selectedLocation && selectedVehicleClass
                          ? handleClearVehicleClassFilter
                          : handleClearAllFilters
                    }
                    className="button button-gold"
                  >
                    View All Published Routes
                  </button>
                  <a
                    href={`/rates-and-options?${selectedVehicleClass ? `vehicleClass=${encodeURIComponent(selectedVehicleClass)}&` : ''}${selectedLocation ? `location=${encodeURIComponent(selectedLocation)}&` : ''}#rates-inquiry`}
                    className="button button-secondary"
                  >
                    Request a Custom Quote
                  </a>
                  <TrackLink
                    href="/book"
                    className="button button-secondary"
                    eventName="booking_click"
                    eventParams={{
                      source_page: '/rates-and-options',
                      button_location: 'fixed_location_empty_cta',
                    }}
                  >
                    Check Availability & Book <Icon name="arrow" width={16} />
                  </TrackLink>
                </div>
              </div>
            ) : (
              <div className="rates-empty-card">
                <div className="rates-empty-icon">
                  <Icon name="airport" width={28} height={28} />
                </div>
                <h3>Standard Fixed Airport Tariffs</h3>
                <p>
                  Our fixed-rate airport transfers between JFK, LGA, EWR and New York destinations
                  are managed dynamically by vehicle class. Final fare confirmed during booking. For
                  customized routes or corporate accounts, request a custom quote below.
                </p>
                <div className="rates-empty-actions">
                  <a
                    href="/rates-and-options?service=airport#rates-inquiry"
                    className="button button-gold"
                  >
                    Request a Custom Quote <Icon name="arrow" width={16} />
                  </a>
                  <TrackLink
                    href="/book"
                    className="button button-secondary"
                    eventName="booking_click"
                    eventParams={{
                      source_page: '/rates-and-options',
                      button_location: 'fixed_empty_cta',
                    }}
                  >
                    Check Availability & Book <Icon name="arrow" width={16} />
                  </TrackLink>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. Hourly Charters Panel */}
        {activeTab === 'hourly' && (
          <div
            id="panel-hourly"
            role="tabpanel"
            aria-labelledby="tab-hourly"
            className="rates-tab-panel"
          >
            <div className="rates-panel-header">
              <div>
                <h2>Hourly As-Directed Charters</h2>
                <p>
                  Complete flexibility for executive roadshows, personal itineraries, shopping
                  excursions, and special events. Dedicated chauffeur at your disposal.
                </p>
              </div>
              <div className="rates-header-action rates-header-actions-group">
                <a
                  href="/rates-and-options?service=corporate&pricingModel=hourly#rates-inquiry"
                  className="button button-secondary"
                >
                  Request a Custom Quote
                </a>
                <TrackLink
                  href="/book"
                  className="button button-gold"
                  eventName="booking_click"
                  eventParams={{
                    source_page: '/rates-and-options',
                    button_location: 'hourly_header',
                  }}
                >
                  Check Availability & Book <Icon name="arrow" width={16} />
                </TrackLink>
              </div>
            </div>

            {selectedVehicleClass && (
              <div className="location-filter-banner" style={{ marginBottom: '24px' }}>
                <div className="location-filter-info">
                  <span className="location-filter-label">Filtered by Vehicle Class:</span>{' '}
                  <strong>{vehicleClassDisplayName}</strong>
                </div>
                <button
                  type="button"
                  onClick={handleClearVehicleClassFilter}
                  className="clear-location-filter-btn"
                  aria-label="Clear vehicle class filter"
                >
                  Show All Vehicle Classes &times;
                </button>
              </div>
            )}

            {displayedHourlyCharters.length > 0 ? (
              <div className="rates-table-wrapper">
                <table className="rates-comparison-table">
                  <thead>
                    <tr>
                      <th scope="col">Vehicle Class</th>
                      <th scope="col">Hourly Rate</th>
                      <th scope="col">Minimum Booking Hours</th>
                      <th scope="col">Minimum Booking Subtotal</th>
                      <th scope="col">Overtime Terms</th>
                      <th scope="col" className="text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedHourlyCharters.map((charter) => {
                      const minSubtotal =
                        typeof charter.minimumSubtotal === 'number'
                          ? charter.minimumSubtotal
                          : charter.hourlyRate * charter.minimumHours;
                      const isHighlighted = Boolean(
                        highlightedClass &&
                          (charter.vehicleClassName.toLowerCase() ===
                            highlightedClass.toLowerCase() ||
                            charter.vehicleClassSlug?.toLowerCase() ===
                              highlightedClass.toLowerCase()),
                      );

                      return (
                        <tr
                          key={charter.id}
                          className={isHighlighted ? 'highlighted-rate-row' : undefined}
                        >
                          <td className="font-semibold">
                            <span className="vehicle-class-pill">{charter.vehicleClassName}</span>
                          </td>
                          <td className="rate-amount">
                            ${charter.hourlyRate.toFixed(2)}
                            <span className="rate-unit">/hour</span>
                          </td>
                          <td>{charter.minimumHours} Hours Minimum</td>
                          <td className="rate-amount">
                            ${minSubtotal.toFixed(2)}
                            <div className="rate-addon-note text-muted">Base charter floor</div>
                          </td>
                          <td className="rate-notes">
                            {charter.overtimeRate
                              ? `$${charter.overtimeRate}/hr (billed in ${charter.overtimeIncrementMinutes}m increments)`
                              : `Billed in ${charter.overtimeIncrementMinutes}m increments at base hourly rate.`}
                          </td>
                          <td className="text-right">
                            <div className="table-actions-cell">
                              <TrackLink
                                href="/book"
                                className="button button-small button-gold"
                                eventName="booking_click"
                                eventParams={{
                                  source_page: '/rates-and-options',
                                  button_location: 'hourly_charter_row',
                                }}
                              >
                                Book Now
                              </TrackLink>
                              <a
                                href={`/rates-and-options?service=corporate&pricingModel=hourly&vehicleClass=${encodeURIComponent(charter.vehicleClassName)}#rates-inquiry`}
                                className="button button-small button-secondary"
                              >
                                Request Quote
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : selectedVehicleClass ? (
              <div className="rates-empty-card">
                <div className="rates-empty-icon">
                  <Icon name="corporate" width={28} height={28} />
                </div>
                <h3>No Published Hourly Rates for {vehicleClassDisplayName}</h3>
                <p>
                  Hourly charter rates for {vehicleClassDisplayName} are currently quoted on
                  request. Dedicated chauffeur service is available for bespoke itineraries. Request
                  a Custom Quote.
                </p>
                <div className="rates-empty-actions">
                  <button
                    type="button"
                    onClick={handleClearVehicleClassFilter}
                    className="button button-gold"
                  >
                    View All Hourly Charters
                  </button>
                  <a
                    href={`/rates-and-options?service=corporate&pricingModel=hourly&vehicleClass=${encodeURIComponent(selectedVehicleClass)}#rates-inquiry`}
                    className="button button-secondary"
                  >
                    Request a Custom Quote
                  </a>
                  <TrackLink
                    href="/book"
                    className="button button-secondary"
                    eventName="booking_click"
                    eventParams={{
                      source_page: '/rates-and-options',
                      button_location: 'hourly_class_empty_cta',
                    }}
                  >
                    Check Availability & Book <Icon name="arrow" width={16} />
                  </TrackLink>
                </div>
              </div>
            ) : (
              <div className="rates-empty-card">
                <div className="rates-empty-icon">
                  <Icon name="corporate" width={28} height={28} />
                </div>
                <h3>Dedicated Chauffeur Hourly Charters</h3>
                <p>
                  As-directed hourly charters include dedicated chauffeur service, in-city travel,
                  and complimentary amenities. Final fare confirmed during booking. For customized
                  itineraries, request a custom quote below.
                </p>
                <div className="rates-empty-actions">
                  <a
                    href="/rates-and-options?service=corporate&pricingModel=hourly#rates-inquiry"
                    className="button button-gold"
                  >
                    Request a Custom Quote <Icon name="arrow" width={16} />
                  </a>
                  <TrackLink
                    href="/book"
                    className="button button-secondary"
                    eventName="booking_click"
                    eventParams={{
                      source_page: '/rates-and-options',
                      button_location: 'hourly_empty_cta',
                    }}
                  >
                    Check Availability & Book <Icon name="arrow" width={16} />
                  </TrackLink>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. Mileage Quotations Panel */}
        {activeTab === 'mileage' && (
          <div
            id="panel-mileage"
            role="tabpanel"
            aria-labelledby="tab-mileage"
            className="rates-tab-panel"
          >
            <div className="rates-panel-header">
              <div>
                <h2>Distance & Mileage-Based Pricing</h2>
                <p>
                  Tailored point-to-point journeys outside our primary flat-rate airport corridors
                  are calculated using verified dispatched route miles, staging requirements, and
                  travel conditions.
                </p>
              </div>
            </div>

            {mileagePolicies.length > 0 && (
              <div className="rates-table-wrapper" style={{ marginBottom: '24px' }}>
                <table className="rates-comparison-table">
                  <thead>
                    <tr>
                      <th scope="col">Vehicle Class</th>
                      <th scope="col">Base Dispatch</th>
                      <th scope="col">Per-Mile Rate</th>
                      <th scope="col">Minimum Fare</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mileagePolicies.map((pol) => (
                      <tr key={pol.id}>
                        <td>
                          <span className="vehicle-class-pill">{pol.vehicleClassName}</span>
                        </td>
                        <td>{pol.baseFare ? `$${pol.baseFare.toFixed(2)}` : 'Included'}</td>
                        <td>
                          {pol.perMileRate ? `$${pol.perMileRate.toFixed(2)} / mi` : 'Custom Quote'}
                        </td>
                        <td>{pol.minimumFare ? `$${pol.minimumFare.toFixed(2)}` : 'None'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mileage-info-grid">
              <div className="mileage-policy-card">
                <h3>How Mileage Fares Are Formulated</h3>
                <ul className="mileage-steps-list">
                  <li>
                    <strong>Flag Drop / Base Dispatch:</strong> Initial administrative and vehicle
                    staging component.
                  </li>
                  <li>
                    <strong>Per-Mile Route Distance:</strong> Calculated via verified commercial
                    routing for the exact itinerary.
                  </li>
                  <li>
                    <strong>Deadhead & Return Threshold:</strong> For one-way trips extending beyond
                    the standard service radius (typically beyond 35 miles), a return staging
                    component applies.
                  </li>
                  <li>
                    <strong>Waiting & Layover Terms:</strong> Standard grace periods apply at
                    pickups; layovers are billed at the applicable vehicle-class hourly rate.
                  </li>
                </ul>
              </div>

              <div className="mileage-quote-card">
                <p className="eyebrow">CUSTOM FARE ESTIMATION</p>
                <h3>Request a Custom Mileage Quote</h3>
                <p>
                  Because route traffic, bridge crossings, and staging conditions vary, final fares
                  are confirmed during booking or via custom inquiry.
                </p>
                <div className="mileage-card-actions">
                  <a
                    href="/rates-and-options?service=private&pricingModel=mileage#rates-inquiry"
                    className="button button-gold"
                  >
                    Request a Custom Quote <Icon name="arrow" width={16} />
                  </a>
                  <TrackLink
                    href="/book"
                    className="button button-secondary"
                    eventName="booking_click"
                    eventParams={{
                      source_page: '/rates-and-options',
                      button_location: 'mileage_cta',
                    }}
                  >
                    Check Availability & Book <Icon name="arrow" width={16} />
                  </TrackLink>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. Custom & Event Packages Panel */}
        {activeTab === 'custom' && (
          <div
            id="panel-custom"
            role="tabpanel"
            aria-labelledby="tab-custom"
            className="rates-tab-panel"
          >
            <div className="rates-panel-header">
              <div>
                <h2>Custom Itineraries & Event Delegations</h2>
                <p>
                  Tailored transportation coordination for corporate roadshows, wedding parties,
                  executive conferences, and multi-vehicle delegations.
                </p>
              </div>
            </div>

            <div className="custom-packages-grid">
              <article className="custom-package-card">
                <h3>Corporate Roadshows</h3>
                <p>
                  Multi-stop Manhattan and tri-state financial itineraries. Real-time coordinator
                  updates, discrete executive service, and continuous chauffeur availability.
                </p>
                <a
                  href="/rates-and-options?service=corporate&package=roadshow#rates-inquiry"
                  className="button button-secondary button-small"
                >
                  Request a Custom Quote <Icon name="arrow" width={14} />
                </a>
              </article>

              <article className="custom-package-card">
                <h3>Weddings & Special Celebrations</h3>
                <p>
                  Impeccably detailed luxury crossovers and executive SUVs for bridal parties, VIP
                  guests, and seamless venue shuttles throughout New York and Long Island.
                </p>
                <a
                  href="/rates-and-options?service=private&package=wedding#rates-inquiry"
                  className="button button-secondary button-small"
                >
                  Request a Custom Quote <Icon name="arrow" width={14} />
                </a>
              </article>

              <article className="custom-package-card">
                <h3>Airport Meet & Greet</h3>
                <p>
                  VIP baggage claim reception, luggage assistance, and escort to vehicle staging at
                  JFK, LGA, EWR, and Westchester County Airport.
                </p>
                <div className="custom-card-actions">
                  <a
                    href="/rates-and-options?service=airport&package=meet-greet#rates-inquiry"
                    className="button button-secondary button-small"
                  >
                    Request a Custom Quote <Icon name="arrow" width={14} />
                  </a>
                  <TrackLink
                    href="/book"
                    className="text-link"
                    eventName="booking_click"
                    eventParams={{
                      source_page: '/rates-and-options',
                      button_location: 'custom_vip_link',
                    }}
                  >
                    Check Availability & Book <Icon name="arrow" width={14} />
                  </TrackLink>
                </div>
              </article>
            </div>
          </div>
        )}
      </div>

      {/* Vehicle Class Overview Strip */}
      {vehicleClasses.length > 0 && (
        <div className="rates-vehicle-classes-strip">
          <div className="strip-heading">
            <p className="eyebrow">OUR FLEET CLASSES</p>
            <h3>Standardized Vehicle Classes</h3>
          </div>
          <div className="vehicle-classes-grid">
            {vehicleClasses.map((vClass) => (
              <div key={vClass.id} className="vehicle-class-summary-card">
                <h4>{vClass.name}</h4>
                <div className="class-capacity-indicators">
                  <span>
                    <Icon name="users" width={16} height={16} /> {vClass.passengerCapacity}{' '}
                    Passengers
                  </span>
                  {vClass.luggageCapacity && (
                    <span>
                      <Icon name="luggage" width={16} height={16} /> {vClass.luggageCapacity}{' '}
                      Luggage
                    </span>
                  )}
                </div>
                {vClass.summary && <p className="class-summary">{vClass.summary}</p>}
                <div className="vehicle-class-card-actions">
                  <button
                    type="button"
                    onClick={() => handleTabChange('hourly')}
                    className="button button-outline button-small"
                  >
                    View Hourly Rates
                  </button>
                  <a
                    href={`/rates-and-options?vehicleClass=${encodeURIComponent(vClass.name)}#rates-inquiry`}
                    className="button button-secondary button-small"
                  >
                    Request Quote
                  </a>
                  <Link href="/fleet" className="text-link vehicle-class-fleet-link">
                    View vehicles <Icon name="arrow" width={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclosures & Regulatory Notices */}
      <div className="rates-disclosures-section">
        <h3>Fare Disclosures & Regulatory Policies</h3>
        <div className="disclosures-grid">
          <div className="disclosure-item">
            <h4>NYS Congestion Surcharge</h4>
            <p>
              In compliance with NYS Tax Law § 1281, a statutory surcharge applies to chauffeured
              and for-hire transportation trips that begin, end, or pass through Manhattan south of
              96th Street.
            </p>
          </div>
          <div className="disclosure-item">
            <h4>MTA Central Business District Tolling</h4>
            <p>
              Under MTA Congestion Relief Zone regulations, per-trip charges apply to qualifying
              commercial for-hire vehicles entering the Manhattan CBD zone south of 60th Street.
            </p>
          </div>
          <div className="disclosure-item">
            <h4>Port Authority Airport Access</h4>
            <p>
              Official Port Authority of NY & NJ airport ground transportation access fees apply to
              commercial pickups at JFK, LGA, and EWR international airports.
            </p>
          </div>
          <div className="disclosure-item">
            <h4>Sales Tax Policy</h4>
            <p>{settings.defaultTaxNote || 'Rates exclude local sales tax where applicable.'}</p>
          </div>
          <div className="disclosure-item">
            <h4>Single Customer Tariff</h4>
            <p>
              {settings.affiliateTariffNote ||
                'Your Best Ride maintains a single universal customer tariff. All chauffeured rides fulfilled through our certified affiliate network are billed at published company rates.'}
            </p>
          </div>
          {settings.generalDisclosureText && (
            <div className="disclosure-item">
              <h4>General Tariff Policy</h4>
              <p>{settings.generalDisclosureText}</p>
            </div>
          )}
          {applicableFees.map((fee) => (
            <div key={fee.id} className="disclosure-item">
              <h4>{fee.feeName}</h4>
              <p>
                {fee.customerDisclosure ||
                  `${fee.billingType === 'percentage' ? `${fee.amount}%` : fee.amount ? `$${fee.amount.toFixed(2)}` : ''} applied according to operational and route terms.`}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
