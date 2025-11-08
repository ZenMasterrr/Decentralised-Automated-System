import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { resolve, join } from 'path';
import {
  setGoogleCredentials,
  addRowToSheet,
  createCalendarEvent,
  parseDateTime,
  calculateEndTime,
} from '../google-apis';


const envPaths = [
  resolve(process.cwd(), '.env'),           
  resolve(process.cwd(), '../.env'),        
  resolve(process.cwd(), '../../.env'),    
  resolve(process.cwd(), '../Dteams/.env'), 
  resolve(process.cwd(), '.env.local'),    
  resolve(process.cwd(), 'hooks', '.env'),  
  resolve(__dirname, '../../../.env'),       
  resolve(__dirname, '../../../../hooks/.env'), 
];


let envLoaded = false;
envPaths.forEach(envPath => {
  try {
    const result = dotenv.config({ path: envPath, override: false }); 
    if (!result.error && result.parsed && Object.keys(result.parsed).length > 0) {
      envLoaded = true;
      if (process.env.NODE_ENV === 'development') {
        console.log(`Loaded env from: ${envPath}`);
      }
    }
  } catch (error) {
    
  }
});

if (!envLoaded && process.env.NODE_ENV === 'development') {
  console.warn('⚠️  No .env file was loaded. Using system environment variables.');
}

const prisma = new PrismaClient();


const SMTP_USERNAME = process.env.SMTP_USERNAME;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const SMTP_ENDPOINT = process.env.SMTP_ENDPOINT || 'email-smtp.us-east-1.amazonaws.com';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@example.com';


if (process.env.NODE_ENV === 'development') {
  console.log('🔍 SMTP Config Check:', {
    hasUsername: !!SMTP_USERNAME,
    hasPassword: !!SMTP_PASSWORD,
    endpoint: SMTP_ENDPOINT,
    fromEmail: FROM_EMAIL,
    cwd: process.cwd(),
  });
}


async function sendEmail(to: string, subject: string, body: string) {
  
  if (!SMTP_USERNAME || !SMTP_PASSWORD) {
    throw new Error('AWS SES SMTP credentials not configured. Please set SMTP_USERNAME and SMTP_PASSWORD environment variables.');
  }

  try {
    
    const transporter = nodemailer.createTransport({
      host: SMTP_ENDPOINT,
      port: 587,
      secure: false, 
      auth: {
        user: SMTP_USERNAME,
        pass: SMTP_PASSWORD,
      },
    });

    
    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to: to,
      subject: subject,
      text: body,
    });

    console.log('✅ Email sent successfully via AWS SES SMTP:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
}


