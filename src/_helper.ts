// A bunch of helper functions used in multiple files

/*
  Converts a number into the provided alphabet
  Once all single characters are used, the multi character outputs are used
  Ex. alphabet: "A,B,C,D,E" A = 1, B = 2, ... E = 5, AA = 6..
*/
export function numberToCharacter(
  number: number,
  alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
): string {
  // handles multi-letters (AA, ABC, etc)
  let nextChar = '';
  while (number >= 1) {
    let charIndex = number % alphabet.length;
    number /= alphabet.length;
    if (charIndex - 1 === -1) {
      charIndex = alphabet.length;
      number--;
    }
    nextChar = alphabet.charAt(charIndex - 1) + nextChar;
  }
  return nextChar;
}
