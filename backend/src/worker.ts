/**
 * Background worker process. Run separately from the API in its own ECS task:
 *   node dist/worker.js
 *
 * Handles:
 *   - notifications      : email/push fanout via SES
 *   - ticketing          : SLA breach + escalation cascades
 *   - hr-workflows       : onboarding/offboarding stage automation
 *   - scheduled-checks   : repeatable cron-style sweeps
 *   - integrations-sync  : HubSpot / Office 365 syncs
 *   - email              : transactional email via SES
 */

import { Worker, Job } from 'bullmq';
import { createBullConnection, publishRealtime } from './lib/redis.js';
import { db } from './db/connection.js';
import { logger } from './lib/logger.js';
import { config } from './config/index.js';
import { QUEUE_NAMES, getQueue } from './lib/queues.js';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({ region: config.ses.region });

// ---------- helpers ----------
async function sendEmail(to: string, subject: string, html: string, text?: string) {
  if (!config.ses.fromAddress || config.ses.fromAddress.endsWith('@nexuscrm.local')) {
    logger.info({ to, subject }, '[email] SES not configured — skipping');
    return;
  }
  await ses.send(
    new SendEmailCommand({
      Source: config.ses.fromAddress,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject },
        Body: {
          Html: { Data: html },
          Text: { Data: text || html.replace(/<[^>]+>/g, '') },
        },
      },
    }),
  );
}

// ---------- notifications worker ----------
new Worker(
  QUEUE_NAMES.notifications,
  async (job: Job) => {
    const { user_id, title, message, type, category, reference_id, reference_type, tenant_id, channels } = job.data;
    // 1) Persist the in-app notification
    const [row] = await db('notifications')
      .insert({ user_id, title, message, type, category, reference_id, reference_type, tenant_id })
      .returning('*');
    // 2) Realtime push (fan-out to any open WS clients)
    await publishRealtime(`notifications:${user_id}`, { event: 'INSERT', row });

    // 3) Optional email channel
    if (channels?.email) {
      const profile = await db('profiles').where({ user_id }).first();
      if (profile?.email) {
        await sendEmail(profile.email, title, `<p>${message}</p>`).catch((err) =>
          logger.warn({ err }, 'notification email failed'),
        );
      }
    }
    return { ok: true };
  },
  { connection: createBullConnection(), concurrency: 10 },
);

// ---------- ticketing worker ----------
new Worker(
  QUEUE_NAMES.ticketing,
  async (job: Job) => {
    const { name, data } = job;
    if (name === 'sla-sweep') {
      const now = new Date();
      const tickets = await db('tickets')
        .whereNotIn('status', ['resolved', 'closed'])
        .whereNotNull('sla_deadline');
      for (const t of tickets) {
        const hrs = (new Date(t.sla_deadline).getTime() - now.getTime()) / 3.6e6;
        if (hrs < 0 && t.status !== 'escalated') {
          await db('tickets').where({ id: t.id }).update({
            status: 'escalated',
            escalation_level: (t.escalation_level || 0) + 1,
            updated_at: db.fn.now(),
          });
          await getQueue('notifications').add('ticket-escalated', {
            user_id: t.assigned_to || t.user_id,
            title: 'Ticket Escalated',
            message: `Ticket ${t.ticket_number} breached SLA`,
            type: 'error',
            category: 'ticket',
            reference_id: t.id,
            reference_type: 'tickets',
            tenant_id: t.tenant_id,
            channels: { email: true },
          });
          await publishRealtime(`tenant:${t.tenant_id || 'global'}:tickets`, {
            event: 'UPDATE', id: t.id, status: 'escalated',
          });
        } else if (hrs > 0 && hrs < 1) {
          await getQueue('notifications').add('ticket-sla-warn', {
            user_id: t.assigned_to || t.user_id,
            title: 'SLA Warning',
            message: `Ticket ${t.ticket_number} due in <1h`,
            type: 'warning',
            category: 'ticket',
            reference_id: t.id,
            reference_type: 'tickets',
            tenant_id: t.tenant_id,
          });
        }
      }
      return { swept: tickets.length };
    }
    return { ok: true };
  },
  { connection: createBullConnection(), concurrency: 2 },
);

// ---------- HR workflow worker ----------
new Worker(
  QUEUE_NAMES.hrWorkflows,
  async (job: Job) => {
    const { name, data } = job;
    if (name === 'onboarding-stage-changed') {
      const { workflow_id, new_stage, employee_user_id, tenant_id } = data;
      // Notify employee + HR managers
      await getQueue('notifications').add('onboarding-update', {
        user_id: employee_user_id,
        title: 'Onboarding Update',
        message: `Your onboarding moved to "${new_stage}"`,
        type: 'info',
        category: 'hr',
        reference_id: workflow_id,
        reference_type: 'hr_workflows',
        tenant_id,
        channels: { email: true },
      });
      await publishRealtime(`tenant:${tenant_id || 'global'}:hr_workflows`, {
        event: 'UPDATE', id: workflow_id, stage: new_stage,
      });
    }
    if (name === 'offboarding-initiated') {
      const { employee_user_id, tenant_id } = data;
      // Disable user, notify IT and HR
      const itManagers = await db('user_roles')
        .whereIn('role', ['admin'])
        .pluck('user_id');
      for (const uid of itManagers) {
        await getQueue('notifications').add('offboarding-it', {
          user_id: uid,
          title: 'Offboarding initiated',
          message: `Revoke access for user ${employee_user_id}`,
          type: 'warning',
          category: 'hr',
          reference_id: employee_user_id,
          reference_type: 'profiles',
          tenant_id,
        });
      }
    }
    return { ok: true };
  },
  { connection: createBullConnection(), concurrency: 5 },
);

