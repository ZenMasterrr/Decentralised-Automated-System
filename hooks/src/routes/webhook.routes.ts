import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const prisma = new PrismaClient();


router.post('/:webhookId', async (req: Request, res: Response) => {
  const { webhookId } = req.params;
  const payload = req.body;
  const headers = req.headers;
  
  try {
    const webhook = await prisma.trigger.findFirst({
      where: {
        type: 'WEBHOOK',
        metadata: {
          path: ['webhookId'],
          equals: webhookId,
        },
      },
      include: {
        zap: {
          include: {
            actions: {
              orderBy: { sortingOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!webhook || !webhook.zap) {
      return res.status(404).json({ 
        success: false, 
        message: 'Webhook not found or inactive' 
      });
    }

    
    const zapRun = await prisma.zapRun.create({
      data: {
        zapId: webhook.zap.id,
        status: 'running',
        metadata: {
          webhook: {
            id: webhookId,
            headers: headers,
            payload: payload,
          },
        },
      },
    });

    const actionResults = [];
    let allActionsSucceeded = true;

   
    for (const action of webhook.zap.actions) {
      const actionMetadata = action.metadata as Record<string, any>;
      const actionType = actionMetadata?.type || 'UNKNOWN';
      
      const actionResult = {
        actionId: action.id,
        type: actionType,
        success: true,
        message: '',
        details: {} as Record<string, any>,
      };

      
      const actionRun = await prisma.actionRun.create({
        data: {
          actionId: action.id,
          zapRunId: zapRun.id,
          status: 'running',
          metadata: { 
            ...actionMetadata,
            webhookPayload: payload,
          },
        },
      });

      try {
       
        switch (actionType.toUpperCase()) {
          case 'EMAIL':
            
            actionResult.message = `Email would be sent to ${actionMetadata.to}`;
            actionResult.details = {
              to: actionMetadata.to,
              subject: actionMetadata.subject,
              body: actionMetadata.body,
              
            };
            console.log(`📧 [WEBHOOK] Would send email to: ${actionMetadata.to}`);
            break;
            
          case 'WEBHOOK':
           
            actionResult.message = `Webhook would be called: ${actionMetadata.url}`;
            actionResult.details = {
              url: actionMetadata.url,
              method: actionMetadata.method || 'POST',
              headers: actionMetadata.headers || {},
              payload: actionMetadata.payload || {},
              
            };
            console.log(`🌐 [WEBHOOK] Would call webhook: ${actionMetadata.url}`);
            break;
            
          case 'SLACK':
            
            actionResult.message = `Slack message would be sent to #${actionMetadata.channel}`;
            actionResult.details = {
              channel: actionMetadata.channel,
              message: actionMetadata.message,
             
            };
            console.log(` [WEBHOOK] Would send Slack message to #${actionMetadata.channel}`);
            break;
            
          default:
            actionResult.success = false;
            actionResult.message = `Action type '${actionType}' is not implemented yet`;
            actionResult.details = { type: actionType };
            allActionsSucceeded = false;
            console.warn(`⚠️ [WEBHOOK] Unhandled action type: ${actionType}`);
        }
        
        
        await prisma.actionRun.update({
          where: { id: actionRun.id },
          data: {
            status: actionResult.success ? 'success' : 'failed',
            metadata: {
              ...(actionRun.metadata as object || {}),
              message: actionResult.message,
              details: actionResult.details,
              finishedAt: new Date().toISOString()
            }
          },
        });
        
      } catch (error) {
        console.error(` Error executing action ${action.id}:`, error);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        actionResult.success = false;
        actionResult.message = `Action failed: ${errorMessage}`;
        actionResult.details = { error: String(error) };
        allActionsSucceeded = false;
        
        
        await prisma.actionRun.update({
          where: { id: actionRun.id },
          data: {
            status: 'failed',
            metadata: {
              ...(actionRun.metadata as object || {}),
              message: errorMessage,
              error: String(error),
              finishedAt: new Date().toISOString()
            }
          },
        });
      }
      
      actionResults.push(actionResult);
    }
    
    
    const zapRunStatus = allActionsSucceeded ? 'completed' : 'partially_completed';
    await prisma.zapRun.update({
      where: { id: zapRun.id },
      data: {
        status: zapRunStatus,
        metadata: {
          ...(zapRun.metadata as object || {}),
          actionResults,
          finishedAt: new Date().toISOString()
        }
      },
    });
    
    
    res.status(200).json({
      success: true,
      message: `Webhook processed ${allActionsSucceeded ? 'successfully' : 'with some errors'}`,
      zapId: webhook.zap.id,
      zapName: webhook.zap.name,
      status: zapRunStatus,
      actionResults,
      startedAt: zapRun.createdAt,
      finishedAt: new Date(),
    });
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process webhook',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
