export const CURRENT_BASEBALL_SEASON = 2025;

export const calculatePreciseAge = (birthDate: string | undefined): number | null => {
  if (!birthDate) return null;
  
  const birth = new Date(birthDate);
  const today = new Date();
  
  // Calculate the time difference in milliseconds
  const timeDiff = today.getTime() - birth.getTime();
  
  // Convert to years with one decimal place
  const age = timeDiff / (1000 * 60 * 60 * 24 * 365.25);
  return Math.round(age * 10) / 10;
};

export const calculateBaseballAge = (birthDate: string | undefined, season: number): number | null => {
  if (!birthDate) return null;
  
  const birth = new Date(birthDate);
  const seasonDate = new Date(season, 6, 1); // July 1st of the given season
  
  let age = seasonDate.getFullYear() - birth.getFullYear();
  
  // Adjust age if birthday hasn't occurred yet in the season
  if (
    birth.getMonth() > 6 || // After July
    (birth.getMonth() === 6 && birth.getDate() > 1) // After July 1st
  ) {
    age--;
  }
  
  return age;
};

export const formatAgeDisplay = (birthDate: string | undefined): string => {
  const preciseAge = calculatePreciseAge(birthDate);
  const baseballAge = calculateBaseballAge(birthDate, CURRENT_BASEBALL_SEASON);
  
  if (!preciseAge || !baseballAge) return '';
  
  return `Age: ${preciseAge.toFixed(1)} | Baseball Age ${CURRENT_BASEBALL_SEASON}: ${baseballAge}`;
};
