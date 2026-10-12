import Image from 'next/image';
import type { CmsStatus, PublicImage } from '@/lib/cms/types';

export function CmsImage({
  image,
  preserveAspectRatio = false,
  className,
  sizes = '(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 420px',
  priority = false,
}: {
  image: PublicImage;
  preserveAspectRatio?: boolean;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const classes = ['cms-photo', preserveAspectRatio ? 'cms-photo-natural' : undefined, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      style={preserveAspectRatio ? { aspectRatio: `${image.width} / ${image.height}` } : undefined}
    >
      <Image src={image.url} alt={image.alt} fill sizes={sizes} priority={priority} />
    </div>
  );
}

export function CmsEmptyState({ label, status }: { label: string; status: CmsStatus }) {
  const message =
    status === 'unavailable' || status === 'invalid'
      ? `We couldn’t load ${label} right now. Please contact us for details.`
      : status === 'empty'
        ? `No ${label} are currently published. Please contact us for details.`
        : `${label.charAt(0).toUpperCase() + label.slice(1)} will appear here when available. Please contact us for details.`;
  return <p className="editorial-note cms-empty">{message}</p>;
}
