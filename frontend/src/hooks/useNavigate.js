import { useContext } from 'react';
import { AppContext } from '../context/AppContext';

export function useNavigate() {
  const { navigate, goBack } = useContext(AppContext);
  return { navigate, goBack };
}
