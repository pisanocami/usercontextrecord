import { Router, Request, Response } from 'express';
import { moduleRegistry } from './registry';
import { councilReasoning } from '../councils/reasoning';
import { playbookExecutor } from '../playbooks/executor';
import { requireValidUCR, type UCRSnapshot } from '../ucr/controller';
import { storage } from '../storage';
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

router.post('/modules/:moduleId/execute', requireValidUCR(), async (req: Request, res: Response) => {
  const { moduleId } = req.params;
  const executor = moduleRegistry.get(moduleId);
  const ucr = (req as any).ucr as UCRSnapshot;
  
  if (!executor) {
    res.status(404).json({ error: 'Module not found' });
    return;
  }

  try {
    const enrichedInput = {
      ...req.body,
      ucrContext: {
        domain: ucr.brand?.domain,
        competitors: ucr.competitors?.direct || [],
        negativeScope: ucr.negative_scope,
        demandDefinition: ucr.demand_definition,
        categoryDefinition: ucr.category_definition,
        strategicIntent: ucr.strategic_intent,
      },
    };

    const validation = executor.validate(enrichedInput);
    if (!validation.valid) {
      res.status(400).json({ error: 'Validation failed', details: validation.errors });
      return;
    }

    const output = await executor.execute(enrichedInput);
    
    const playbookResult = await playbookExecutor.execute(moduleId, enrichedInput, output);
    
    const finalOutput = {
      ...output,
      insights: playbookResult.insights,
      recommendations: playbookResult.recommendations,
      deprioritizedActions: playbookResult.deprioritized,
      ucrSnapshot: {
        hash: ucr.snapshotHash,
        validatedAt: ucr.snapshotAt,
        isCMOSafe: ucr.validation.isCMOSafe,
      },
    };

    const userId = (req as any).user?.id || "anonymous-user";
    const contextId = ucr.id;
    const brandId = ucr.brandId;

    if (!brandId) {
      console.warn(`Cannot save exec report for ${moduleId}: missing brandId in UCR`);
    } else {
      try {
        await storage.createExecReport({
          contextId,
          brandId,
          tenantId: ucr.tenantId,
          userId,
          moduleId,
          moduleName: executor.definition.name,
          status: "completed",
          confidence: output.confidence || 0,
          hasData: output.hasData || false,
          insights: playbookResult.insights || [],
          recommendations: playbookResult.recommendations || [],
          rawOutput: output,
          ucrSnapshotHash: ucr.snapshotHash,
        });
      } catch (saveError) {
        console.warn(`Failed to save exec report for ${moduleId}:`, saveError);
      }
    }

    res.json({ result: finalOutput });
  } catch (error) {
    console.error(`Module ${moduleId} execution failed:`, error);
    res.status(500).json({ error: 'Module execution failed' });
  }
});

router.post('/modules/:moduleId/execute-with-council', requireValidUCR(), async (req: Request, res: Response) => {
  const { moduleId } = req.params;
  const executor = moduleRegistry.get(moduleId);
  const ucr = (req as any).ucr as UCRSnapshot;
  
  if (!executor) {
    res.status(404).json({ error: 'Module not found' });
    return;
  }

  try {
    const enrichedInput = {
      ...req.body,
      ucrContext: {
        domain: ucr.brand?.domain,
        competitors: ucr.competitors?.direct || [],
        negativeScope: ucr.negative_scope,
        demandDefinition: ucr.demand_definition,
        categoryDefinition: ucr.category_definition,
        strategicIntent: ucr.strategic_intent,
      },
    };

    const output = await executor.execute(enrichedInput);
    
    const brandContextStr = JSON.stringify({
      brand: ucr.brand,
      competitors: ucr.competitors,
      category: ucr.category_definition,
      strategic: ucr.strategic_intent,
    });
    
    const perspectives = await councilReasoning.getModulePerspectives(
      moduleId,
      output.rawData,
      brandContextStr
    );

    const synthesis = await councilReasoning.synthesizePerspectives(perspectives);

    const enforcedSynthesis = ucr.negative_scope
      ? councilReasoning.applyGuardrailsToSynthesis(
          synthesis,
          ucr.negative_scope,
          ucr.strategic_intent
        )
      : synthesis;

    const guardrailEnforcement = (enforcedSynthesis as any).guardrailEnforcement;
    const hasBlockedViolations = guardrailEnforcement && !guardrailEnforcement.passed;

    if (hasBlockedViolations && guardrailEnforcement.enforcementLevel === "strict") {
      return res.status(409).json({
        error: "GUARDRAIL_VIOLATION",
        message: guardrailEnforcement.summary,
        result: output,
        synthesis: enforcedSynthesis,
        violations: guardrailEnforcement.violations,
        requiresHumanOverride: true,
        ucrSnapshot: {
          hash: ucr.snapshotHash,
          validatedAt: ucr.snapshotAt,
          isCMOSafe: ucr.validation.isCMOSafe,
        },
      });
    }

    const userId = (req as any).user?.id || "anonymous-user";
    const contextId = ucr.id;
    const brandId = ucr.brandId;

    if (!brandId) {
      console.warn(`Cannot save exec report for ${moduleId}: missing brandId in UCR`);
    } else {
      try {
        await storage.createExecReport({
          contextId,
          brandId,
          tenantId: ucr.tenantId,
          userId,
          moduleId,
          moduleName: executor.definition.name,
          status: "completed",
          confidence: output.confidence || 0,
          hasData: output.hasData || false,
          insights: (enforcedSynthesis as any).insights || [],
          recommendations: (enforcedSynthesis as any).recommendations || [],
          rawOutput: output,
          councilPerspectives: Object.fromEntries(perspectives),
          synthesis: enforcedSynthesis,
          guardrailStatus: guardrailEnforcement || null,
          ucrSnapshotHash: ucr.snapshotHash,
        });
      } catch (saveError) {
        console.warn(`Failed to save exec report for ${moduleId}:`, saveError);
      }
    }

    res.json({
      result: output,
      councilPerspectives: Object.fromEntries(perspectives),
      synthesis: enforcedSynthesis,
      guardrailStatus: guardrailEnforcement ? {
        passed: guardrailEnforcement.passed,
        summary: guardrailEnforcement.summary,
        enforcementLevel: guardrailEnforcement.enforcementLevel,
      } : null,
      ucrSnapshot: {
        hash: ucr.snapshotHash,
        validatedAt: ucr.snapshotAt,
        isCMOSafe: ucr.validation.isCMOSafe,
      },
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
