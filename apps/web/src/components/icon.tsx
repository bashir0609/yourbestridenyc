import type { SVGProps } from 'react';

const paths = {
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  medical: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z',
  airport: 'm22 2-7 20-4-9-9-4L22 2ZM11 13 22 2',
  corporate: 'M3 7h18v14H3V7Zm5 0V3h8v4M3 12h18m-11 0v3h4v-3',
  private: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z',
  pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2',
  quote: 'M10 5H3v8h4c0 3-1 4-3 6m17-14h-7v8h4c0 3-1 4-3 6',
  phone: 'M5 3h4l2 5-3 2a15 15 0 0 0 6 6l2-3 5 2v4c0 2-2 3-4 2C9 19 5 15 3 7c-1-2 0-4 2-4Z',
  mail: 'M3 5h18v14H3V5Zm0 1 9 7 9-7',
  check: 'm5 12 4 4L19 6',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'm6 6 12 12M6 18 18 6',
  users:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3.13a4 4 0 0 1 0 7.75M22 21v-2a4 4 0 0 0-3-3.87',
  luggage:
    'M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H6ZM10 6h4M18 10H6M6 14h12',
  award:
    'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  globe:
    'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83',
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  'heart-pulse':
    'M4 20a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4ZM8 14v-4a2 2 0 0 1 4 0v4M16 10h-4',
  plane: 'm22 2-7 20-4-9-9-4L22 2ZM11 13 22 2',
  briefcase: 'M3 7h18v14H3V7Zm5 0V3h8v4M3 12h18m-11 0v3h4v-3',
  mapPin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
} as const;

export type IconName = keyof typeof paths;
export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
