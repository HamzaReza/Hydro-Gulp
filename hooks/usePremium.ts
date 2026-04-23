import { useSelector } from 'react-redux';
import { RootState } from '../store';

export const usePremium = () => {
  const isPremium = useSelector((state: RootState) => state.subscription.isPremium);
  const plan = useSelector((state: RootState) => state.subscription.plan);
  const expiryDate = useSelector((state: RootState) => state.subscription.expiryDate);

  const isExpired = expiryDate ? Date.now() > expiryDate : false;
  const activePremium = isPremium && !isExpired;

  return {
    isPremium: activePremium,
    plan,
    expiryDate,
    isExpired,
  };
};
