import { Router, Request, Response } from 'express';
import { moduleRegistry } from './registry';
import { councilReasoning } from '../councils/reasoning';
import { playbookExecutor } from '../playbooks/executor';
import './executors';

const router = Router();

router.get('/modules', (_req: Request, res: Response) => {
  const definitions = moduleRegistry.getDefinitions();
  res.json({ modules: definitions });
});

router.get('/modules/:moduleId', (req: Request, res: Response) => {
  const executor = moduleRegistry.get(req.params.moduleId);
  if (!executor) {
    res.status(404).json({ error: 'Module not found' });
    return;
  }
  res.json({ module: executor.definition });
});

router.post('/modules/:moduleId/execute', async (req: Request, res: Response) => {
  const { moduleId } = req.params;
  const executor = moduleRegistry.get(moduleId);
  
  if (!executor) {
    res.status(404).json({ error: 'Module not found' });
    return;
  }

  try {
    const validation = executor.validate(req.body);
    if (!validation.valid) {
      res.status(400).json({ error: 'Validation failed', details: validation.errors });
      return;
    }

    const output = await executor.execute(req.body);
    
    const playbookResult = await playbookExecutor.execute(moduleId, req.body, output);
    
    const finalOutput = {
      ...output,
      insights: playbookResult.insights,
      recommendations: playbookResult.recommendations,
      deprioritizedActions: playbookResult.deprioritized
    };

    res.json({ result: finalOutput });
  } catch (error) {
    console.error(`Module ${moduleId} execution failed:`, error);
    res.status(500).json({ error: 'Module execution failed' });
  }
});

router.post('/modules/:moduleId/execute-with-council', async (req: Request, res: Response) => {
  const { moduleId } = req.params;
  const executor = moduleRegistry.get(moduleId);
  
  if (!executor) {
    res.status(404).json({ error: 'Module not found' });
    return;
  }

  try {
    const output = await executor.execute(req.body);
    
    const perspectives = await councilReasoning.getModulePerspectives(
      moduleId,
      output.rawData,
      req.body.brandContext
    );

    const synthesis = await councilReasoning.synthesizePerspectives(perspectives);

    res.json({
      result: output,
      councilPerspectives: Object.fromEntries(perspectives),
      synthesis
    });
  } catch (error) {
    console.error(`Module ${moduleId} with council execution failed:`, error);
    res.status(500).json({ error: 'Execution failed' });
  }
});

router.get('/modules/category/:category', (req: Request, res: Response) => {
  const executors = moduleRegistry.getByCategory(req.params.category);
  res.json({ modules: executors.map(e => e.definition) });
});

router.get('/modules/council/:councilId', (req: Request, res: Response) => {
  const executors = moduleRegistry.getByCouncil(req.params.councilId);
  res.json({ modules: executors.map(e => e.definition) });
});

export default router;
