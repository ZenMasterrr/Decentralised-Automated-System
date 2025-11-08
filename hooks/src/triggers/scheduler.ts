import { monitorAllGmailZaps } from './gmail-monitor';
import { monitorPriceAlerts } from './price-monitor';


export function startTriggerMonitoring() {
  console.log('\n🔄 Starting automatic trigger monitoring...\n');
  
  
  setInterval(async () => {
    try {
      await monitorAllGmailZaps();
    } catch (error) {
      console.error('Error in Gmail monitoring cycle:', error);
    }
  }, 60000); 
  
  
  setInterval(async () => {
    try {
      await monitorPriceAlerts();
    } catch (error) {
      console.error('Error in price monitoring cycle:', error);
    }
  }, 60000); 
  
  
  setTimeout(() => {
    monitorAllGmailZaps().catch(console.error);
    monitorPriceAlerts().catch(console.error);
  }, 5000); 
  
  console.log(' Trigger monitoring started');
  console.log('   - Gmail: Checking every 60 seconds');
  console.log('   - Price Alerts: Checking every 60 seconds\n');
}
