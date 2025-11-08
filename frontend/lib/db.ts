
export interface User {
  id: number;
  name?: string | null;
  email?: string | null;
  address: string;
  createdAt: string;
  updatedAt: string;
}

export interface Zap {
  id: string;
  name: string;
  userId: number;
  status: string;
  trigger?: Trigger | null;
  actions: Action[];
  createdAt: string;
  updatedAt: string;
}

export interface Trigger {
  id: string;
  zapId: string;
  type: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Action {
  id: string;
  zapId: string;
  type: string;
  metadata: Record<string, any>;
  sortingOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ZapRun {
  id: string;
  zapId: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateZapInput {
  name: string;
  trigger: {
    type: string;
    metadata?: Record<string, any>;
  };
  actions: Array<{
    type: string;
    metadata?: Record<string, any>;
    sortingOrder?: number;
  }>;
  userId: string;
}

class DatabaseService {
  private apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';

  
  async getCurrentUser(): Promise<User> {
    const response = await fetch(`${this.apiUrl}/auth/me`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch current user');
    }
    
    return response.json();
  }

  
  async getZaps(userId: string): Promise<Zap[]> {
    const response = await fetch(`${this.apiUrl}/zaps?userId=${userId}`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch zaps');
    }
    
    return response.json();
  }

  async getZapById(id: string): Promise<Zap> {
    const response = await fetch(`${this.apiUrl}/zaps/${id}`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch zap ${id}`);
    }
    
    return response.json();
  }

  async createZap(zapData: CreateZapInput): Promise<Zap> {
    const response = await fetch(`${this.apiUrl}/zaps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(zapData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create zap');
    }
    
    return response.json();
  }

  async updateZap(id: string, zapData: Partial<CreateZapInput>): Promise<Zap> {
    const response = await fetch(`${this.apiUrl}/zaps/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(zapData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update zap');
    }
    
    return response.json();
  }

  async deleteZap(id: string): Promise<void> {
    const response = await fetch(`${this.apiUrl}/zaps/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete zap');
    }
  }

  
  async testZap(id: string): Promise<{ success: boolean; message: string; results: any[] }> {
    const response = await fetch(`${this.apiUrl}/test-zap/${id}`, {
      method: 'POST',
      credentials: 'include',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to test zap');
    }
    
    return response.json();
  }

  
  async getAvailableTriggers() {
    const response = await fetch(`${this.apiUrl}/triggers`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch available triggers');
    }
    
    return response.json();
  }

  async getAvailableActions() {
    const response = await fetch(`${this.apiUrl}/actions`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch available actions');
    }
    
    return response.json();
  }
  
  
  async getZapRuns(zapId: string): Promise<ZapRun[]> {
    const response = await fetch(`${this.apiUrl}/zaps/${zapId}/runs`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch zap runs');
    }
    
    return response.json();
  }
}

export const db = new DatabaseService();
