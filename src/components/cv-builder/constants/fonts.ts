export const CV_FONTS = [
  { label: 'Inter', value: 'Inter', category: 'sans-serif' },
  { label: 'Roboto', value: 'Roboto', category: 'sans-serif' },
  { label: 'Open Sans', value: 'Open Sans', category: 'sans-serif' },
  { label: 'Lato', value: 'Lato', category: 'sans-serif' },
  { label: 'Montserrat', value: 'Montserrat', category: 'sans-serif' },
  { label: 'Poppins', value: 'Poppins', category: 'sans-serif' },
  { label: 'Nunito', value: 'Nunito', category: 'sans-serif' },
  { label: 'Be Vietnam Pro', value: 'Be Vietnam Pro', category: 'sans-serif' },
  { label: 'Source Sans 3', value: 'Source Sans 3', category: 'sans-serif' },
  { label: 'Playfair Display', value: 'Playfair Display', category: 'serif' },
  { label: 'Merriweather', value: 'Merriweather', category: 'serif' },
  { label: 'Lora', value: 'Lora', category: 'serif' },
  { label: 'Noto Serif', value: 'Noto Serif', category: 'serif' },
  { label: 'Fira Code', value: 'Fira Code', category: 'monospace' },
];

export function getGoogleFontUrl(fontFamily: string): string {
  const family = fontFamily.replace(/ /g, '+');
  return `https://fonts.googleapis.com/css2?family=${family}:wght@300;400;500;600;700&display=swap`;
}
