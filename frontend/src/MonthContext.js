import { createContext, useContext, useState } from 'react';

const MonthContext = createContext({
  selectedMonth: new Date(),
  setSelectedMonth: () => {},
});

export const MonthProvider = ({ children }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  return (
    <MonthContext.Provider value={{ selectedMonth, setSelectedMonth }}>
      {children}
    </MonthContext.Provider>
  );
};

export const useMonth = () => {
  const context = useContext(MonthContext);
  if (!context) {
    throw new Error('useMonth must be used within MonthProvider');
  }
  return context;
};
