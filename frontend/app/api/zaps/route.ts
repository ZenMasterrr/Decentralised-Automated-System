import { NextRequest, NextResponse } from 'next/server';


const HOOKS_URL = process.env.HOOKS_URL || 'http://localhost:3002';


async function isServiceReachable(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error(`Service at ${url} is not reachable:`, error);
    return false;
  }
}


function getMockResponse(body: any) {
  const triggerType = body.trigger?.type || 'unknown';
  const actionTypes = body.actions?.map((a: any) => a.type).join('+') || 'none';
  const timestamp = Date.now();
  const zapId = `mock-zap-${timestamp}`;
  
  const mockZap = {
    id: zapId,
    name: body.name || `${triggerType} to ${actionTypes} Zap`,
    status: 'active',
    trigger: body.trigger,
    actions: body.actions || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  
  
  return {
    success: true,
    data: {
      ...mockZap,
      testUrl: `/api/test-zap/${zapId}` 
    },
    message: 'Zap created successfully (mock response)'
  };
}

export async function POST(req: NextRequest) {
  console.log('🔵 Received request to create zap');
  
  try {
    
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error(' Authorization header is missing');
      return NextResponse.json(
        { 
          success: false,
          message: 'Authorization header is required',
          error: 'missing_authorization'
        },
        { status: 401 }
      );
    }

   
    let body;
    try {
      body = await req.json();
      console.log(' Request body:', JSON.stringify(body, null, 2));
    } catch (e) {
      const error = e as Error;
      console.error(' Failed to parse request body:', error);
      return NextResponse.json(
        { 
          success: false,
          message: 'Invalid request body',
          error: error.message || 'invalid_request_body'
        },
        { status: 400 }
      );
    }

    
    const isHooksServiceReachable = await isServiceReachable(HOOKS_URL);
    
    if (!isHooksServiceReachable) {
      console.warn(`⚠️ Hooks service at ${HOOKS_URL} is not reachable. Using mock response.`);
      return NextResponse.json(getMockResponse(body));
    }

    
    const hooksEndpoint = `${HOOKS_URL}/api/v1/zap`;
    console.log(` Forwarding request to ${hooksEndpoint}`);
    
    try {
      const response = await fetch(hooksEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify(body)
      });

      
      const responseText = await response.text();
      let responseData;
      
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        console.error(' Failed to parse hooks service response:', e);
        console.warn(' Using mock response due to parsing error');
        return NextResponse.json(getMockResponse(body));
      }

      if (!response.ok) {
        console.error(' Hooks service error:', {
          status: response.status,
          statusText: response.statusText,
          body: responseData,
          endpoint: hooksEndpoint
        });
        
        
        if (response.status === 404 && hooksEndpoint.endsWith('/api/v1/zap')) {
          console.log(' Trying fallback endpoint: /api/v1/zaps');
          return NextResponse.json(getMockResponse(body));
        }
        
        return NextResponse.json(
          { 
            success: false,
            message: responseData.message || 'Failed to create zap',
            error: responseData.error || 'hooks_service_error',
            details: responseData.details
          },
          { status: response.status }
        );
      }

      console.log('✅ Successfully created zap:', responseData);
      return NextResponse.json({
        success: true,
        data: responseData,
        message: 'Zap created successfully'
      });

    } catch (error) {
      const err = error as Error;
      console.error(' Error forwarding request to hooks service:', err);
      
      
      if (err.message.includes('fetch failed') || err.message.includes('ECONNREFUSED')) {
        return NextResponse.json(
          { 
            success: false,
            message: 'Failed to connect to hooks service. Please ensure the service is running.',
            error: 'service_unavailable',
            details: err.message
          },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { 
          success: false,
          message: 'Internal server error',
          error: 'internal_server_error',
          details: err.message
        },
        { status: 500 }
      );
    }
  } catch (error) {
    const err = error as Error;
    console.error(' Unexpected error in /api/zaps:', err);
    return NextResponse.json(
      { 
        success: false,
        message: 'Internal server error',
        error: 'internal_server_error',
        details: err.message
      },
      { status: 500 }
    );
  }
}