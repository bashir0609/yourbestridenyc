'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/icon';
import { TrackLink } from '@/components/analytics';
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
}

export function RatesAndOptionsTabs({
  vehicleClasses,
  fixedRoutes,
  hourlyCharters,
  mileagePolicies,
  applicableFees,
  settings,
}: RatesAndOptionsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('fixed');

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
              onClick={() => setActiveTab(tab.key)}
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
                  Predictable, upfront flat-rate pricing for all major New York metropolitan airports
                  (JFK, LGA, EWR) and regional transfer corridors.
                </p>
              </div>
              <div className="rates-header-action">
                <TrackLink
                  href="/book"
                  className="button button-gold"
                  eventName="booking_click"
                  eventParams={{ source_page: '/rates-and-options', button_location: 'fixed_header' }}
                >
                  Book Instant Transfer <Icon name="arrow" width={16} />
                </TrackLink>
              </div>
            </div>

            {fixedRoutes.length > 0 ? (
              <div className="rates-table-wrapper">
                <table className="rates-comparison-table">
                  <thead>
                    <tr>
                      <th scope="col">Route / Corridor</th>
                      <th scope="col">Vehicle Class</th>
                      <th scope="col">Starting Rate</th>
                      <th scope="col">Inclusions & Conditions</th>
                      <th scope="col" className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fixedRoutes.map((route) => (
                      <tr key={route.id}>
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
                              +${route.additionalStopFee} per additional stop
                            </div>
                          )}
                        </td>
                        <td className="rate-notes">
                          {route.notes || 'Includes flight tracking & standard grace period.'}
                        </td>
                        <td className="text-right">
                          <TrackLink
                            href="/book"
                            className="button button-small"
                            eventName="booking_click"
                            eventParams={{
                              source_page: '/rates-and-options',
                              button_location: 'fixed_route_row',
                            }}
                          >
                            Reserve
                          </TrackLink>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rates-empty-card">
                <div className="rates-empty-icon">
                  <Icon name="airport" width={28} height={28} />
                </div>
                <h3>Standard Fixed Airport Tariffs</h3>
                <p>
                  Our fixed-rate airport transfers between JFK, LGA, EWR and New York destinations are
                  managed dynamically by vehicle class. Because pricing varies with vehicle availability and
                  scheduled flight windows, instant binding fares are calculated via our reservation system.
                </p>
                <div className="rates-empty-actions">
                  <TrackLink
                    href="/book"
                    className="button button-gold"
                    eventName="booking_click"
                    eventParams={{ source_page: '/rates-and-options', button_location: 'fixed_empty_cta' }}
                  >
                    Calculate Airport Fare in ORES <Icon name="arrow" width={16} />
                  </TrackLink>
                  <a href="#rates-inquiry" className="button button-secondary">
                    Request Route Quote
                  </a>
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
                  Complete flexibility for executive roadshows, personal itineraries, shopping excursions,
                  and special events. Dedicated chauffeur at your disposal.
                </p>
              </div>
              <div className="rates-header-action">
                <TrackLink
                  href="/book"
                  className="button button-gold"
                  eventName="booking_click"
                  eventParams={{ source_page: '/rates-and-options', button_location: 'hourly_header' }}
                >
                  Book As-Directed Ride <Icon name="arrow" width={16} />
                </TrackLink>
              </div>
            </div>

            {hourlyCharters.length > 0 ? (
              <div className="rates-table-wrapper">
                <table className="rates-comparison-table">
                  <thead>
                    <tr>
                      <th scope="col">Vehicle Class</th>
                      <th scope="col">Hourly Rate</th>
                      <th scope="col">Minimum Booking Hours</th>
                      <th scope="col">Minimum Booking Subtotal</th>
                      <th scope="col">Overtime Terms</th>
                      <th scope="col" className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hourlyCharters.map((charter) => {
                      const minSubtotal =
                        typeof charter.minimumSubtotal === 'number'
                          ? charter.minimumSubtotal
                          : charter.hourlyRate * charter.minimumHours;

                      return (
                        <tr key={charter.id}>
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
                            <TrackLink
                              href="/book"
                              className="button button-small"
                              eventName="booking_click"
                              eventParams={{
                                source_page: '/rates-and-options',
                                button_location: 'hourly_charter_row',
                              }}
                            >
                              Reserve
                            </TrackLink>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rates-empty-card">
                <div className="rates-empty-icon">
                  <Icon name="corporate" width={28} height={28} />
                </div>
                <h3>Dedicated Chauffeur Hourly Charters</h3>
                <p>
                  As-directed hourly charters include dedicated chauffeur service, in-city travel, and
                  complimentary amenities. Standard charter minimums begin at 2 to 3 hours depending on the
                  selected vehicle class.
                </p>
                <div className="rates-empty-actions">
                  <TrackLink
                    href="/book"
                    className="button button-gold"
                    eventName="booking_click"
                    eventParams={{ source_page: '/rates-and-options', button_location: 'hourly_empty_cta' }}
                  >
                    Check Hourly Availability <Icon name="arrow" width={16} />
                  </TrackLink>
                  <a href="#rates-inquiry" className="button button-secondary">
                    Request Custom Charter
                  </a>
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
                  Tailored point-to-point journeys outside our primary flat-rate airport corridors are
                  calculated using verified dispatched route miles, staging requirements, and travel conditions.
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
                        <td>{pol.perMileRate ? `$${pol.perMileRate.toFixed(2)} / mi` : 'Custom Quote'}</td>
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
                    <strong>Flag Drop / Base Dispatch:</strong> Initial administrative and vehicle staging
                    component.
                  </li>
                  <li>
                    <strong>Per-Mile Route Distance:</strong> Calculated via verified commercial routing for the
                    exact itinerary.
                  </li>
                  <li>
                    <strong>Deadhead & Return Threshold:</strong> For one-way trips extending beyond the standard
                    service radius (typically beyond 35 miles), a return staging component applies.
                  </li>
                  <li>
                    <strong>Waiting & Layover Terms:</strong> Standard grace periods apply at pickups; layovers
                    are billed at the applicable vehicle-class hourly rate.
                  </li>
                </ul>
              </div>

              <div className="mileage-quote-card">
                <p className="eyebrow">OBTAIN A GUARANTEED QUOTE</p>
                <h3>Request an Exact Mileage Quote</h3>
                <p>
                  Because route traffic, bridge crossings, and staging conditions vary, we deliver binding quotes
                  through our online booking system or via custom inquiry.
                </p>
                <div className="mileage-card-actions">
                  <TrackLink
                    href="/book"
                    className="button button-gold"
                    eventName="booking_click"
                    eventParams={{ source_page: '/rates-and-options', button_location: 'mileage_cta' }}
                  >
                    Enter Itinerary in ORES <Icon name="arrow" width={16} />
                  </TrackLink>
                  <a href="#rates-inquiry" className="button button-secondary">
                    Contact Dispatch Team
                  </a>
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
                  Tailored transportation coordination for corporate roadshows, wedding parties, executive
                  conferences, and multi-vehicle delegations.
                </p>
              </div>
            </div>

            <div className="custom-packages-grid">
              <article className="custom-package-card">
                <h3>Corporate Roadshows</h3>
                <p>
                  Multi-stop Manhattan and tri-state financial itineraries. Real-time coordinator updates,
                  discrete executive service, and continuous chauffeur availability.
                </p>
                <a href="#rates-inquiry" className="text-link">
                  Discuss corporate requirements <Icon name="arrow" width={16} />
                </a>
              </article>

              <article className="custom-package-card">
                <h3>Weddings & Special Celebrations</h3>
                <p>
                  Impeccably detailed luxury crossovers and executive SUVs for bridal parties, VIP guests, and
                  seamless venue shuttles throughout New York and Long Island.
                </p>
                <a href="#rates-inquiry" className="text-link">
                  Inquire about wedding packages <Icon name="arrow" width={16} />
                </a>
              </article>

              <article className="custom-package-card">
                <h3>Airport Meet & Greet</h3>
                <p>
                  VIP baggage claim reception, luggage assistance, and escort to vehicle staging at JFK, LGA,
                  EWR, and Westchester County Airport.
                </p>
                <TrackLink
                  href="/book"
                  className="text-link"
                  eventName="booking_click"
                  eventParams={{ source_page: '/rates-and-options', button_location: 'custom_vip_link' }}
                >
                  Book with VIP Meet & Greet <Icon name="arrow" width={16} />
                </TrackLink>
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
                    <Icon name="users" width={16} height={16} /> {vClass.passengerCapacity} Passengers
                  </span>
                  {vClass.luggageCapacity && (
                    <span>
                      <Icon name="luggage" width={16} height={16} /> {vClass.luggageCapacity} Luggage
                    </span>
                  )}
                </div>
                {vClass.summary && <p className="class-summary">{vClass.summary}</p>}
                <Link href="/fleet" className="text-link">
                  View fleet vehicles <Icon name="arrow" width={14} />
                </Link>
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
              In compliance with NYS Tax Law § 1281, a statutory surcharge applies to chauffeured and
              for-hire transportation trips that begin, end, or pass through Manhattan south of 96th Street.
            </p>
          </div>
          <div className="disclosure-item">
            <h4>MTA Central Business District Tolling</h4>
            <p>
              Under MTA Congestion Relief Zone regulations, per-trip charges apply to qualifying commercial
              for-hire vehicles entering the Manhattan CBD zone south of 60th Street.
            </p>
          </div>
          <div className="disclosure-item">
            <h4>Port Authority Airport Access</h4>
            <p>
              Official Port Authority of NY & NJ airport ground transportation access fees apply to commercial
              pickups at JFK, LGA, and EWR international airports.
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
