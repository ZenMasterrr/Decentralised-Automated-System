import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();
const router = Router();


const createZapSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  trigger: z.object({
    type: z.string().min(1, 'Trigger type is required'),
    metadata: z.record(z.any()).optional(),
  }),
  actions: z.array(
    z.object({
      type: z.string().min(1, 'Action type is required'),
      metadata: z.record(z.any()).optional(),
      sortingOrder: z.number().default(0),
    })
  ),
  userId: z.string().min(1, 'User ID is required'),
});


const handleError = (error: any, res: Response) => {
  console.error('Error:', error);
  const status = error.status || 500;
  const message = error.message || 'An unexpected error occurred';
  res.status(status).json({ success: false, message });
};


router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID is required' 
      });
    }

    const zaps = await prisma.zap.findMany({
      where: { 
        userId: parseInt(userId as string),
        status: 'active',
      },
      include: {
        trigger: true,
        actions: {
          orderBy: {
            sortingOrder: 'asc',
          },
        },
      },
    });

    res.json(zaps);
  } catch (error) {
    handleError(error, res);
  }
});


router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const zap = await prisma.zap.findUnique({
      where: { id },
      include: {
        trigger: true,
        actions: {
          orderBy: {
            sortingOrder: 'asc',
          },
        },
      },
    });

    if (!zap) {
      return res.status(404).json({ 
        success: false, 
        message: 'Zap not found' 
      });
    }

    res.json(zap);
  } catch (error) {
    handleError(error, res);
  }
});


router.post('/', async (req: Request, res: Response) => {
  try {
    const data = createZapSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      
      const zap = await tx.zap.create({
        data: {
          name: data.name,
          userId: parseInt(data.userId),
          status: 'active',
        },
      });

      
      await tx.trigger.create({
        data: {
          zapId: zap.id,
          type: data.trigger.type,
          metadata: data.trigger.metadata || {},
        },
      });

      
      const actions = await Promise.all(
        data.actions.map((action, index) =>
          tx.action.create({
            data: {
              zapId: zap.id,
              type: action.type,
              metadata: action.metadata || {},
              sortingOrder: action.sortingOrder || index,
            },
          })
        )
      );

      return { ...zap, actions };
    });

    res.status(201).json(result);
  } catch (error) {
    handleError(error, res);
  }
});


router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = createZapSchema.partial().parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      
      const zap = await tx.zap.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.trigger && {
            trigger: {
              update: {
                type: data.trigger.type,
                metadata: data.trigger.metadata || {},
              },
            },
          }),
        },
        include: {
          trigger: true,
          actions: true,
        },
      });

      
      if (data.actions) {
        
        await tx.action.deleteMany({
          where: { zapId: id },
        });

        
        await Promise.all(
          data.actions.map((action, index) =>
            tx.action.create({
              data: {
                zapId: id,
                type: action.type,
                metadata: action.metadata || {},
                sortingOrder: action.sortingOrder || index,
              },
            })
          )
        );
      }

      
      return tx.zap.findUnique({
        where: { id },
        include: {
          trigger: true,
          actions: {
            orderBy: {
              sortingOrder: 'asc',
            },
          },
        },
      });
    });

    res.json(result);
  } catch (error) {
    handleError(error, res);
  }
});


router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.zap.update({
      where: { id },
      data: { status: 'deleted' },
    });

    res.json({ success: true, message: 'Zap deleted successfully' });
  } catch (error) {
    handleError(error, res);
  }
});


router.get('/:id/runs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = '10', offset = '0' } = req.query;

    const runs = await prisma.zapRun.findMany({
      where: { zapId: id },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string) || 10,
      skip: parseInt(offset as string) || 0,
    });

    res.json(runs);
  } catch (error) {
    handleError(error, res);
  }
});

export default router;
