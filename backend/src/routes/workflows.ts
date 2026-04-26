/**
 * Workflow trigger endpoint — replaces the Supabase `workflow-trigger` edge function.
 *
 * Frontend calls `supabase.functions.invoke("workflow-trigger", { body })` which the
 * REST shim now forwards here. This route validates the request and either runs the
 * workflow inline (cheap notifications) or enqueues a background job (when the worker
 * service is wired up — see `backend/src/workers/`).
 *
 * Supported workflow types mirror the original edge function so calling code does
 * not need to change.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { db } from '../db/connection.js';
import { logger } from '../lib/logger.js';
import { getQueue } from '../lib/queues.js';
import { publishRealtime } from '../lib/redis.js';

const triggerSchema = z.object({
  type: z.enum([
    'ticket_created',
    'ticket_sla_warning',
    'ticket_escalate',
    'invoice_created',
    'invoice_overdue',
    'deal_stage_changed',
    'compliance_due',
    'renewal_reminder',
    'request_submitted',
    'request_approved',
    'request_rejected',
    'request_escalated',
    'request_under_review',
    'onboarding_stage_changed',
    'offboarding_initiated',
  ]),
  entity_type: z.string().min(1).max(64),
  entity_id: z.string().uuid(),
  data: z.record(z.any()).optional(),
});

interface NotificationInsert {
  user_id: string;
  title: string;
  message: string;
  type: string;
  category: string;
  reference_id: string;
  reference_type: string;
  tenant_id?: string;
}

async function createNotifications(rows: NotificationInsert[]) {
  if (rows.length === 0) return;
  // Enqueue rather than insert directly — the worker persists, fans out via
  // WebSocket, and dispatches the email channel.
  for (const row of rows) {
    await getQueue('notifications').add('workflow', row);
  }
}

async function getManagerIds(tenantId?: string): Promise<string[]> {
  const q = db('user_roles')
    .select('user_id')
    .whereIn('role', ['admin', 'manager']);
  if (tenantId) {
    q.whereIn(
      'user_id',
      db('tenant_members').select('user_id').where({ tenant_id: tenantId, status: 'active' }),
    );
  }
  const rows = await q;
  return rows.map((r: any) => r.user_id);
}

export async function workflowRoutes(app: FastifyInstance) {
  app.post('/trigger', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = triggerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { type, entity_type, entity_id, data } = parsed.data;
    const tenantId = request.user?.tenantId;

    try {
      let result: { success: boolean; message?: string } = { success: true };

      switch (type) {
        case 'ticket_created': {
          const ticket = await db('tickets').where({ id: entity_id }).first();
          if (!ticket) {
            result = { success: false, message: 'Ticket not found' };
            break;
          }
          if (['critical', 'high'].includes(ticket.priority)) {
            const managers = await getManagerIds(tenantId);
            await createNotifications(
              managers.map((uid) => ({
                user_id: uid,
                title: `${String(ticket.priority).toUpperCase()} Priority Ticket`,
                message: `New ticket: ${ticket.title} (${ticket.ticket_number})`,
                type: 'warning',
                category: 'ticket',
                reference_id: entity_id,
                reference_type: 'tickets',
                tenant_id: tenantId,
              })),
            );
          }
          break;
        }

        case 'ticket_sla_warning':
        case 'ticket_escalate': {
          const ticket = await db('tickets').where({ id: entity_id }).first();
          if (!ticket) {
            result = { success: false, message: 'Ticket not found' };
            break;
          }
          if (type === 'ticket_escalate') {
            await db('tickets')
              .where({ id: entity_id })
              .update({
                status: 'escalated',
                escalation_level: (ticket.escalation_level || 0) + 1,
                updated_at: db.fn.now(),
              });
          }
          const recipients = new Set<string>(
            ticket.assigned_to ? [ticket.assigned_to] : [],
          );
          (await getManagerIds(tenantId)).forEach((id) => recipients.add(id));
          await createNotifications(
            Array.from(recipients).map((uid) => ({
              user_id: uid,
              title: type === 'ticket_escalate' ? 'Ticket Escalated' : 'SLA Warning',
              message:
                type === 'ticket_escalate'
                  ? `Ticket ${ticket.ticket_number} has been escalated`
                  : `Ticket ${ticket.ticket_number} is approaching SLA deadline`,
              type: type === 'ticket_escalate' ? 'error' : 'warning',
              category: 'ticket',
              reference_id: entity_id,
              reference_type: 'tickets',
              tenant_id: tenantId,
            })),
          );
          break;
        }

        case 'invoice_created':
        case 'invoice_overdue': {
          const invoice = await db('invoices').where({ id: entity_id }).first();
          if (!invoice) {
            result = { success: false, message: 'Invoice not found' };
            break;
          }
          if (type === 'invoice_overdue') {
            await db('invoices')
              .where({ id: entity_id })
              .update({ status: 'overdue', updated_at: db.fn.now() });
            const managers = await getManagerIds(tenantId);
            await createNotifications(
              managers.map((uid) => ({
                user_id: uid,
                title: 'Invoice Overdue',
                message: `Invoice ${invoice.invoice_number} for ₹${Number(invoice.total).toLocaleString()} is overdue`,
                type: 'error',
                category: 'invoice',
                reference_id: entity_id,
                reference_type: 'invoices',
                tenant_id: tenantId,
              })),
            );
          }
          break;
        }

        case 'deal_stage_changed': {
          const deal = await db('deals').where({ id: entity_id }).first();
          if (!deal) {
            result = { success: false, message: 'Deal not found' };
            break;
          }
          const newStage = data?.newStage ?? data?.new_stage ?? deal.stage;
          const oldStage = data?.oldStage ?? data?.old_stage;
          await createNotifications([
            {
              user_id: deal.user_id,
              title: 'Deal Stage Updated',
              message: `Deal "${deal.title}" moved from ${String(oldStage || 'previous stage').replaceAll('_', ' ')} to ${String(newStage).replaceAll('_', ' ')}`,
              type: 'info',
              category: 'deal',
              reference_id: entity_id,
              reference_type: 'deals',
              tenant_id: tenantId,
            },
          ]);
          break;
        }

        case 'request_submitted':
        case 'request_approved':
        case 'request_rejected':
        case 'request_escalated':
        case 'request_under_review': {
          const req = await db('employee_requests').where({ id: entity_id }).first();
          if (!req) {
            result = { success: false, message: 'Request not found' };
            break;
          }
          const labels: Record<string, string> = {
            request_submitted: 'Request Submitted',
            request_approved: 'Request Approved',
            request_rejected: 'Request Rejected',
            request_escalated: 'Request Escalated',
            request_under_review: 'Request Under Review',
          };
          const recipients =
            type === 'request_submitted'
              ? await getManagerIds(tenantId)
              : [req.user_id];
          await createNotifications(
            recipients.map((uid) => ({
              user_id: uid,
              title: labels[type],
              message: `${req.title || 'Request'} (${req.request_number || entity_id})`,
              type: type === 'request_rejected' ? 'error' : 'info',
              category: 'employee',
              reference_id: entity_id,
              reference_type: 'employee_requests',
              tenant_id: tenantId,
            })),
          );
          break;
        }

        case 'onboarding_stage_changed': {
          await getQueue('hrWorkflows').add('onboarding-stage-changed', {
            workflow_id: entity_id,
            new_stage: data?.newStage ?? data?.new_stage,
            employee_user_id: data?.employee_user_id,
            tenant_id: tenantId,
          });
          break;
        }
        case 'offboarding_initiated': {
          await getQueue('hrWorkflows').add('offboarding-initiated', {
            employee_user_id: entity_id,
            tenant_id: tenantId,
          });
          break;
        }
        case 'compliance_due':
        case 'renewal_reminder':
          logger.info({ type, entity_id }, 'Workflow accepted (worker handles details)');
          break;
      }

      // Realtime fan-out for table-changes channel
      await publishRealtime(`tenant:${tenantId || 'global'}:${entity_type}`, {
        event: type, id: entity_id, data,
      });

      // Audit trail
      try {
        await db('tenant_audit_log').insert({
          tenant_id: tenantId,
          actor_user_id: request.user?.id,
          action: type,
          entity_type,
          entity_id,
          metadata: { data, result },
        });
      } catch (auditErr) {
        // tenant_audit_log shape may differ; don't fail the trigger if it does
        logger.warn({ err: auditErr }, 'Audit log insert failed');
      }

      return { accepted: true, ...result };
    } catch (err: any) {
      logger.error({ err, type, entity_id }, 'Workflow trigger failed');
      return reply.status(500).send({ error: 'Workflow execution failed', message: err.message });
    }
  });
}
