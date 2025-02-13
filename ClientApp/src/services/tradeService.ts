import { ApiResponse, Trade, TradeParty } from '../types/models';
import { apiClient } from './apiClient';

const tradeService = {
  createTrade: async (trade: Trade) => {
    try {
      // Log the trade request for debugging
      console.log('Creating trade:', trade);
      console.log('Parties:', trade.parties);
      trade.parties.forEach(party => {
        console.log('Party assets:', party.assets);
        party.assets.forEach(asset => {
          console.log('Asset details:', {
            type: asset.type,
            draftId: asset.draftId,
            overallPickNumber: asset.overallPickNumber,
            pickNumber: asset.pickNumber,
            roundNumber: asset.roundNumber
          });
        });
      });

      // Send the complete trade object
      const response = await apiClient.post<ApiResponse<Trade>>('/trade', trade);
      
      // Log the successful response
      console.log('Trade created successfully:', response.value);
      
      // Return the created trade
      return response.value;
    } catch (error: any) {
      // Log the error details
      console.error('Error creating trade:', error);
      console.error('Error response:', error.response?.data);
      
      // Throw a more descriptive error
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Failed to create trade. Please try again.');
      }
    }
  },

  getTrades: async () => {
    try {
      const response = await apiClient.get<ApiResponse<Trade[]>>('/trade');
      return response.value;
    } catch (error: any) {
      // Log the error details
      console.error('Error getting trades:', error);
      console.error('Error response:', error.response?.data);
      
      // Throw a more descriptive error
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error('Failed to get trades. Please try again.');
      }
    }
  },

  cancelTrade: async (tradeId: string) => {
    try {
      console.log('Cancelling trade:', tradeId);
      await apiClient.delete<void>(`/trade/${tradeId}`);
      console.log('Trade cancelled successfully');
    } catch (error: any) {
      // Log the error details
      console.error('Error cancelling trade:', error);
      console.error('Error response:', error.response?.data);
      
      // Throw a more descriptive error
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error('Failed to cancel trade. Please try again.');
      }
    }
  },

  deleteTrade: async (tradeId: string) => {
    try {
      console.log('Permanently deleting trade:', tradeId);
      await apiClient.delete<void>(`/trade/${tradeId}/permanent`);
      console.log('Trade permanently deleted');
    } catch (error: any) {
      // Log the error details
      console.error('Error permanently deleting trade:', error);
      console.error('Error response:', error.response?.data);
      
      // Throw a more descriptive error
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error('Failed to permanently delete trade. Please try again.');
      }
    }
  }
};

export { tradeService };
