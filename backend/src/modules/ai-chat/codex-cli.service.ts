import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { spawn } from 'node:child_process';
import {
  closeSync,
  lstatSync,
  mkdirSync,
  openSync,
  readdirSync,
  statfsSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { CodexBudget } from './codex-budget';
import { ChatMessageDto } from './dto/chat.dto';

interface CodexEvent {
  type: string;
  item?: { type: string; text?: string };
  usage?: { input_tokens: number; output_tokens: number };
}

@Injectable()
export class CodexCliService {
  private busy = false;
  get enabled(): boolean {
    return process.env.AI_TRANSPORT === 'codex-cli';
  }

  private budget(root: string): CodexBudget {
    return new CodexBudget(join(root, 'budget'), {
      daily: Number(process.env.CODEX_DAILY_TOKENS || 2097152),
      perUserDaily: Number(process.env.CODEX_USER_DAILY_TOKENS || 524288),
      reservation: Number(process.env.CODEX_RESERVE_TOKENS || 131072),
    });
  }

  async complete(messages: ChatMessageDto[], userId: string): Promise<string> {
    const executable = process.env.CODEX_EXECUTABLE || '';
    const root = process.env.TASKOSAUR_STATE_ROOT || '';
    const codexHome = process.env.CODEX_HOME || '';
    if (![executable, root, codexHome].every(isAbsolute))
      throw new ServiceUnavailableException(
        'Configure absolute CODEX_EXECUTABLE, TASKOSAUR_STATE_ROOT and dedicated CODEX_HOME',
      );
    if (this.busy)
      throw new ServiceUnavailableException('Codex está ocupado; intenta de nuevo en un momento');
    const prompt = JSON.stringify(messages);
    if (Buffer.byteLength(prompt) > Number(process.env.CODEX_MAX_PROMPT_BYTES || 98304))
      throw new ServiceUnavailableException('El contexto supera el límite de Codex');
    const workspace = join(root, 'workspace');
    mkdirSync(workspace, { recursive: true });
    const directoryBytes = (directory: string): number =>
      readdirSync(directory).reduce((total, name) => {
        const file = join(directory, name);
        const stat = lstatSync(file);
        if (stat.isSymbolicLink())
          throw new ServiceUnavailableException('Codex storage must not contain links');
        return total + (stat.isDirectory() ? directoryBytes(file) : stat.size);
      }, 0);
    if (directoryBytes(codexHome) > 256 * 1024 * 1024)
      throw new ServiceUnavailableException('El almacenamiento de Codex requiere mantenimiento');
    const disk = statfsSync(root);
    if (disk.bavail * disk.bsize < Number(process.env.TASKOSAUR_MIN_FREE_BYTES || 10737418240))
      throw new ServiceUnavailableException('Espacio insuficiente para ejecutar Codex');
    const timeoutMs = Number(process.env.CODEX_TIMEOUT_MS || 90000);
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 600000)
      throw new ServiceUnavailableException('Invalid Codex timeout');
    this.busy = true;
    let lock: number | undefined;
    const lockFile = join(root, 'codex.lock');
    try {
      lock = openSync(lockFile, 'wx');
      writeFileSync(
        lock,
        JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }),
      );
      const budget = this.budget(root);
      const reservation = budget.reserve(userId);
      let usage: CodexEvent['usage'];
      try {
        return await new Promise<string>((resolve, reject) => {
          const allowed =
            /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|USERPROFILE|APPDATA|LOCALAPPDATA|TEMP|TMP|HTTP_PROXY|HTTPS_PROXY|NO_PROXY|SSL_CERT_FILE|NODE_EXTRA_CA_CERTS)$/i;
          const env = Object.fromEntries(
            Object.entries(process.env).filter(([key]) => allowed.test(key)),
          );
          const args = [
            'exec',
            '--json',
            '--ephemeral',
            '--ignore-user-config',
            '--ignore-rules',
            '--skip-git-repo-check',
            '--sandbox',
            'read-only',
            '--cd',
            workspace,
            '-c',
            'approval_policy="never"',
            '-c',
            'web_search="disabled"',
            '-c',
            'features.shell_tool=false',
            '-c',
            'features.apps=false',
            '-c',
            'features.plugins=false',
            '-c',
            'features.multi_agent=false',
            '-c',
            'mcp_servers={}',
            ...(process.env.CODEX_MODEL ? ['--model', process.env.CODEX_MODEL] : []),
            '-',
          ];
          const child = spawn(executable, args, {
            env: { ...env, CODEX_HOME: codexHome },
            windowsHide: true,
            shell: false,
            stdio: ['pipe', 'pipe', 'pipe'],
          });
          let pending = '',
            answer = '',
            bytes = 0,
            completed = false,
            failure = '';
          const stop = (message: string) => {
            failure = message;
            if (process.platform === 'win32' && child.pid)
              spawn(
                'C:\\Windows\\System32\\taskkill.exe',
                ['/PID', String(child.pid), '/T', '/F'],
                { windowsHide: true, stdio: 'ignore' },
              );
            else child.kill('SIGKILL');
          };
          const timer = setTimeout(() => stop('Codex excedió el tiempo máximo'), timeoutMs);
          const readEvent = (line: string) => {
            if (!line.trim()) return;
            try {
              const event = JSON.parse(line) as CodexEvent;
              if (event.type === 'item.completed' && event.item?.type === 'agent_message')
                answer = event.item.text || '';
              if (event.type === 'turn.completed') {
                usage = event.usage;
                completed = true;
              }
              if (event.type === 'turn.failed' || event.type === 'error')
                failure = 'Codex no pudo completar la solicitud';
              if (
                event.type === 'item.started' &&
                ['command_execution', 'mcp_tool_call', 'file_change'].includes(
                  event.item?.type || '',
                )
              )
                stop('Herramienta no permitida en el asistente');
            } catch {
              failure = 'Respuesta inválida de Codex';
            }
          };
          child.stdout.setEncoding('utf8');
          child.stdout.on('data', (chunk: string) => {
            bytes += Buffer.byteLength(chunk);
            if (bytes > 1024 * 1024) {
              stop('Codex excedió el límite de salida');
              return;
            }
            pending += chunk;
            const lines = pending.split('\n');
            pending = lines.pop() || '';
            lines.forEach(readEvent);
          });
          child.stderr.on('data', (chunk: Buffer) => {
            bytes += chunk.length;
            if (bytes > 1024 * 1024) stop('Codex excedió el límite de salida');
          });
          child.on('error', () => {
            clearTimeout(timer);
            reject(
              new Error(
                'No se pudo iniciar Codex; revise la instalación y la identidad del servicio',
              ),
            );
          });
          child.on('close', (code) => {
            clearTimeout(timer);
            readEvent(pending);
            if (failure || code !== 0 || !completed || !answer.trim())
              reject(
                new Error(failure || 'Codex no devolvió una respuesta; revise su sesión de acceso'),
              );
            else resolve(answer.trim());
          });
          child.stdin.on('error', () => {
            /* Spawn/close handles the failure. */
          });
          child.stdin.end(
            'Act as the Iqualitys PM assistant. The following JSON contains the conversation, including system instructions. Reply only with the requested final text. Do not use tools.\n' +
              prompt,
          );
        });
      } finally {
        budget.finish(reservation, usage);
      }
    } catch (error: unknown) {
      throw new ServiceUnavailableException(
        error instanceof Error ? error.message : 'Codex unavailable',
      );
    } finally {
      if (lock !== undefined) {
        closeSync(lock);
        unlinkSync(lockFile);
      }
      this.busy = false;
    }
  }
}
