import { useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  NodeProps,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './App.css';

// The 3 tiers with their themes
const tiers = {
  setup: {
    label: 'MISSION BRIEFING',
    color: '#00D4FF',
    icon: '📋'
  },
  builder: {
    label: 'BUILDER',
    color: '#FFE81F',
    icon: '🔨'
  },
  reviewer: {
    label: 'REVIEWER',
    color: '#9d4edd',
    icon: '👁️'
  },
  architect: {
    label: 'ARCHITECT',
    color: '#00FF41',
    icon: '🏛️'
  },
};

// Steps organized by tier
const steps = [
  // Setup Phase
  {
    id: 'goal',
    tier: 'setup',
    title: 'Define GOAL.md',
    description: 'What you want to build',
    code: `# Project Goal\n\n## Objective\nBuild a REST API for user management\n\n## Success Criteria\n- [ ] CRUD operations\n- [ ] Tests pass\n- [ ] Docs complete`,
  },
  {
    id: 'config',
    tier: 'setup',
    title: 'Configure Pipeline',
    description: 'Set up 3-tier roles',
    code: `{\n  "builder": { "auth_mode": "glm" },\n  "reviewer": { "enabled": true },\n  "architect": { "enabled": true }\n}`,
  },
  {
    id: 'launch',
    tier: 'setup',
    title: 'Launch Container',
    description: 'docker compose run ralph',
    code: `RALPH_PROJECT_DIR=./.projects/my-project \\\n  docker compose run --rm ralph`,
  },

  // Builder Tier
  {
    id: 'builder-read',
    tier: 'builder',
    title: 'Read State',
    description: 'Check GOAL.md & progress',
    code: `# Builder reads:\n- GOAL.md (objectives)\n- .project/state/ (current focus)\n- Git history (what\'s done)`,
  },
  {
    id: 'builder-implement',
    tier: 'builder',
    title: 'Implement',
    description: 'Write code & tests',
    code: `# Builder follows AGENTS.md rules:\n- No mock data\n- No TODO comments\n- Files < 300 lines`,
  },
  {
    id: 'builder-commit',
    tier: 'builder',
    title: 'Commit',
    description: 'Save to git history',
    code: `git add .\ngit commit -m "feat: implement feature"\n\n# Write work summary:\necho "..." > .project/state/work-summary.md`,
  },
  {
    id: 'builder-complete-check',
    tier: 'builder',
    title: 'DONE?',
    description: 'Project complete?',
    code: `# Builder checks GOAL.md criteria:\n# If all objectives met:\necho "COMPLETE" > .project/state/completion.txt\n\n# Otherwise: continue iterating`,
  },

  // Reviewer Tier
  {
    id: 'reviewer-check',
    tier: 'reviewer',
    title: 'Quality Check',
    description: 'Review implementation',
    code: `# Reviewer evaluates:\n- Code quality\n- Test coverage\n- AGENTS.md compliance`,
  },
  {
    id: 'reviewer-decide',
    tier: 'reviewer',
    title: 'PASS / FAIL',
    description: 'Write decision file',
    code: `# If good:\necho "PASS" > .project/review/decision.txt\n\n# If issues:\necho "FAIL" > .project/review/decision.txt\necho "Fix X" > .project/review/feedback.md`,
  },

  // Architect Tier
  {
    id: 'architect-review',
    tier: 'architect',
    title: 'Architecture Review',
    description: 'High-level assessment',
    code: `# Architect reviews:\n- System design\n- Scalability concerns\n- Security patterns`,
  },
  {
    id: 'architect-decide',
    tier: 'architect',
    title: 'APPROVE / REJECT',
    description: 'Final decision',
    code: `# If sound:\necho "APPROVE" > .project/architect/decision.txt\n\n# If concerns:\necho "REJECT" > .project/architect/decision.txt`,
  },

  // Completion
  {
    id: 'complete',
    tier: 'setup',
    title: 'COMPLETE',
    description: 'Mission accomplished',
    code: `# Builder signals completion:\necho "COMPLETE" > .project/state/completion.txt\n\n# Loop exits successfully!\n# "The Force is strong with this one"`,
  },
];

// Layout positions (use Copy Positions button to update after dragging)
const positions: Record<string, { x: number; y: number }> = {
  // Setup column (left)
  'goal': { x: 50, y: 80 },
  'config': { x: 42, y: 199 },
  'launch': { x: 44, y: 311 },

  // Builder column
  'builder-read': { x: 287, y: 152 },
  'builder-implement': { x: 296, y: 266 },
  'builder-commit': { x: 296, y: 381 },

  // Builder complete check (between builder and reviewer)
  'builder-complete-check': { x: 470, y: 200 },

  // Reviewer column
  'reviewer-check': { x: 675, y: 203 },
  'reviewer-decide': { x: 694, y: 333 },

  // Architect column (right)
  'architect-review': { x: 925, y: 188 },
  'architect-decide': { x: 845, y: 382 },

  // Complete (bottom)
  'complete': { x: 660, y: 495 },
};

// Tier header node
function TierHeader({ data }: NodeProps) {
  const d = data as { visible?: boolean; color?: string; icon?: string; label?: string; subtitle?: string };
  return (
    <div
      className={`tier-header ${d.visible ? 'visible' : ''}`}
      style={{ '--tier-color': d.color } as React.CSSProperties}
    >
      <span className="tier-icon">{d.icon}</span>
      <div className="tier-info">
        <div className="tier-label">{d.label}</div>
        {d.subtitle && <div className="tier-subtitle">{d.subtitle}</div>}
      </div>
    </div>
  );
}

// Step node
function StepNode({ data, id }: NodeProps) {
  const d = data as { visible?: boolean; active?: boolean; label?: string; description?: string };
  const step = steps.find(s => s.id === id);
  const tier = tiers[step?.tier as keyof typeof tiers];

  return (
    <div
      className={`step-node ${d.visible ? 'visible' : ''} ${d.active ? 'active' : ''}`}
      style={{ '--node-color': tier?.color } as React.CSSProperties}
    >
      <Handle type="target" position={Position.Top} className="step-handle" />
      <Handle type="target" position={Position.Left} id="target-left" className="step-handle" />
      <Handle type="target" position={Position.Right} id="target-right" className="step-handle" />
      <div className="step-title">{d.label}</div>
      <div className="step-desc">{d.description}</div>
      <Handle type="source" position={Position.Bottom} className="step-handle" />
      <Handle type="source" position={Position.Right} id="source-right" className="step-handle" />
    </div>
  );
}

// Decision node (diamond shape via CSS)
function DecisionNode({ data, id }: NodeProps) {
  const d = data as { visible?: boolean; active?: boolean; label?: string };
  const step = steps.find(s => s.id === id);
  const tier = tiers[step?.tier as keyof typeof tiers];

  return (
    <div
      className={`decision-node ${d.visible ? 'visible' : ''} ${d.active ? 'active' : ''}`}
      style={{ '--node-color': tier?.color } as React.CSSProperties}
    >
      <Handle type="target" position={Position.Top} className="decision-handle" />
      <Handle type="target" position={Position.Left} id="left" className="decision-handle" />
      <Handle type="target" position={Position.Bottom} id="bottom" className="decision-handle" />
      <div className="decision-content">
        <div className="decision-title">{d.label}</div>
      </div>
      <Handle type="source" position={Position.Top} id="top" className="decision-handle" />
      <Handle type="source" position={Position.Left} id="source-left" className="decision-handle" />
      <Handle type="source" position={Position.Bottom} id="source-bottom" className="decision-handle" />
      <Handle type="source" position={Position.Right} id="right" className="decision-handle" />
    </div>
  );
}

// Code panel node
function CodePanel({ data }: NodeProps) {
  const d = data as { visible?: boolean; filename?: string; code?: string };
  return (
    <div className={`code-panel ${d.visible ? 'visible' : ''}`}>
      <div className="code-header">
        <div className="code-dots">
          <span className="dot red" />
          <span className="dot yellow" />
          <span className="dot green" />
        </div>
        <span className="code-filename">{d.filename}</span>
      </div>
      <pre className="code-body"><code>{d.code}</code></pre>
    </div>
  );
}

const nodeTypes = {
  tierHeader: TierHeader,
  step: StepNode,
  decision: DecisionNode,
  codePanel: CodePanel,
};

// Which tier header appears at which step index
const tierVisibility: Record<string, number> = {
  'tier-setup': 0,      // Appears with first step
  'tier-builder': 3,    // Appears when builder-read shows
  'tier-reviewer': 7,   // Appears when reviewer-check shows
  'tier-architect': 9,  // Appears when architect-review shows
};

function createNodes(): Node[] {
  const nodes: Node[] = [];

  // Tier headers (all start hidden)
  nodes.push(
    { id: 'tier-setup', type: 'tierHeader', position: { x: 44, y: 10 }, data: { ...tiers.setup, visible: false }, draggable: false },
    { id: 'tier-builder', type: 'tierHeader', position: { x: 287, y: 80 }, data: { ...tiers.builder, visible: false }, draggable: false },
    { id: 'tier-reviewer', type: 'tierHeader', position: { x: 675, y: 120 }, data: { ...tiers.reviewer, visible: false }, draggable: false },
    { id: 'tier-architect', type: 'tierHeader', position: { x: 925, y: 120 }, data: { ...tiers.architect, visible: false }, draggable: false },
  );

  // Step nodes
  steps.forEach(step => {
    const isDecision = step.id.includes('decide') || step.id.includes('complete-check');
    nodes.push({
      id: step.id,
      type: isDecision ? 'decision' : 'step',
      position: positions[step.id],
      data: {
        label: step.title,
        description: step.description,
        visible: false,
        active: false,
      },
      draggable: true,
    });
  });

  // Code panel
  nodes.push({
    id: 'code-panel',
    type: 'codePanel',
    position: { x: 1100, y: 300 },
    data: { filename: 'Click Next to begin...', code: '// Step through the workflow\n// to see code examples', visible: true },
    draggable: true,
  });

  return nodes;
}

function createEdges(): Edge[] {
  return [
    // Setup flow
    { id: 'e-goal-config', source: 'goal', target: 'config', hidden: true },
    { id: 'e-config-launch', source: 'config', target: 'launch', hidden: true },
    { id: 'e-launch-builder', source: 'launch', sourceHandle: 'source-right', target: 'builder-read', targetHandle: 'target-left', type: 'smoothstep', hidden: true },

    // Builder flow
    { id: 'e-read-impl', source: 'builder-read', target: 'builder-implement', hidden: true },
    { id: 'e-impl-commit', source: 'builder-implement', target: 'builder-commit', hidden: true },
    { id: 'e-commit-complete', source: 'builder-commit', sourceHandle: 'source-right', target: 'builder-complete-check', targetHandle: 'bottom', type: 'smoothstep', hidden: true },
    // NO: loop back to builder (from top of DONE? to right of Read)
    { id: 'e-complete-no', source: 'builder-complete-check', sourceHandle: 'top', target: 'builder-read', targetHandle: 'target-right', style: { stroke: '#FF6B6B' }, type: 'smoothstep', label: 'NO', labelStyle: { fill: '#FF6B6B', fontWeight: 700, fontSize: 10 }, labelBgPadding: [4, 6] as [number, number], labelBgBorderRadius: 4, labelBgStyle: { fill: '#0a0a1a', stroke: '#FF6B6B', strokeWidth: 1 }, hidden: true },
    // YES: forward to reviewer
    { id: 'e-complete-yes', source: 'builder-complete-check', sourceHandle: 'right', target: 'reviewer-check', targetHandle: 'target-left', style: { stroke: '#00FF41' }, type: 'smoothstep', label: 'YES', labelStyle: { fill: '#00FF41', fontWeight: 700, fontSize: 10 }, labelBgPadding: [4, 6] as [number, number], labelBgBorderRadius: 4, labelBgStyle: { fill: '#0a0a1a', stroke: '#00FF41', strokeWidth: 1 }, hidden: true },

    // Reviewer flow
    { id: 'e-check-decide', source: 'reviewer-check', target: 'reviewer-decide', hidden: true },
    // PASS: forward to architect
    { id: 'e-reviewer-pass', source: 'reviewer-decide', sourceHandle: 'right', target: 'architect-review', targetHandle: 'target-left', style: { stroke: '#00FF41' }, type: 'smoothstep', label: 'PASS', labelStyle: { fill: '#00FF41', fontWeight: 700, fontSize: 10 }, labelBgPadding: [4, 6] as [number, number], labelBgBorderRadius: 4, labelBgStyle: { fill: '#0a0a1a', stroke: '#00FF41', strokeWidth: 1 }, hidden: true },
    // FAIL: loop back to builder (from left of decide to right of Read)
    { id: 'e-reviewer-fail', source: 'reviewer-decide', sourceHandle: 'source-left', target: 'builder-read', targetHandle: 'target-right', style: { stroke: '#FF6B6B' }, type: 'smoothstep', label: 'FAIL', labelStyle: { fill: '#FF6B6B', fontWeight: 700, fontSize: 10 }, labelBgPadding: [4, 6] as [number, number], labelBgBorderRadius: 4, labelBgStyle: { fill: '#0a0a1a', stroke: '#FF6B6B', strokeWidth: 1 }, hidden: true },

    // Architect flow
    { id: 'e-arch-review-decide', source: 'architect-review', target: 'architect-decide', hidden: true },
    // APPROVE: forward to complete (from bottom of decide to top of complete)
    { id: 'e-arch-approve', source: 'architect-decide', sourceHandle: 'source-bottom', target: 'complete', style: { stroke: '#00FF41' }, type: 'smoothstep', label: 'APPROVE', labelStyle: { fill: '#00FF41', fontWeight: 700, fontSize: 10 }, labelBgPadding: [4, 6] as [number, number], labelBgBorderRadius: 4, labelBgStyle: { fill: '#0a0a1a', stroke: '#00FF41', strokeWidth: 1 }, hidden: true },
    // REJECT: loop back to builder (from left of decide to right of Read)
    { id: 'e-arch-reject', source: 'architect-decide', sourceHandle: 'source-left', target: 'builder-read', targetHandle: 'target-right', style: { stroke: '#FF6B6B' }, type: 'smoothstep', label: 'REJECT', labelStyle: { fill: '#FF6B6B', fontWeight: 700, fontSize: 10 }, labelBgPadding: [4, 6] as [number, number], labelBgBorderRadius: 4, labelBgStyle: { fill: '#0a0a1a', stroke: '#FF6B6B', strokeWidth: 1 }, hidden: true },
  ];
}

export default function App() {
  const [currentStep, setCurrentStep] = useState(-1);
  const [nodes, setNodes, onNodesChange] = useNodesState(createNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(createEdges());

  const stepOrder = ['goal', 'config', 'launch', 'builder-read', 'builder-implement', 'builder-commit', 'builder-complete-check', 'reviewer-check', 'reviewer-decide', 'architect-review', 'architect-decide', 'complete'];

  // Ensure all edges are hidden on mount
  useEffect(() => {
    setEdges(eds => eds.map(edge => ({ ...edge, hidden: true })));
  }, []);

  const updateVisibility = useCallback((stepIndex: number) => {
    const activeId = stepOrder[stepIndex];
    const step = steps.find(s => s.id === activeId);

    setNodes(nds => nds.map(node => {
      // Code panel - always visible, just update content
      if (node.type === 'codePanel') {
        return {
          ...node,
          data: {
            ...node.data,
            filename: step ? `${step.tier.toUpperCase()} — ${step.title}` : 'Click Next to begin...',
            code: step?.code || '// Step through the workflow\n// to see code examples',
          }
        };
      }

      // Tier headers - appear at specific step indices
      if (node.type === 'tierHeader') {
        const showAt = tierVisibility[node.id];
        return {
          ...node,
          data: {
            ...node.data,
            visible: stepIndex >= showAt,
          }
        };
      }

      // Step nodes - appear in order
      const nodeIndex = stepOrder.indexOf(node.id);
      return {
        ...node,
        data: {
          ...node.data,
          visible: nodeIndex >= 0 && nodeIndex <= stepIndex,
          active: node.id === activeId,
        }
      };
    }));

    // Edges - visible when BOTH source AND target are visible
    setEdges(eds => eds.map(edge => {
      const sourceIndex = stepOrder.indexOf(edge.source);
      const targetIndex = stepOrder.indexOf(edge.target);

      // Edge appears when BOTH endpoints are visible
      const sourceVisible = sourceIndex >= 0 && sourceIndex <= stepIndex;
      const targetVisible = targetIndex >= 0 && targetIndex <= stepIndex;
      const isVisible = sourceVisible && targetVisible;

      // Animate when the LATER node (max index) just appeared
      const appearStep = Math.max(sourceIndex, targetIndex);
      const isAnimated = appearStep === stepIndex;

      return {
        ...edge,
        hidden: !isVisible,
        animated: isAnimated,
      };
    }));
  }, [setNodes, setEdges]);

  const handleNext = useCallback(() => {
    if (currentStep < stepOrder.length - 1) {
      const next = currentStep + 1;
      setCurrentStep(next);
      updateVisibility(next);
    }
  }, [currentStep, updateVisibility]);

  const handlePrev = useCallback(() => {
    if (currentStep > -1) {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      updateVisibility(prev);
    }
  }, [currentStep, updateVisibility]);

  const handleReset = useCallback(() => {
    setCurrentStep(-1);
    updateVisibility(-1);
  }, [updateVisibility]);

  const handleCopyPositions = useCallback(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    nodes.forEach(node => {
      if (node.type !== 'tierHeader' && node.type !== 'codePanel') {
        positions[node.id] = { x: Math.round(node.position.x), y: Math.round(node.position.y) };
      }
    });
    const code = `const positions: Record<string, { x: number; y: number }> = ${JSON.stringify(positions, null, 2)};`;
    navigator.clipboard.writeText(code);
    alert('Positions copied to clipboard! Paste into App.tsx to save.');
  }, [nodes]);

  return (
    <div className="app">
      <header className="header">
        <h1>How Ralph Wiggum Works</h1>
        <p className="tagline">3-Tier Autonomous AI Agent Loop</p>
      </header>

      <div className="canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={{ style: { stroke: '#FFE81F', strokeWidth: 2 }, type: 'smoothstep', hidden: true }}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.4}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(255,232,31,0.08)" />
        </ReactFlow>
      </div>

      <footer className="controls">
        <button onClick={handlePrev} disabled={currentStep < 0} className="btn">
          ◀ Previous
        </button>
        <div className="progress">
          <span className="current">{Math.max(0, currentStep + 1)}</span>
          <span className="sep">/</span>
          <span className="total">{stepOrder.length}</span>
        </div>
        <button onClick={handleNext} disabled={currentStep >= stepOrder.length - 1} className="btn primary">
          Next ▶
        </button>
        <button onClick={handleReset} className="btn ghost">Reset</button>
        <button onClick={handleCopyPositions} className="btn ghost">📋 Copy Positions</button>
      </footer>
    </div>
  );
}
