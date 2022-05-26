import { createContext } from 'react';

interface ResultContextProps {
  selectedValue: any;
}

export const ResultContext = createContext<ResultContextProps>({
  selectedValue: [],
});
