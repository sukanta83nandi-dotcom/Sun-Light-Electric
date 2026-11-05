/**
 * Converts a number into Indian Rupee words format.
 * Example: 159640 -> "Rupees One Lakh Fifty-Nine Thousand Six Hundred Forty Only"
 */
export function numberToWordsINR(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'Rupees Zero Only';

  const roundAmount = Math.round(Math.abs(amount));

  const units = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];

  const tens = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];

  function convertTwoDigits(num: number): string {
    if (num < 20) return units[num];
    const ten = Math.floor(num / 10);
    const unit = num % 10;
    return tens[ten] + (unit ? '-' + units[unit] : '');
  }

  function convertThreeDigits(num: number): string {
    const hundred = Math.floor(num / 100);
    const remainder = num % 100;
    let result = '';
    if (hundred > 0) {
      result += units[hundred] + ' Hundred';
      if (remainder > 0) result += ' ';
    }
    if (remainder > 0) {
      result += convertTwoDigits(remainder);
    }
    return result;
  }

  const crore = Math.floor(roundAmount / 10000000);
  let remainder = roundAmount % 10000000;

  const lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;

  const thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;

  const parts: string[] = [];

  if (crore > 0) {
    parts.push(`${convertThreeDigits(crore)} Crore`);
  }
  if (lakh > 0) {
    parts.push(`${convertTwoDigits(lakh)} Lakh`);
  }
  if (thousand > 0) {
    parts.push(`${convertTwoDigits(thousand)} Thousand`);
  }
  if (remainder > 0) {
    parts.push(convertThreeDigits(remainder));
  }

  return `Rupees ${parts.join(' ')} Only`;
}

export const numberToWordsIndian = numberToWordsINR;

