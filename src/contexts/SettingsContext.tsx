import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type DistanceUnit = 'km' | 'mi';

interface SettingsContextType {
  distanceUnit: DistanceUnit;
  timezone: string;
  setDistanceUnit: (unit: DistanceUnit) => void;
  setTimezone: (timezone: string) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [distanceUnit, setDistanceUnitState] = useState<DistanceUnit>('km');
  const [timezone, setTimezoneState] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone);

  useEffect(() => {
    const savedDistanceUnit = localStorage.getItem('settings_distanceUnit') as DistanceUnit;
    const savedTimezone = localStorage.getItem('settings_timezone');

    if (savedDistanceUnit) setDistanceUnitState(savedDistanceUnit);
    if (savedTimezone) setTimezoneState(savedTimezone);
  }, []);

  const setDistanceUnit = (unit: DistanceUnit) => {
    setDistanceUnitState(unit);
    localStorage.setItem('settings_distanceUnit', unit);
  };

  const setTimezone = (tz: string) => {
    setTimezoneState(tz);
    localStorage.setItem('settings_timezone', tz);
  };

  return (
    <SettingsContext.Provider value={{ distanceUnit, timezone, setDistanceUnit, setTimezone }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
