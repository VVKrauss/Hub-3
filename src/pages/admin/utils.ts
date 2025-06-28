// 2. Создаем файл utils.ts
export const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const isValidTime = (time: string) => {
  if (!time) return false;
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

export const formatTimeForDatabase = (time: string) => {
  if (!time) return null;
  
  if (time.match(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
    return `${time}:00`;
  }
  
  if (time.match(/^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)) {
    return time;
  }
  
  return null;
};