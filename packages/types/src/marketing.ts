export interface MarketingImage {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface MarketingLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface SeoMetadata {
  title: string;
  description: string;
  canonicalUrl?: string;
  image?: MarketingImage;
  noIndex?: boolean;
}

export interface HeroContent {
  eyebrow?: string;
  title: string;
  description?: string;
  image?: MarketingImage;
  primaryAction?: MarketingLink;
  secondaryAction?: MarketingLink;
}

export interface ServiceSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  image?: MarketingImage;
}

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  attribution?: string;
  image?: MarketingImage;
}

export interface FaqItem {
  question: string;
  answer: string;
}
