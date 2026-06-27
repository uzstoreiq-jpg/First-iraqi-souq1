export const generateRandomRating = (id: string | number) => {
  const str = id.toString();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Generate a number between 15 and 120
  const random = Math.abs(hash) % 105 + 15;
  return random;
};
