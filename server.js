const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

const LINEAR_SIGNING_SECRET = process.env.LINEAR_SIGNING_SECRET;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));

function verifyLinearSignature(payload, signature) {
  if (!LINEAR_SIGNING_SECRET) {
    console.warn('WARNING: No LINEAR_SIGNING_SECRET set');
    return true;
  }
  
  console.log('Verifying signature...');
  console.log('Received signature:', signature);
  console.log('Secret (first 10 chars):', LINEAR_SIGNING_SECRET.substring(0, 10) + '...');
  
  const hmac = crypto.createHmac('sha256', LINEAR_SIGNING_SECRET);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  
  console.log('Expected signature:', expectedSignature);
  console.log('Signatures match:', signature === expectedSignature);
  
  return signature === expectedSignature;
}

// Agent profiles for MENDICANT_BIAS orchestration
const AGENT_PROFILES = {
  'the_didact': {
    emoji: '🔍',
    role: 'Research & Intelligence',
    color: 0x3498DB,
    description: 'Web scraping, documentation, competitive analysis'
  },
  'hollowed_eyes': {
    emoji: '⚙️',
    role: 'Implementation & Code',
    color: 0x2ECC71,
    description: 'Development, GitHub operations, MCP integration'
  },
  'loveless': {
    emoji: '🛡️',
    role: 'QA & Security',
    color: 0xE74C3C,
    description: 'Testing, security analysis, cross-browser validation'
  },
  'zhadyz': {
    emoji: '🚀',
    role: 'DevOps & Releases',
    color: 0x9B59B6,
    description: 'CI/CD, deployments, cleanup operations'
  },
  'the_architect': {
    emoji: '🏗️',
    role: 'System Architecture',
    color: 0x34495E,
    description: 'Design patterns, technical decisions, scalability'
  },
  'the_librarian': {
    emoji: '📚',
    role: 'Requirements & Clarification',
    color: 0x16A085,
    description: 'Stakeholder communication, spec expansion'
  },
  'the_oracle': {
    emoji: '🔮',
    role: 'Strategic Validation',
    color: 0xF39C12,
    description: 'Decision validation, failure analysis, risk assessment'
  },
  'the_sentinel': {
    emoji: '⚡',
    role: 'CI/CD Pipelines',
    color: 0xE67E22,
    description: 'GitHub Actions, automation, build processes'
  },
  'the_curator': {
    emoji: '🧹',
    role: 'Repository Maintenance',
    color: 0x95A5A6,
    description: 'Code cleanup, dependency updates, housekeeping'
  },
  'the_scribe': {
    emoji: '✍️',
    role: 'Documentation',
    color: 0x3498DB,
    description: 'Technical writing, API docs, README maintenance'
  },
  'the_analyst': {
    emoji: '📊',
    role: 'Data & Analytics',
    color: 0x1ABC9C,
    description: 'Performance metrics, business intelligence'
  },
  'cinna': {
    emoji: '🎨',
    role: 'Design & UI/UX',
    color: 0xE91E63,
    description: 'Design systems, user experience, visual design'
  },
  'the_cartographer': {
    emoji: '🗺️',
    role: 'Deployment & Infrastructure',
    color: 0x607D8B,
    description: 'Infrastructure planning, deployment strategies'
  }
};

function getAgentInfo(agentName) {
  const agent = AGENT_PROFILES[agentName];
  if (agent) {
    return `${agent.emoji} **${agentName}**\n> *${agent.role}* - ${agent.description}`;
  }
  return `🤖 **${agentName}**`;
}

function detectOrchestrationPhase(issue) {
  const title = (issue.title || '').toLowerCase();
  const desc = (issue.description || '').toLowerCase();
  const combined = title + ' ' + desc;

  if (combined.includes('planning') || combined.includes('strategic analysis')) {
    return { phase: 'Planning', emoji: '📋' };
  } else if (combined.includes('implementation') || combined.includes('coding')) {
    return { phase: 'Implementation', emoji: '⚙️' };
  } else if (combined.includes('verification') || combined.includes('testing')) {
    return { phase: 'Verification', emoji: '✅' };
  } else if (combined.includes('deployment') || combined.includes('release')) {
    return { phase: 'Deployment', emoji: '🚀' };
  } else if (combined.includes('iteration') || combined.includes('fix')) {
    return { phase: 'Iteration', emoji: '🔄' };
  }
  return null;
}

