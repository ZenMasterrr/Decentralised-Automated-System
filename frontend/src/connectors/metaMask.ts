import { metaMask } from 'wagmi/connectors';


export { metaMask } from 'wagmi/connectors';


if (typeof window !== 'undefined') {
 
  Object.keys(window.localStorage).forEach(key => {
    if (key.includes('reown') || key.includes('appkit')) {
      window.localStorage.removeItem(key);
    }
  });

  
  window.addEventListener('beforeunload', () => {
    Object.keys(window.localStorage).forEach(key => {
      if (key.includes('reown') || key.includes('appkit')) {
        window.localStorage.removeItem(key);
      }
    });
  });
}
