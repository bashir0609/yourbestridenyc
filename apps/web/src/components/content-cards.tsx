import { Card } from '@/ui';
import type { Driver, Testimonial } from '@/lib/cms/types';
import { CmsImage } from './cms-content';
import { Icon } from './icon';

export function DriverCard({ driver }: { driver?: Driver }) {
  return (
    <Card className={`driver-card ${driver ? '' : 'empty-card'}`}>
      {driver?.image ? (
        <CmsImage image={driver.image} />
      ) : (
        <div className="profile-art">
          <Icon name="user" width={44} height={44} />
          <span>{driver ? 'TEAM PROFILE · PHOTO NOT PROVIDED' : 'PROFILES NOT YET PUBLISHED'}</span>
        </div>
      )}
      <div className="card-body">
        <h3>{driver?.name ?? 'Meet the people behind the ride'}</h3>
        <p>
          {driver?.summary ??
            'Approved driver introductions will appear here. Names, portraits, experience, and credentials have not been supplied.'}
        </p>
        {!driver && <span className="content-label">Awaiting approved team profiles</span>}
      </div>
    </Card>
  );
}

export function TestimonialCard({ testimonial }: { testimonial?: Testimonial }) {
  return (
    <Card className={`testimonial-card ${testimonial ? '' : 'empty-card'}`}>
      <Icon name="quote" width={34} height={34} />
      {testimonial ? (
        <>
          <blockquote>{testimonial.quote}</blockquote>
          <p className="quote-name">{testimonial.name}</p>
          <span className="content-label">Published with website approval</span>
        </>
      ) : (
        <>
          <h3>Real experiences. In their own words.</h3>
          <p>
            This space is reserved for approved customer feedback. No reviews, ratings, or
            endorsements have been added.
          </p>
          <span className="content-label">Awaiting approved testimonials</span>
        </>
      )}
    </Card>
  );
}

export function VehicleArt({ type = 'sedan' }: { type?: 'sedan' | 'suv' | 'van' }) {
  const top =
    type === 'van'
      ? 'M108 103 122 45Q125 37 139 37H260Q276 37 286 54L320 102'
      : type === 'suv'
        ? 'M105 105 143 53Q150 44 166 44H244Q258 44 270 58L311 105'
        : 'M101 108 148 67Q160 57 180 57H231Q249 57 268 77L303 109';
  const windows =
    type === 'van'
      ? 'M129 49H181V93H119ZM191 49H246V93H191ZM256 50 285 93H256Z'
      : type === 'suv'
        ? 'm149 58-30 36h63V56h-24ZM193 56v38h91l-26-31q-6-7-16-7Z'
        : 'm152 76-31 22h68V68h-13q-12 0-24 8ZM200 68v30h80l-23-20q-11-10-27-10Z';
  return (
    <svg
      viewBox="0 0 440 210"
      role="img"
      aria-label={`Illustrative ${type} silhouette, not an actual fleet vehicle`}
      className="vehicle-art"
    >
      <ellipse cx="221" cy="170" rx="185" ry="12" fill="#000" opacity=".09" />
      <path d={top} fill="#292d30" stroke="#777" strokeWidth="1.5" />
      <path d={windows} fill="#9faeaf" opacity=".7" />
      <path
        d="M47 110q2-7 22-8h30l26 4h180l39-3q30 1 44 16l12 28q2 11-9 14H47q-11-4-8-15Z"
        fill="#292d30"
        stroke="#777"
        strokeWidth="1.5"
      />
      <path
        d="M53 126h60l16 6h204l46-9M147 110l-1 41m102-41 1 41m-86-33h18m84 0h18"
        stroke="#727777"
        fill="none"
      />
      <path d="m43 132 45 2-7 9H41m341-13-28 3 4 10h31" fill="#e8d29a" />
      <path d="M109 160h198" stroke="#afafb0" strokeWidth="3" />
      {[105, 324].map((x) => (
        <g key={x}>
          <circle cx={x} cy="154" r="29" fill="#101112" />
          <circle cx={x} cy="154" r="20" fill="#a9adae" />
          <circle cx={x} cy="154" r="15" fill="#34383b" />
          <path
            d={`M${x} 138v32m-16-16h32m-27-11 22 22m-22 0 22-22`}
            stroke="#a9adae"
            strokeWidth="3"
          />
          <circle cx={x} cy="154" r="5" fill="#bfc1c1" />
        </g>
      ))}
    </svg>
  );
}
