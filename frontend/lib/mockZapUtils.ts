import path from 'path';
import { promises as fs } from 'fs';


const mockDataPath = path.join(process.cwd(), 'data', 'mockZaps.json');

export interface MockZap {
  id: string;
  name: string;
  status: string;
  trigger: any;
  actions: any[];
  testUrl?: string;
  createdAt: string;
  updatedAt: string;
}


let mockZapsCache: Record<string, MockZap> = {};
let isCacheInitialized = false;


async function loadMockZaps(): Promise<Record<string, MockZap>> {
  try {
    const fileContents = await fs.readFile(mockDataPath, 'utf8');
    return JSON.parse(fileContents);
  } catch (error: any) {
    
    if (error.code === 'ENOENT') {
      return {};
    }
    console.error('Failed to load mock zaps:', error);
    return {};
  }
}


async function saveMockZapsToFile(zaps: Record<string, MockZap>) {
  try {
    
    await fs.mkdir(path.dirname(mockDataPath), { recursive: true });
    
    await fs.writeFile(mockDataPath, JSON.stringify(zaps, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to save mock zaps:', error);
  }
}


export async function initializeMockZaps() {
  if (!isCacheInitialized) {
    mockZapsCache = await loadMockZaps();
    isCacheInitialized = true;
  }
  return mockZapsCache;
}


export async function getMockZaps(): Promise<Record<string, MockZap>> {
  if (!isCacheInitialized) {
    await initializeMockZaps();
  }
  return { ...mockZapsCache };
}


export async function getMockZap(id: string): Promise<MockZap | undefined> {
  if (!isCacheInitialized) {
    await initializeMockZaps();
  }
  return mockZapsCache[id];
}


export async function saveMockZap(zap: MockZap) {
  if (!isCacheInitialized) {
    await initializeMockZaps();
  }
  
  const updatedZap = {
    ...zap,
    updatedAt: new Date().toISOString(),
  };
  
  mockZapsCache[zap.id] = updatedZap;
  
  
  saveMockZapsToFile(mockZapsCache).catch(console.error);
  
  return updatedZap;
}


export async function deleteMockZap(id: string): Promise<boolean> {
  if (!isCacheInitialized) {
    await initializeMockZaps();
  }
  
  if (mockZapsCache[id]) {
    delete mockZapsCache[id];
    
    saveMockZapsToFile(mockZapsCache).catch(console.error);
    return true;
  }
  
  return false;
}


export async function clearMockZaps() {
  mockZapsCache = {};
  await saveMockZapsToFile({});
}
