import { useEffect, useState } from 'react';

const getDefaultStorage = (key: string) => {
  return localStorage.getItem(key) || null;
};

function useStorage(
  key: string,
  defaultValue?: string
): [string | null | undefined, (str: string) => void, () => void] {
  const [storedValue, setStoredValue] = useState<string | null | undefined>(
    getDefaultStorage(key) || defaultValue
  );

  const setStorageValue = (value: string) => {
    localStorage.setItem(key, value);
    if (value !== storedValue) {
      setStoredValue(value);
    }
  };

  const removeStorage = () => {
    localStorage.removeItem(key);
    setStoredValue(getDefaultStorage(key) || defaultValue);
  };

  useEffect(() => {
    const storageValue = localStorage.getItem(key);
    if (storageValue) {
      setStoredValue(storageValue);
    }
  }, [key]);

  return [storedValue, setStorageValue, removeStorage];
}

export default useStorage;