function formatDiscordMessage(event) {
  const { action, type, data, createdAt } = event;

  const emojis = {
    Issue: '📋',
    Comment: '💬',
    Project: '📊',
    IssueLabel: '🏷️'
  };

  const actionEmojis = {
    create: '✨',
    update: '🔄',
    remove: '🗑️'
  };

  const emoji = emojis[type] || '📌';
  const actionEmoji = actionEmojis[action] || '•';

  let title = '';
  let description = '';
  let color = 0x5E6AD2;
  let url = '';
  let fields = [];

  if (type === 'Issue') {
    const issue = data;
    const identifier = issue.identifier || '';

    // Check for orchestration activity
    const isOrchestration = (issue.description && issue.description.includes('MENDICANT_BIAS')) ||
                           (issue.delegate && AGENT_PROFILES[issue.delegate.name]);

    const orchestrationPhase = detectOrchestrationPhase(issue);

    if (isOrchestration) {
      color = 0xFF6B6B;
      if (orchestrationPhase) {
        title = `${orchestrationPhase.emoji} ${actionEmoji} ${orchestrationPhase.phase}: ${identifier}`;
      } else {
        title = '🧠 ' + actionEmoji + ' Orchestration: ' + identifier;
      }
    } else {
      title = emoji + ' ' + actionEmoji + ' Issue ' + action + 'd: ' + identifier;
    }

    // Build rich description
    description = '**' + (issue.title || 'No title') + '**';
    url = issue.url || '';

    // Status with emoji
    if (issue.state && issue.state.name) {
      const statusEmojis = {
        'Todo': '⏳',
        'In Progress': '🔄',
        'Done': '✅',
        'Canceled': '❌',
        'Backlog': '📝'
      };
      const statusEmoji = statusEmojis[issue.state.name] || '•';
      fields.push({
        name: 'Status',
        value: statusEmoji + ' ' + issue.state.name,
        inline: true
      });
    }

    // Priority
    if (issue.priority !== undefined) {
      const priorities = ['None', '🔥 Urgent', '⬆️ High', '➡️ Normal', '⬇️ Low'];
      fields.push({
        name: 'Priority',
        value: priorities[issue.priority] || 'Unknown',
        inline: true
      });
    }

    // Assignee
    if (issue.assignee && issue.assignee.name) {
      fields.push({
        name: 'Assignee',
        value: '👤 ' + issue.assignee.name,
        inline: true
      });
    }

    // Agent/Delegate - DETAILED
    if (issue.delegate && issue.delegate.name) {
      const agentInfo = getAgentInfo(issue.delegate.name);
      const agentProfile = AGENT_PROFILES[issue.delegate.name];

      fields.push({
        name: 'Agent Assigned',
        value: agentInfo,
        inline: false
      });

      // Use agent-specific color if available
      if (agentProfile) {
        color = agentProfile.color;
      }
    }

    // Labels - with orchestration tags highlighted
    if (issue.labels && issue.labels.length > 0) {
      const orchestrationLabels = ['speculative-execution', 'emergent-collaboration',
                                   'strategy-shift', 'failure-pattern', 'adaptive-selection'];
      const regularLabels = [];
      const specialLabels = [];

      issue.labels.forEach(label => {
        if (orchestrationLabels.includes(label.name)) {
          specialLabels.push('🔶 ' + label.name);
        } else {
          regularLabels.push(label.name);
        }
      });

      const allLabels = [...specialLabels, ...regularLabels].join(', ');
      if (allLabels) {
        fields.push({
          name: 'Labels',
          value: allLabels,
          inline: false
        });
      }
    }

    // Due date
    if (issue.dueDate) {
      const dueDate = new Date(issue.dueDate);
      fields.push({
        name: 'Due Date',
        value: '📅 ' + dueDate.toLocaleDateString(),
        inline: true
      });
    }

    // Who made the change
    if (action === 'update' && issue.updatedBy && issue.updatedBy.name) {
      fields.push({
        name: 'Updated By',
        value: '✏️ ' + issue.updatedBy.name,
        inline: true
      });
    } else if (action === 'create' && issue.createdBy && issue.createdBy.name) {
      fields.push({
        name: 'Created By',
        value: '✨ ' + issue.createdBy.name,
        inline: true
      });
    }

    // Parent issue (for sub-tasks)
    if (issue.parent && issue.parent.identifier) {
      fields.push({
        name: 'Parent Issue',
        value: '↗️ ' + issue.parent.identifier + ': ' + (issue.parent.title || 'No title'),
        inline: false
      });
    }

    // Project
    if (issue.project && issue.project.name) {
      fields.push({
        name: 'Project',
        value: '📊 ' + issue.project.name,
        inline: true
      });
    }

  } else if (type === 'Comment') {
    const comment = data;
    title = emoji + ' ' + actionEmoji + ' Comment ' + action + 'd';
    description = comment.body ? comment.body.substring(0, 300) : 'No content';

    if (comment.user && comment.user.name) {
      description = '**' + comment.user.name + ':** ' + description;
    }

    url = comment.issue && comment.issue.url ? comment.issue.url : '';

    // Enhanced agent detection
    const agentNames = Object.keys(AGENT_PROFILES);
    const detectedAgent = agentNames.find(name => comment.body && comment.body.includes(name));

    if (detectedAgent) {
      color = AGENT_PROFILES[detectedAgent].color;
      title = AGENT_PROFILES[detectedAgent].emoji + ' ' + actionEmoji + ' Agent Activity: ' + detectedAgent;

      fields.push({
        name: 'Agent Detected',
        value: getAgentInfo(detectedAgent),
        inline: false
      });
    }

    // Check for orchestration keywords
    const orchestrationKeywords = ['ORCHESTRATING', 'PHASE', 'VERIFICATION', 'STRATEGIC ANALYSIS'];
    const hasOrchestration = orchestrationKeywords.some(kw =>
      comment.body && comment.body.toUpperCase().includes(kw)
    );

    if (hasOrchestration) {
      color = 0xFF6B6B;
      title = '🧠 ' + actionEmoji + ' Orchestration Update';
    }

  } else if (type === 'Project') {
    const project = data;
    title = emoji + ' ' + actionEmoji + ' Project ' + action + 'd';
    description = project.name || 'No name';
    url = project.url || '';
  }

  const embed = {
    title: title,
    description: description,
    color: color,
    timestamp: createdAt,
    footer: {
      text: 'Linear Webhook • MENDICANT_BIAS Orchestration',
      icon_url: 'https://asset.brandfetch.io/idarKiKkI-/idYW07k6CS.png'
    }
  };

  if (url) {
    embed.url = url;
  }

  if (fields.length > 0) {
    embed.fields = fields;
  }

  return { embeds: [embed] };
}