async function callWebhook(url: string, method: string = 'POST', headers: Record<string, string> = {}, payload: any = {}) {
  try {
    const response = await fetch(url, {
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: method.toUpperCase() !== 'GET' ? JSON.stringify(payload) : undefined,
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch {
      responseData = responseText;
    }

    if (!response.ok) {
      throw new Error(`Webhook returned ${response.status}: ${JSON.stringify(responseData)}`);
    }

    console.log(` Webhook called successfully: ${url}`);
    return { success: true, status: response.status, data: responseData };
  } catch (error) {
    console.error(` Error calling webhook ${url}:`, error);
    throw error;
  }
}


async function updateActionRunStatus(
  actionRunId: string,
  status: 'success' | 'failed' | 'running',
  message: string,
  details: Record<string, any> = {}
) {
  return prisma.actionRun.update({
    where: { id: actionRunId },
    data: {
      status,
      metadata: {
        ...details,
        message
      },
      updatedAt: new Date()
    }
  });
}


const mockZapsStore: Record<string, any> = {};

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const zapId = params.id;
  
  try {
    // Check if this is a mock zap (starts with "zap-" or "mock-zap-")
    const isMockZap = zapId.startsWith('zap-') || zapId.startsWith('mock-zap-');
    
    let zapWithRelations: any = null;
    
    if (isMockZap) {
      // Handle mock zap - try to get from request body or in-memory store
      let body: any = null;
      try {
        // Try to read request body (may be empty)
        const text = await req.text();
        if (text) {
          body = JSON.parse(text);
        }
      } catch (e) {
        // Body is empty or invalid, that's okay
      }
      
      if (body?.zap) {
        // Zap data sent in request body
        mockZapsStore[zapId] = body.zap;
        const mockZap = body.zap;
        zapWithRelations = {
          id: mockZap.id,
          name: mockZap.name,
          status: mockZap.status || 'active',
          Action: (mockZap.actions || []).map((action: any, index: number) => ({
            id: `action-${index}`,
            type: action.type,
            metadata: action.config || {},
            sortingOrder: index
          })),
          Trigger: mockZap.trigger ? {
            id: `trigger-${zapId}`,
            type: mockZap.trigger.type,
            metadata: mockZap.trigger
          } : null
        };
      } else if (mockZapsStore[zapId]) {
        // Zap data in in-memory store
        const mockZap = mockZapsStore[zapId];
        zapWithRelations = {
          id: mockZap.id,
          name: mockZap.name,
          status: mockZap.status || 'active',
          Action: (mockZap.actions || []).map((action: any, index: number) => ({
            id: `action-${index}`,
            type: action.type,
            metadata: action.config || {},
            sortingOrder: index
          })),
          Trigger: mockZap.trigger ? {
            id: `trigger-${zapId}`,
            type: mockZap.trigger.type,
            metadata: mockZap.trigger
          } : null
        };
      } else {
        // No zap data available
        return NextResponse.json(
          { 
            success: false, 
            message: `Mock zap with ID ${zapId} not found. Please send zap data in the request body or ensure the zap is stored server-side.`
          },
          { status: 404 }
        );
      }
    } else {
      // Handle database zap
      const zap = await prisma.zap.findUnique({
        where: { id: zapId }
      });
      
      if (!zap) {
        console.error(`Zap not found: ${zapId}`);
        return NextResponse.json(
          { 
            success: false, 
            message: `Zap with ID ${zapId} not found in database`
          },
          { status: 404 }
        );
      }
      
      // Fetch actions and trigger separately to avoid include issues
      const actions = await prisma.action.findMany({
        where: { zapId: zap.id },
        orderBy: { sortingOrder: 'asc' }
      });
      
      const trigger = await prisma.trigger.findUnique({
        where: { zapId: zap.id }
      });
      
      // Attach to zap object for easier access
      zapWithRelations = {
        ...zap,
        Action: actions,
        Trigger: trigger
      };
    }
    
    console.log(`🔔 Testing zap: ${zapWithRelations.name} (${zapId})`);
    
    // Load user's Google OAuth tokens
    let user: any = null;
    
    if (!isMockZap && zapWithRelations.userId) {
      // For database zaps, load by userId
      user = await prisma.user.findUnique({
        where: { id: zapWithRelations.userId },
        select: {
          id: true,
          address: true,
          email: true,
          googleAccessToken: true,
          googleRefreshToken: true,
          googleTokenExpiry: true,
        },
      });
    } else if (isMockZap) {
      // For mock zaps, try to load by wallet address from query param or localStorage
      const wallet = new URL(req.url).searchParams.get('wallet') || req.headers.get('x-wallet-address');
      
      if (wallet) {
        user = await prisma.user.findUnique({
          where: { address: wallet },
          select: {
            id: true,
            address: true,
            email: true,
            googleAccessToken: true,
            googleRefreshToken: true,
            googleTokenExpiry: true,
          },
        });
        console.log('🔍 Looking up user by wallet:', wallet);
      } else {
        // Try to find any user with Google credentials (for testing)
        const users = await prisma.user.findMany({
          where: {
            googleAccessToken: { not: null }
          },
          select: {
            id: true,
            address: true,
            email: true,
            googleAccessToken: true,
            googleRefreshToken: true,
            googleTokenExpiry: true,
          },
          take: 1
        });
        
        if (users.length > 0) {
          user = users[0];
          console.log('⚠️  No wallet provided, using first user with Google credentials:', user.email || user.address);
        }
      }
    }
    
    // Set Google credentials if available
    if (user?.googleAccessToken) {
      setGoogleCredentials(user.googleAccessToken, user.googleRefreshToken || undefined);
      console.log('✅ Loaded Google credentials for user:', user.email || user.address);
    } else {
      console.log('⚠️  No Google credentials found. User needs to connect Google account.');
    }
    
    // Create a zap run to track this test execution (only for database zaps)
    let zapRun: any = null;
    if (!isMockZap) {
      const now = new Date();
      zapRun = await prisma.zapRun.create({
        data: {
          id: `zaprun-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          zapId: zapWithRelations.id,
          updatedAt: now,
          metadata: { 
            testRun: true,
            triggerType: zapWithRelations.Trigger?.type || 'unknown',
            actionCount: zapWithRelations.Action.length
          }
        }
      });
    } else {
      // For mock zaps, create a virtual zap run
      zapRun = {
        id: `zaprun-${Date.now()}`,
        zapId: zapWithRelations.id,
        createdAt: new Date(),
        metadata: { 
          testRun: true,
          triggerType: zapWithRelations.Trigger?.type || 'unknown',
          actionCount: zapWithRelations.Action.length
        }
      };
    }
    
    const actionResults = [];
    let allActionsSucceeded = true;
    let previousActionFailed = false;
    
    // Process each action
    for (const action of zapWithRelations.Action) {
      // Skip this action if a previous one failed (for workflow-style zaps)
      if (previousActionFailed && zapWithRelations.Trigger?.type === 'google_workflow') {
        console.log(`⏭️  Skipping ${action.type} action because previous action failed`);
        actionResults.push({
          actionId: action.id,
          type: action.type,
          success: false,
          message: 'Skipped due to previous action failure',
          details: { skipped: true }
        });
        continue;
      }
      // For mock zaps, action data is in action.config, for database zaps it's in action.metadata
      let actionMetadata: any = {};
      if (isMockZap) {
        // Mock zaps store action data in config
        actionMetadata = action.metadata?.config || action.metadata || {};
      } else {
        // Database zaps store action data in metadata
        actionMetadata = typeof action.metadata === 'string' 
          ? JSON.parse(action.metadata)
          : action.metadata || {};
      }
      
      const actionResult = {
        actionId: action.id,
        type: action.type,
        success: true,
        message: '',
        details: {} as Record<string, any>
      };
      
      // Create an action run to track this action (only for database zaps)
      let actionRun: any = null;
      if (!isMockZap) {
        const now = new Date();
        actionRun = await prisma.actionRun.create({
          data: {
            id: `actionrun-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            actionId: action.id,
            zapRunId: zapRun.id,
            status: 'running',
            updatedAt: now,
            metadata: { 
              ...actionMetadata,
              testRun: true 
            }
          }
        });
      } else {
        // For mock zaps, create a virtual action run
        actionRun = {
          id: `actionrun-${Date.now()}-${action.id}`,
          actionId: action.id,
          zapRunId: zapRun.id,
          status: 'running',
          metadata: { 
            ...actionMetadata,
            testRun: true 
          }
        };
      }
      
      try {
        // Process the action based on its type
        switch (action.type.toUpperCase()) {
          case 'EMAIL':
            // Actually send the email
            try {
              const emailResult = await sendEmail(
                actionMetadata.to,
                actionMetadata.subject,
                actionMetadata.body
              );
              actionResult.message = `Email sent successfully to ${actionMetadata.to}`;
              actionResult.details = {
                to: actionMetadata.to,
                subject: actionMetadata.subject,
                bodyPreview: actionMetadata.body?.substring(0, 100) + (actionMetadata.body?.length > 100 ? '...' : ''),
                messageId: emailResult.messageId
              };
              console.log(`✅ Email sent successfully to: ${actionMetadata.to}`);
            } catch (error) {
              actionResult.success = false;
              actionResult.message = `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`;
              actionResult.details = {
                to: actionMetadata.to,
                subject: actionMetadata.subject,
                error: error instanceof Error ? error.message : String(error)
              };
              allActionsSucceeded = false;
              console.error(`❌ Failed to send email to ${actionMetadata.to}:`, error);
            }
            break;
            
          case 'WEBHOOK':
            // Actually call the webhook
            try {
              const webhookResult = await callWebhook(
                actionMetadata.url,
                actionMetadata.method || 'POST',
                actionMetadata.headers || {},
                actionMetadata.payload || {}
              );
              actionResult.message = `Webhook called successfully: ${actionMetadata.url}`;
              actionResult.details = {
                url: actionMetadata.url,
                method: actionMetadata.method || 'POST',
                status: webhookResult.status,
                response: webhookResult.data
              };
              console.log(`✅ Webhook called successfully: ${actionMetadata.url}`);
            } catch (error) {
              actionResult.success = false;
              actionResult.message = `Failed to call webhook: ${error instanceof Error ? error.message : 'Unknown error'}`;
              actionResult.details = {
                url: actionMetadata.url,
                method: actionMetadata.method || 'POST',
                error: error instanceof Error ? error.message : String(error)
              };
              allActionsSucceeded = false;
              console.error(`❌ Failed to call webhook ${actionMetadata.url}:`, error);
            }
            break;
            
          case 'SLACK':
            actionResult.message = `Slack message would be sent to #${actionMetadata.channel}`;
            actionResult.details = {
              channel: actionMetadata.channel,
              message: actionMetadata.message
            };
            console.log(`💬 [TEST] Would send Slack message to #${actionMetadata.channel}`);
            break;
          
          case 'SHEETS':
            // Google Sheets integration
            if (!user?.googleAccessToken) {
              actionResult.success = false;
              actionResult.message = 'Google account not connected. Please authorize Google access first.';
              actionResult.details = {
                error: 'No Google OAuth tokens found',
                note: 'User needs to connect their Google account before using Google Sheets actions'
              };
              allActionsSucceeded = false;
              console.error('❌ Google Sheets: No credentials found');
              break;
            }
            
            try {
              // Prepare data to add to sheet - customize based on trigger data
              const rowData = [
                new Date().toISOString(),
                actionMetadata.eventTitle || 'Zap Event',
                actionMetadata.eventDescription || 'From automated workflow',
                actionMetadata.dateField || '',
                actionMetadata.timeField || ''
              ];
              
              const sheetResult = await addRowToSheet(
                actionMetadata.spreadsheetId,
                actionMetadata.sheetName || 'Sheet1',
                rowData,
                actionMetadata.range
              );
              
              actionResult.success = sheetResult.success;
              actionResult.message = sheetResult.message;
              actionResult.details = sheetResult.details || {};
              
              if (!sheetResult.success) {
                allActionsSucceeded = false;
              }
              
              console.log(sheetResult.success ? '✅' : '❌', `Google Sheets: ${sheetResult.message}`);
            } catch (error) {
              actionResult.success = false;
              actionResult.message = `Failed to add row to Google Sheet: ${error instanceof Error ? error.message : 'Unknown error'}`;
              actionResult.details = { error: error instanceof Error ? error.message : String(error) };
              allActionsSucceeded = false;
              console.error('❌ Google Sheets error:', error);
            }
            break;
          
          case 'CALENDAR':
            // Google Calendar integration
            if (!user?.googleAccessToken) {
              actionResult.success = false;
              actionResult.message = 'Google account not connected. Please authorize Google access first.';
              actionResult.details = {
                error: 'No Google OAuth tokens found',
                note: 'User needs to connect their Google account before using Google Calendar actions'
              };
              allActionsSucceeded = false;
              console.error('❌ Google Calendar: No credentials found');
              break;
            }
            
            try {
              // Parse date and time
              let startDateTime = parseDateTime(
                actionMetadata.dateField || '2024-11-15',
                actionMetadata.timeField || '14:30'
              );
              
              // Ensure start time has timezone (add Z for UTC if missing)
              if (!startDateTime.includes('Z') && !startDateTime.match(/[+-]\d{2}:\d{2}$/)) {
                startDateTime = startDateTime + 'Z';
              }
              
              const endDateTime = calculateEndTime(startDateTime, actionMetadata.duration || 60);
              
              console.log('🕐 Calendar times:', { startDateTime, endDateTime });
              
              const calendarResult = await createCalendarEvent(
                actionMetadata.eventTitle || 'Untitled Event',
                actionMetadata.eventDescription || '',
                startDateTime,
                endDateTime,
                actionMetadata.sendNotifications !== false
              );
              
              actionResult.success = calendarResult.success;
              actionResult.message = calendarResult.message;
              actionResult.details = calendarResult.details || {};
              
              if (!calendarResult.success) {
                allActionsSucceeded = false;
              }
              
              console.log(calendarResult.success ? '✅' : '❌', `Google Calendar: ${calendarResult.message}`);
            } catch (error) {
              actionResult.success = false;
              actionResult.message = `Failed to create calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`;
              actionResult.details = { error: error instanceof Error ? error.message : String(error) };
              allActionsSucceeded = false;
              console.error('❌ Google Calendar error:', error);
            }
            break;
            
          default:
            actionResult.success = false;
            actionResult.message = `Action type '${action.type}' is not implemented yet`;
            actionResult.details = { type: action.type };
            allActionsSucceeded = false;
            console.warn(`⚠️ [TEST] Unhandled action type: ${action.type}`);
        }
        
        // Update action run status (only for database zaps)
        if (!isMockZap) {
          await updateActionRunStatus(
            actionRun.id,
            actionResult.success ? 'success' : 'failed',
            actionResult.message,
            actionResult.details
          );
        } else {
          // For mock zaps, just update the virtual action run
          actionRun.status = actionResult.success ? 'success' : 'failed';
        }
        
      } catch (error) {
        console.error(`❌ Error executing action ${action.id}:`, error);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        actionResult.success = false;
        actionResult.message = `Action failed: ${errorMessage}`;
        actionResult.details = { 
          ...actionResult.details,
          error: error instanceof Error ? error.stack || error.message : String(error)
        };
        allActionsSucceeded = false;
        
        // Update action run status to failed (only for database zaps)
        if (!isMockZap) {
          await updateActionRunStatus(
            actionRun.id,
            'failed',
            errorMessage,
            actionResult.details
          );
        } else {
          // For mock zaps, just update the virtual action run
          actionRun.status = 'failed';
        }
      }
      
      actionResults.push(actionResult);
      
      // Mark if this action failed, so subsequent actions can be skipped
      if (!actionResult.success) {
        previousActionFailed = true;
      }
    } // End of actions loop
    
    // Update the zap run status (only for database zaps)
    const zapRunStatus = allActionsSucceeded ? 'completed' : 'partially_completed';
    if (!isMockZap) {
      await prisma.zapRun.update({
        where: { id: zapRun.id },
        data: {
          metadata: {
            ...(zapRun.metadata as object || {}),
            actionResults,
            status: zapRunStatus,
            completedAt: new Date()
          }
        }
      });
    } else {
      // For mock zaps, just update the virtual zap run
      zapRun.metadata = {
        ...(zapRun.metadata as object || {}),
        actionResults,
        status: zapRunStatus,
        completedAt: new Date()
      };
    }
    
    return NextResponse.json({
      success: true,
      message: `Zap test ${allActionsSucceeded ? 'completed successfully' : 'completed with some errors'}`,
      zapId: zapWithRelations.id,
      zapName: zapWithRelations.name,
      status: zapRunStatus,
      actionResults,
      startedAt: zapRun.createdAt,
      finishedAt: new Date()
    });
    
  } catch (error) {
    console.error('Error testing zap:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to test zap',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

