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
  
  const hmac = crypto.createHmac('sha256', LINEAR_SIGNING_SECRET);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  
  return signature === expectedSignature;
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
  
  if (type === 'Issue') {
    const issue = data;
    const identifier = issue.identifier || '';
    title = emoji + ' ' + actionEmoji + ' Issue ' + action + 'd: ' + identifier;
    description = issue.title || 'No title';
    url = issue.url || '';
    
    if (issue.state && issue.state.name) {
      description += '\n**Status:** ' + issue.state.name;
    }
    
    if (issue.assignee && issue.assignee.name) {
      description += '\n**Assignee:** ' + issue.assignee.name;
    }
    
    if (issue.priority !== undefined) {
      const priorities = ['None', '🔥 Urgent', '⬆️ High', '➡️ Normal', '⬇️ Low'];
      description += '\n**Priority:** ' + (priorities[issue.priority] || 'Unknown');
    }
    
    if (action === 'update' && issue.description && issue.description.includes('MENDICANT_BIAS')) {
      color = 0xFF6B6B;
      title = '🧠 ' + actionEmoji + ' Orchestration Activity';
    }
  } else if (type === 'Comment') {
    const comment = data;
    title = emoji + ' ' + actionEmoji + ' Comment ' + action + 'd';
    description = comment.body ? comment.body.substring(0, 200) : 'No content';
    
    if (comment.user && comment.user.name) {
      description = '**' + comment.user.name + ':** ' + description;
    }
    
    url = comment.issue && comment.issue.url ? comment.issue.url : '';
    
    const agentNames = ['hollowed_eyes', 'loveless', 'the_didact', 'MENDICANT_BIAS'];
    const hasAgent = comment.body && agentNames.some(name => comment.body.includes(name));
    
    if (hasAgent) {
      color = 0x00D9FF;
      title = '👁️ ' + actionEmoji + ' Agent Activity';
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
      text: 'Linear Webhook',
      icon_url: 'https://asset.brandfetch.io/idarKiKkI-/idYW07k6CS.png'
    }
  };
  
  if (url) {
    embed.url = url;
  }
  
  return { embeds: [embed] };
}

app.get('/', (req, res) => {
  res.json({ 
    status: 'running',
    message: 'Linear to Discord webhook bridge is active',
    timestamp: new Date().toISOString()
  });
});

app.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['linear-signature'];
    if (!verifyLinearSignature(req.rawBody, signature)) {
      console.error('Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    console.log('Signature verified');
    
    const event = req.body;
    console.log('Received event:', event.type, event.action);
    
    const discordMessage = formatDiscordMessage(event);
    
    if (DISCORD_WEBHOOK_URL) {
      await axios.post(DISCORD_WEBHOOK_URL, discordMessage);
      console.log('Sent to Discord');
    } else {
      console.warn('No DISCORD_WEBHOOK_URL set');
    }
    
    res.status(200).json({ received: true });
    
  } catch (error) {
    console.error('Error processing webhook:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log('Linear to Discord bridge running on port ' + PORT);
  console.log('Webhook endpoint: http://localhost:' + PORT + '/webhook');
  console.log('Signature verification: ' + (LINEAR_SIGNING_SECRET ? 'ENABLED' : 'DISABLED'));
  console.log('Discord webhook: ' + (DISCORD_WEBHOOK_URL ? 'CONFIGURED' : 'NOT SET'));
});