app.get('/', (req, res) => {
  res.json({ 
    status: 'running',
    message: 'Linear to Discord webhook bridge is active',
    timestamp: new Date().toISOString(),
    config: {
      hasSigningSecret: !!LINEAR_SIGNING_SECRET,
      hasDiscordWebhook: !!DISCORD_WEBHOOK_URL
    }
  });
});

app.post('/webhook', async (req, res) => {
  try {
    console.log('=== Webhook received ===');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    
    const signature = req.headers['linear-signature'];
    
    if (!signature) {
      console.error('No signature header found!');
      return res.status(401).json({ error: 'No signature provided' });
    }
    
    if (!verifyLinearSignature(req.rawBody, signature)) {
      console.error('Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    console.log('Signature verified successfully');
    
    const event = req.body;
    console.log('Event type:', event.type, 'Action:', event.action);
    
    const discordMessage = formatDiscordMessage(event);
    
    if (DISCORD_WEBHOOK_URL) {
      await axios.post(DISCORD_WEBHOOK_URL, discordMessage);
      console.log('Sent to Discord successfully');
    } else {
      console.warn('No DISCORD_WEBHOOK_URL set');
    }
    
    res.status(200).json({ received: true });
    
  } catch (error) {
    console.error('Error processing webhook:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log('=== Linear to Discord Bridge ===');
  console.log('Port:', PORT);
  console.log('Signing secret configured:', !!LINEAR_SIGNING_SECRET);
  console.log('Discord webhook configured:', !!DISCORD_WEBHOOK_URL);
  if (LINEAR_SIGNING_SECRET) {
    console.log('Secret prefix:', LINEAR_SIGNING_SECRET.substring(0, 10) + '...');
  }
});
