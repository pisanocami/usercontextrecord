import { Router, Request, Response } from 'express';
import { COUNCIL_DEFINITIONS } from './definitions';
import { councilReasoning } from './reasoning';
import { MODULE_COUNCIL_MAP, SUPPORTING_COUNCILS } from './types';

const router = Router();

router.get('/councils', (_req: Request, res: Response) => {
  const councils = Object.values(COUNCIL_DEFINITIONS).map(council => ({
    id: council.id,
    name: council.name,
    description: council.description,
    expertise: council.expertise,
    decisionAuthority: council.decisionAuthority,
    isActive: council.isActive
  }));
  
  res.json({ councils });
});

router.get('/councils/:councilId', (req: Request, res: Response) => {
  const council = COUNCIL_DEFINITIONS[req.params.councilId];
  
  if (!council) {
    res.status(404).json({ error: 'Council not found' });
    return;
  }

  const governedModules = Object.entries(MODULE_COUNCIL_MAP)
    .filter(([_, councilId]) => councilId === req.params.councilId)
    .map(([moduleId]) => moduleId);

  const supportingFor = Object.entries(SUPPORTING_COUNCILS)
    .filter(([_, councils]) => councils.includes(req.params.councilId))
    .map(([moduleId]) => moduleId);

  res.json({
    council: {
      ...council,
      reasoningPrompt: undefined
    },
    governedModules,
    supportingFor
  });
});

router.post('/councils/:councilId/reason', async (req: Request, res: Response) => {
  const { councilId } = req.params;
  const { moduleData, brandContext } = req.body;

  const council = COUNCIL_DEFINITIONS[councilId];
  if (!council) {
    res.status(404).json({ error: 'Council not found' });
    return;
  }

  if (!council.isActive) {
    res.status(400).json({ error: 'Council is not active' });
    return;
  }

  try {
    const perspective = await councilReasoning.getCouncilPerspective(
      councilId,
      moduleData,
      brandContext
    );

    if (!perspective) {
      res.status(500).json({ error: 'Failed to get council perspective' });
      return;
    }

    res.json({ perspective });
  } catch (error) {
    console.error(`Council ${councilId} reasoning failed:`, error);
    res.status(500).json({ error: 'Council reasoning failed' });
  }
});

router.post('/councils/synthesize', async (req: Request, res: Response) => {
  const { perspectives } = req.body;

  if (!perspectives || typeof perspectives !== 'object') {
    res.status(400).json({ error: 'Perspectives object required' });
    return;
  }

  try {
    const perspectivesMap = new Map(Object.entries(perspectives));
    const synthesis = await councilReasoning.synthesizePerspectives(perspectivesMap as any);
    
    res.json({ synthesis });
  } catch (error) {
    console.error('Synthesis failed:', error);
    res.status(500).json({ error: 'Synthesis failed' });
  }
});

router.get('/councils/mappings', (_req: Request, res: Response) => {
  res.json({
    moduleCouncilMap: MODULE_COUNCIL_MAP,
    supportingCouncils: SUPPORTING_COUNCILS
  });
});

export default router;
