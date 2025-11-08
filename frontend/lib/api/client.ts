import { Prisma } from '@prisma/client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';


type ZapWithRelations = Prisma.ZapGetPayload<{
  include: {
    trigger: true;
    actions: true;
    zapRuns: {
      include: {
        actionRuns: true;
      };
    };
  };
}>;

type CreateZapInput = {
  name: string;
  trigger: {
    type: string;
    metadata: Record<string, any>;
  };
  actions: Array<{
    type: string;
    metadata: Record<string, any>;
    sortingOrder?: number;
  }>;
};

type UpdateZapInput = Partial<CreateZapInput> & { id: string };


class ApiClient {
  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Something went wrong');
    }

    return response.json();
  }

  
  async getZaps(): Promise<ZapWithRelations[]> {
    return this.fetch('/zaps');
  }

  async getZap(id: string): Promise<ZapWithRelations> {
    return this.fetch(`/zaps/${id}`);
  }

  async createZap(data: CreateZapInput): Promise<ZapWithRelations> {
    return this.fetch('/zaps', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateZap({ id, ...data }: UpdateZapInput): Promise<ZapWithRelations> {
    return this.fetch(`/zaps/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteZap(id: string): Promise<void> {
    await this.fetch(`/zaps/${id}`, {
      method: 'DELETE',
    });
  }

  async testZap(id: string): Promise<{
    success: boolean;
    message: string;
    actionResults: Array<{
      actionId: string;
      type: string;
      success: boolean;
      message: string;
      details: Record<string, any>;
    }>;
  }> {
    return this.fetch(`/test-zap/${id}`, {
      method: 'POST',
    });
  }

  
  async triggerWebhook(webhookId: string, data: any): Promise<any> {
    return this.fetch(`/webhook/${webhookId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient();
