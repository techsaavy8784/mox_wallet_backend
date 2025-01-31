import randomWords from "random-words";

export const generateRandomWords = (length: number) => {
  const words = randomWords(length);
  return words;
};
