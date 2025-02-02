import { apiClient } from './apiClient';
import { Manager, ApiResponse } from '../types/models';

class ManagerService {
    private baseUrl = 'manager';

    async getAll(): Promise<ApiResponse<Manager[]>> {
        return await apiClient.get(this.baseUrl);
    }

    async getById(id: string): Promise<ApiResponse<Manager>> {
        return await apiClient.get(`${this.baseUrl}/${id}`);
    }

    async create(manager: Omit<Manager, 'id'>): Promise<ApiResponse<Manager>> {
        return await apiClient.post(this.baseUrl, manager);
    }

    async update(id: string, manager: Manager): Promise<void> {
        await apiClient.put(`${this.baseUrl}/${id}`, manager);
    }

    async delete(id: string): Promise<void> {
        await apiClient.delete(`${this.baseUrl}/${id}`);
    }
}

export const managerService = new ManagerService();
