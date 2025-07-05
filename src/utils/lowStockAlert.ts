
import { supabase } from '@/integrations/supabase/client';

export async function checkLowStockAndAlert(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('Triggering low stock alert check with new inventory system...');
    
    const { data, error } = await supabase.functions.invoke('low-stock-alert', {
      body: {}
    });

    if (error) {
      console.error('Error calling low-stock-alert function:', error);
      return {
        success: false,
        message: `Error: ${error.message}`
      };
    }

    console.log('Low stock alert response:', data);
    return {
      success: true,
      message: data.message || 'Low stock check completed with new inventory system'
    };
  } catch (error) {
    console.error('Error triggering low stock alert:', error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
