
// Fisher-Yates shuffle algorithm
export function shuffleArray<T,>(array: T[]): T[] {
  const newArray = [...array]; // Create a shallow copy to avoid modifying the original
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]]; // Swap elements
  }
  return newArray;
}
