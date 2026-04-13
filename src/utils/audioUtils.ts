import { API_BASE_URL } from '../config';

export const getStreamUrl = (id: string): string => `${API_BASE_URL}/recordings/${id}/stream`;

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const getParsedFrequency = (val: string): number => {
  const normalizedVal = val.replace(',', '.');
  let num = parseFloat(normalizedVal);
  if (!normalizedVal.includes('.') && !isNaN(num) && num > 1000) {
    return num / 1000;
  }
  return num;
};

export const formatFrequencyForDisplay = (freq: string | undefined): string => {
  if (!freq) return '';
  if (freq.includes('.')) return freq;
  const n = parseInt(freq, 10);
  if (isNaN(n)) return freq;
  return (n / 1000).toFixed(3);
};

export const validateFrequency = (val: string): string | null => {
  const num = getParsedFrequency(val);
  if (isNaN(num)) return 'נא להזין מספר תקין';
  if (num < 33 || num > 87.975) return 'התדר חייב להיות בין 33 ל-87.975 MHz';

  const remainder = Math.round(num * 1000) % 25;
  if (remainder !== 0) return 'התדר חייב להיות בקפיצות של 25 קילו-הרץ (למשל 33.025, 33.050)';

  return null;
};