// ---------- scheduled-checks worker ----------
new Worker(
  QUEUE_NAMES.scheduled,
  async (job: Job) => {
    if (job.name === 'every-minute') {
      // Fan out to specific sweeps
      await getQueue('ticketing').add('sla-sweep', {});
      // Overdue invoices
      const overdue = await db('invoices')
        .where('status', '!=', 'paid')
        .where('status', '!=', 'cancelled')
        .where('due_date', '<', new Date().toISOString().slice(0, 10))
        .where(function () {
          this.whereNull('status').orWhere('status', '!=', 'overdue');
        });
      for (const inv of overdue) {
        await db('invoices').where({ id: inv.id }).update({ status: 'overdue', updated_at: db.fn.now() });
        await getQueue('notifications').add('invoice-overdue', {
          user_id: inv.created_by || inv.user_id,
          title: 'Invoice Overdue',
          message: `${inv.invoice_number} is overdue`,
          type: 'error',
          category: 'invoice',
          reference_id: inv.id,
          reference_type: 'invoices',
          tenant_id: inv.tenant_id,
        });
      }
    }
    return { ok: true };
  },
  { connection: createBullConnection(), concurrency: 1 },
);

// ---------- integrations-sync worker ----------
new Worker(
  QUEUE_NAMES.integrationsSync,
  async (job: Job) => {
    const { userId, syncType } = job.data;
    const integration = await db('integrations')
      .where({ user_id: userId, provider: job.name === 'hubspot-sync' ? 'hubspot' : 'office365' })
      .first();
    if (!integration || integration.status !== 'connected') {
      throw new Error('Integration not connected');
    }

    // Refresh token if expired (HubSpot example, mirror for O365)
    let accessToken = integration.access_token;
    if (new Date(integration.token_expires_at) <= new Date()) {
      const { refreshHubspotToken } = await import('./routes/integrations.js');
      if (job.name === 'hubspot-sync') {
        const refreshed = await refreshHubspotToken(integration.refresh_token);
        accessToken = refreshed.access_token;
        await db('integrations')
          .where({ id: integration.id })
          .update({
            access_token: refreshed.access_token,
            refresh_token: refreshed.refresh_token,
            token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000),
          });
      }
    }

    // Minimal sync: fetch and upsert contacts (hubspot example)
    if (job.name === 'hubspot-sync' && (syncType === 'all' || syncType === 'contacts')) {
      const res = await fetch(
        'https://api.hubapi.com/crm/v3/objects/contacts?limit=100&properties=email,firstname,lastname,phone,company',
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) throw new Error(`HubSpot fetch failed: ${res.status}`);
      const json = (await res.json()) as { results: Array<{ id: string; properties: any }> };
      for (const c of json.results) {
        const p = c.properties;
        if (!p.email) continue;
        await db('contacts')
          .insert({
            email: p.email,
            first_name: p.firstname,
            last_name: p.lastname,
            phone: p.phone,
            company: p.company,
            user_id: userId,
            external_id: c.id,
            external_source: 'hubspot',
          })
          .onConflict(['external_source', 'external_id'])
          .merge();
      }
      return { synced: json.results.length };
    }
    return { ok: true };
  },
  { connection: createBullConnection(), concurrency: 3 },
);

// ---------- email worker ----------
new Worker(
  QUEUE_NAMES.email,
  async (job: Job) => {
    const { to, subject, html, text } = job.data;
    await sendEmail(to, subject, html, text);
    return { sent: true };
  },
  { connection: createBullConnection(), concurrency: 5 },
);

// ---------- repeatable jobs ----------
async function bootstrapRepeatableJobs() {
  await getQueue('scheduled').add(
    'every-minute',
    {},
    {
      repeat: { pattern: '* * * * *' },
      jobId: 'every-minute-cron', // dedupe
    },
  );
  logger.info('Scheduled repeatable jobs registered');
}

bootstrapRepeatableJobs().catch((err) => logger.error({ err }, 'failed to schedule jobs'));

logger.info('Worker process started — queues: %o', Object.values(QUEUE_NAMES));

const shutdown = async (sig: string) => {
  logger.info(`Worker received ${sig}`);
  try {
    await db.destroy();
  } catch {}
  process.exit(0);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
