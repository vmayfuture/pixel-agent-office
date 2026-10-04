import http from 'node:http';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { readFile, readdir, realpath, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const DATA = path.join(ROOT, 'data');
const WORKSPACE = path.join(ROOT, 'workspace');
const HISTORY = path.join(DATA, 'tasks.json');
const SETTINGS_FILE = path.join(DATA, 'settings.json');
const SECRETS_FILE = path.join(DATA, 'provider-secrets.json');
const BOARD_FILE = path.join(DATA, 'board.json');
const HOST = '127.0.0.1';
const PORT = Number(process.env.PIXEL_OFFICE_PORT || 4321);
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const HERMES_SCRIPT = process.env.PIXEL_OFFICE_HERMES_SCRIPT || '';

mkdirSync(DATA, { recursive: true });
mkdirSync(WORKSPACE, { recursive: true });

const DEFAULT_SETTINGS = {
  brand: { name: '松果办公室', tagline: '一间会认真干活的像素小屋', location: '枫叶街 · 3 号', logoEmoji: '🦊', logoImage: '' },
  scene: { time: 'auto', wander: true, holdSeconds: 5 },
  providers: [
    { id: 'ollama', name: '本地 Ollama', type: 'ollama', enabled: true, instruction: '', baseUrl: OLLAMA_URL, model: 'auto' },
    { id: 'codex', name: 'Codex', type: 'cli', enabled: true, instruction: '', command: 'codex', args: 'exec\n--json\n--sandbox\nworkspace-write\n-C\n{{workspace}}\n--skip-git-repo-check\n--ephemeral\n-', promptMode: 'stdin', outputFormat: 'codex-jsonl', timeoutSeconds: 1800, showFiles: true },
    { id: 'hermes', name: 'Hermes Agent', type: 'cli', enabled: false, instruction: '', command: existsSync(HERMES_SCRIPT) ? 'powershell.exe' : 'hermes', args: existsSync(HERMES_SCRIPT) ? `-NoProfile\n-File\n${HERMES_SCRIPT}\n-z\n{{prompt}}` : '-z\n{{prompt}}', promptMode: 'argument', outputFormat: 'text', timeoutSeconds: 1800, showFiles: true },
  ],
  defaultAgentId: 'writer',
  agents: [
    { id: 'lead', name: '栗栗', role: '协调员', expertise: '规划与协调', routingKeywords: '规划,计划,协调', instructions: '', providerId: 'ollama', animal: 'fox', color: '#df854c' },
    { id: 'research', name: '阿松', role: '资料员', expertise: '资料研究与分析', routingKeywords: '研究,分析,调研,资料', instructions: '', providerId: 'ollama', animal: 'squirrel', color: '#a46b4d' },
    { id: 'writer', name: '米米', role: '写作者', expertise: '写作与创意', routingKeywords: '写作,文案,故事,创意', instructions: '', providerId: 'ollama', animal: 'rabbit', color: '#eee0b8' },
    { id: 'builder', name: '灰灰', role: '制作员', expertise: '开发与制作', routingKeywords: '代码,网页,程序,开发,脚本', instructions: '', providerId: 'codex', animal: 'raccoon', color: '#9ca9a4' },
    { id: 'reviewer', name: '夜灯', role: '检查员', expertise: '检查与审核', routingKeywords: '检查,审核,校对,评审', instructions: '', providerId: 'ollama', animal: 'owl', color: '#ae9abd' },
    { id: 'keeper', name: '团团', role: '文件员', expertise: '文件与资料整理', routingKeywords: '文件,目录,归档,整理', instructions: '', providerId: 'codex', animal: 'bear', color: '#d6a966' },
  ],
  presets: [
    { id: 'copy', title: '写活动文案', prompt: '写一段温暖的秋日活动介绍', agentId: '', providerId: '' },
    { id: 'todo', title: '做待办网页', prompt: '做一个单文件的待办清单网页，并写使用说明', agentId: 'builder', providerId: '' },
  ],
};

const ANIMALS = new Set(['fox', 'squirrel', 'rabbit', 'raccoon', 'owl', 'bear', 'cat', 'dog']);
const LEGACY_SPECIALTIES = { coordination: ['规划与协调', '规划,计划,协调'], research: ['资料研究与分析', '研究,分析,调研,资料'], writing: ['写作与创意', '写作,文案,故事,创意'], development: ['开发与制作', '代码,网页,程序,开发,脚本'], review: ['检查与审核', '检查,审核,校对,评审'], files: ['文件与资料整理', '文件,目录,归档,整理'] };
function bounded(value, label, max, allowEmpty = false) {
  const text = String(value ?? '').trim();
  if ((!allowEmpty && !text) || text.length > max) throw new Error(`${label}长度不符合要求。`);
  return text;
}
function validUrl(value, label, allowEmpty = false) {
  const url = bounded(value, label, 1000, allowEmpty);
  if (url && !/^https?:\/\//i.test(url)) throw new Error(`${label}须以 http:// 或 https:// 开头。`);
  return url;
}
function migrateSettings(value) {
  if (Array.isArray(value?.providers)) {
    const copy = structuredClone(value);
    const hermes = copy.providers.find(provider => provider.id === 'hermes' && provider.type === 'cli');
    if (hermes?.args?.endsWith('chat\n-q\n{{prompt}}')) hermes.args = hermes.args.replace(/chat\n-q\n\{\{prompt\}\}$/, '-z\n{{prompt}}');
    return copy;
  }
  if (!value?.modes) return value;
  const old = value.modes;
  const copy = structuredClone(DEFAULT_SETTINGS);
  copy.brand = value.brand || copy.brand;
  copy.scene = value.scene || copy.scene;
  copy.providers[0].enabled = old.ollama?.enabled !== false;
  copy.providers[0].name = old.ollama?.label === '本地 AI · 文字协作' ? '本地 Ollama' : old.ollama?.label || copy.providers[0].name;
  copy.providers[0].model = old.ollama?.model || 'auto';
  copy.providers[0].instruction = old.ollama?.instruction || '';
  copy.providers[1].enabled = old.codex?.enabled !== false;
  copy.providers[1].name = old.codex?.label === 'Codex · 文件任务' ? 'Codex' : old.codex?.label || copy.providers[1].name;
  copy.providers[1].instruction = old.codex?.instruction || '';
  copy.agents = (value.agents || copy.agents).map(agent => {
    const [expertise, routingKeywords] = LEGACY_SPECIALTIES[agent.specialty] || [String(agent.specialty || '通用任务'), ''];
    return { id: agent.id, name: agent.name, role: agent.role, expertise, routingKeywords, instructions: '', providerId: ['development', 'files'].includes(agent.specialty) && copy.providers[1].enabled ? 'codex' : copy.providers[0].enabled ? 'ollama' : 'codex', animal: agent.animal, color: agent.color };
  });
  copy.defaultAgentId = copy.agents.find(agent => agent.id === 'writer')?.id || copy.agents[0]?.id;
  copy.presets = (value.presets || []).map(preset => ({ id: preset.id, title: preset.title, prompt: preset.prompt, agentId: preset.agentId || (preset.mode === 'codex' ? 'builder' : ''), providerId: preset.mode === 'codex' && !copy.providers[1].enabled ? '' : '' }));
  return copy;
}
function validateSettings(value) {
  if (!value || typeof value !== 'object') throw new Error('设置格式不正确。');
  const brand = value.brand || {};
  const scene = value.scene || {};
  const holdSeconds = scene.holdSeconds === undefined ? 5 : Number(scene.holdSeconds);
  if (![0, 3, 5, 8].includes(holdSeconds)) throw new Error('工作动画最短时长不正确。');
  const logoImage = bounded(brand.logoImage, 'LOGO 图片', 260000, true);
  if (logoImage && !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(logoImage)) throw new Error('LOGO 仅支持 PNG、JPEG 或 WebP 图片。');
  const normalized = {
    brand: {
      name: bounded(brand.name, '办公室名称', 20),
      tagline: bounded(brand.tagline, '副标题', 60, true),
      location: bounded(brand.location, '场景角标', 28, true),
      logoEmoji: bounded(brand.logoEmoji, 'LOGO 图标', 16),
      logoImage,
    },
    scene: { time: ['auto', 'day', 'night'].includes(scene.time) ? scene.time : 'auto', wander: scene.wander !== false, holdSeconds },
    providers: [],
    defaultAgentId: String(value.defaultAgentId || ''),
    agents: [],
    presets: [],
  };
  if (!Array.isArray(value.providers) || value.providers.length < 1 || value.providers.length > 20) throw new Error('执行器需在 1 到 20 个之间。');
  const providerIds = new Set();
  for (const item of value.providers) {
    const id = bounded(item.id, '执行器 ID', 64);
    if (!/^[\w-]+$/.test(id) || providerIds.has(id)) throw new Error('执行器 ID 重复或格式不正确。');
    providerIds.add(id);
    const type = String(item.type);
    if (!['ollama', 'openai', 'http', 'cli'].includes(type)) throw new Error('执行器类型不支持。');
    const provider = { id, name: bounded(item.name, '执行器名称', 32), type, enabled: item.enabled !== false, instruction: bounded(item.instruction, '执行器长期要求', 2000, true) };
    if (type === 'ollama' || type === 'openai') {
      provider.baseUrl = validUrl(item.baseUrl, '服务地址');
      provider.model = bounded(item.model || 'auto', '模型名称', 120);
      if (type === 'openai') provider.apiKeyEnv = bounded(item.apiKeyEnv, '密钥环境变量名', 120, true);
    }
    if (type === 'http') {
      provider.url = validUrl(item.url, '接口地址');
      provider.method = ['POST', 'PUT'].includes(item.method) ? item.method : 'POST';
      provider.headers = bounded(item.headers || '{}', '请求头 JSON', 4000);
      provider.bodyTemplate = bounded(item.bodyTemplate || '{}', '请求体 JSON', 12000);
      provider.responsePath = bounded(item.responsePath, '结果字段路径', 200);
      provider.apiKeyEnv = bounded(item.apiKeyEnv, '密钥环境变量名', 120, true);
      try { if (typeof JSON.parse(provider.headers) !== 'object' || typeof JSON.parse(provider.bodyTemplate) !== 'object') throw new Error(); } catch { throw new Error('自定义 HTTP 的请求头和请求体须为有效 JSON。'); }
    }
    if (type === 'cli') {
      provider.command = bounded(item.command, '命令程序', 1000);
      provider.args = bounded(item.args, '命令参数', 5000, true);
      provider.promptMode = ['stdin', 'argument'].includes(item.promptMode) ? item.promptMode : 'stdin';
      if (provider.promptMode === 'argument' && !provider.args.includes('{{prompt}}')) throw new Error('命令参数模式须包含 {{prompt}}。');
      provider.outputFormat = ['text', 'codex-jsonl'].includes(item.outputFormat) ? item.outputFormat : 'text';
      provider.timeoutSeconds = Number(item.timeoutSeconds || 1800);
      if (!Number.isInteger(provider.timeoutSeconds) || provider.timeoutSeconds < 10 || provider.timeoutSeconds > 3600) throw new Error('命令超时须在 10 到 3600 秒之间。');
      provider.showFiles = item.showFiles === true;
    }
    normalized.providers.push(provider);
  }
  if (!normalized.providers.some(provider => provider.enabled)) throw new Error('至少启用一个执行器。');
  if (!Array.isArray(value.agents) || value.agents.length < 1 || value.agents.length > 8) throw new Error('小队人数需在 1 到 8 人之间。');
  const seenAgents = new Set();
  for (const item of value.agents) {
    const id = bounded(item.id, '成员 ID', 64);
    if (!/^[\w-]+$/.test(id) || seenAgents.has(id)) throw new Error('成员 ID 重复或格式不正确。');
    seenAgents.add(id);
    if (!ANIMALS.has(item.animal) || !/^#[0-9a-fA-F]{6}$/.test(String(item.color))) throw new Error('成员外观不正确。');
    if (!normalized.providers.some(provider => provider.id === item.providerId && provider.enabled)) throw new Error(`成员「${item.name || id}」需要绑定已启用的执行器。`);
    normalized.agents.push({ id, name: bounded(item.name, '成员名称', 10), role: bounded(item.role, '成员职位', 20), expertise: bounded(item.expertise, '成员专长', 100, true), routingKeywords: bounded(item.routingKeywords, '派工关键词', 300, true), instructions: bounded(item.instructions, '成员长期要求', 1200, true), providerId: item.providerId, animal: item.animal, color: item.color.toLowerCase() });
  }
  if (!seenAgents.has(normalized.defaultAgentId)) throw new Error('默认成员不存在。');
  if (!Array.isArray(value.presets) || value.presets.length > 12) throw new Error('快捷任务最多 12 条。');
  const seenPresets = new Set();
  for (const item of value.presets) {
    const id = bounded(item.id, '快捷任务 ID', 64);
    if (!/^[\w-]+$/.test(id) || seenPresets.has(id)) throw new Error('快捷任务 ID 重复或格式不正确。');
    seenPresets.add(id);
    if (item.providerId && !normalized.providers.some(provider => provider.id === item.providerId && provider.enabled)) throw new Error('快捷任务引用了未启用的执行器。');
    normalized.presets.push({ id, title: bounded(item.title, '快捷任务名称', 24), prompt: bounded(item.prompt, '快捷任务内容', 2000), agentId: seenAgents.has(item.agentId) ? item.agentId : '', providerId: item.providerId || '' });
  }
  return normalized;
}

let settings = validateSettings(DEFAULT_SETTINGS);
try { settings = validateSettings(migrateSettings(JSON.parse(readFileSync(SETTINGS_FILE, 'utf8')))); }
catch (error) { if (error.code !== 'ENOENT') console.error('读取设置失败，使用默认配置:', error.message); }
let secrets = {};
try { secrets = JSON.parse(readFileSync(SECRETS_FILE, 'utf8')); } catch { /* No saved keys yet. */ }
function publicSettings() { return { ...settings, providers: settings.providers.map(provider => ({ ...provider, hasKey: Boolean(secrets[provider.id] || (provider.apiKeyEnv && process.env[provider.apiKeyEnv])) })) }; }

let agents = settings.agents.map(agent => ({ ...agent, status: 'idle', activity: '自由活动' }));
const clients = new Set();
let activeRun = null;
let saveTimer = null;
let tasks = [];
let board = [];
try { const stored = JSON.parse(readFileSync(BOARD_FILE, 'utf8')); if (Array.isArray(stored)) board = stored.slice(0, 24); } catch { /* Empty board. */ }

try {
  const stored = JSON.parse(readFileSync(HISTORY, 'utf8'));
  if (Array.isArray(stored)) {
    tasks = stored.slice(0, 16).map(task => {
      if (task.status === 'running') {
        task.status = 'error';
        task.error = '服务重启，任务已中断。';
      }
      return task;
    });
  }
} catch { /* First launch has no history. */ }

function state() {
  return { settings: publicSettings(), agents, tasks, board, activeTaskId: activeRun?.task.id || null, workspace: WORKSPACE };
}

function broadcast() {
  const message = `event: snapshot\ndata: ${JSON.stringify(state())}\n\n`;
  for (const client of clients) {
    try { client.write(message); } catch { clients.delete(client); }
  }
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const temp = `${HISTORY}.tmp`;
    try {
      await writeFile(temp, JSON.stringify(tasks.slice(0, 16), null, 2), 'utf8');
      await rename(temp, HISTORY);
    } catch (error) {
      console.error('保存任务记录失败:', error.message);
    }
  }, 200);
}

function log(task, message) {
  task.logs.unshift({ at: new Date().toISOString(), message });
  task.logs = task.logs.slice(0, 80);
  broadcast();
}

function setAgent(id, status, activity) {
  const agent = agents.find(person => person.id === id);
  if (agent) {
    agent.status = status;
    agent.activity = activity;
    broadcast();
  }
}

function resetAgents() {
  for (const agent of agents) {
    agent.status = 'idle';
    agent.activity = '自由活动';
  }
  broadcast();
}

function startStep(task, agentId, title) {
  const agentName = agents.find(agent => agent.id === agentId)?.name || '职员';
  const step = { id: crypto.randomUUID(), agentId, agentName, title, status: 'running', startedAt: new Date().toISOString(), output: '' };
  task.steps.push(step);
  setAgent(agentId, 'working', title);
  log(task, `${agentName}开始：${title}`);
  return step;
}

async function finishStep(task, step, output, signal) {
  const remaining = settings.scene.holdSeconds * 1000 - (Date.now() - Date.parse(step.startedAt));
  if (remaining > 0) await wait(remaining, signal);
  step.status = 'done';
  step.output = String(output || '').trim();
  setAgent(step.agentId, 'idle', '已完成');
  log(task, `${step.agentName}完成了「${step.title}」`);
}

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const timer = setTimeout(() => { signal.removeEventListener('abort', onAbort); resolve(); }, ms);
    const onAbort = () => { clearTimeout(timer); reject(signal.reason); };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

function createTask(prompt, agent, provider, collaborationMode = 'solo', collaborators = []) {
  const task = {
    id: crypto.randomUUID(),
    prompt,
    agentId: agent.id,
    agentName: agent.name,
    providerId: provider.id,
    providerName: provider.name,
    collaborationMode,
    routingSource: collaborationMode === 'auto' ? 'auto' : 'manual',
    routingReason: collaborationMode === 'auto' ? '正在判断任务复杂度与分工…' : '',
    participants: [agent, ...collaborators].map(person => ({ id: person.id, name: person.name, providerName: settings.providers.find(item => item.id === (person.id === agent.id ? provider.id : person.providerId))?.name || '' })),
    model: null,
    status: 'running',
    createdAt: new Date().toISOString(),
    completedAt: null,
    steps: [],
    logs: [],
    result: '',
    error: '',
    files: [],
  };
  tasks.unshift(task);
  tasks = tasks.slice(0, 16);
  activeRun = { task, controller: new AbortController(), children: new Set() };
  broadcast();
  return activeRun;
}

async function execute(run, runner) {
  const { task } = run;
  try {
    await runner(run);
    if (run.controller.signal.aborted) throw run.controller.signal.reason;
    task.status = 'done';
    task.completedAt = new Date().toISOString();
    log(task, '任务完成，可以查看结果。');
  } catch (error) {
    task.status = run.controller.signal.aborted ? 'cancelled' : 'error';
    task.error = run.controller.signal.aborted ? '任务已取消。' : String(error?.message || error);
    task.completedAt = new Date().toISOString();
    log(task, task.error);
  } finally {
    if (activeRun === run) activeRun = null;
    resetAgents();
  }
}

async function availableModels(baseUrl = OLLAMA_URL) {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/tags`, { signal: AbortSignal.timeout(2200) });
  if (!response.ok) throw new Error(`Ollama 返回 ${response.status}`);
  const data = await response.json();
  return (data.models || []).map(model => model.name).filter(Boolean);
}

function cleanModelText(raw) {
  const text = String(raw || '').replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<think>[\s\S]*$/gi, '').trim();
  return text || String(raw || '').replace(/<\/?think>/gi, '').trim();
}

async function askOllama(provider, model, prompt, signal) {
  const combined = AbortSignal.any([signal, AbortSignal.timeout(240000)]);
  const response = await fetch(`${provider.baseUrl.replace(/\/$/, '')}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      think: false,
      options: { temperature: 0.45 },
    }),
    signal: combined,
  });
  if (!response.ok) throw new Error(`本地模型请求失败：${response.status} ${String(await response.text()).slice(0, 160)}`);
  const data = await response.json();
  const answer = cleanModelText(data.response);
  if (!answer) throw new Error('本地模型没有返回可显示的内容。');
  return answer;
}

function pickWorker(prompt, requestedId = '') {
  if (requestedId) return agents.find(agent => agent.id === requestedId);
  const lower = prompt.toLowerCase();
  let best = agents.find(agent => agent.id === settings.defaultAgentId) || agents[0];
  let highest = 0;
  for (const agent of agents) {
    const words = String(agent.routingKeywords || '').split(/[,，;；\n]+/).map(word => word.trim().toLowerCase()).filter(Boolean);
    const score = words.reduce((sum, word) => sum + (lower.includes(word) ? word.length + 1 : 0), 0);
    if (score > highest) { best = agent; highest = score; }
  }
  return best;
}

function fullPrompt(task, agent, provider) {
  return `你是${agent.name}，职位：${agent.role}。专长：${agent.expertise || '通用任务'}。请直接完成用户任务，给出清晰的可交付结果；如果当前执行器没有完成任务所需的能力，请明确说明。\n成员要求：${agent.instructions || '无'}\n执行器要求：${provider.instruction || '无'}\n工作区：${WORKSPACE}\n\n用户任务：${task.prompt}`;
}

async function runOllama(run, agent, provider, prompt) {
  const { task, controller } = run;
  let models;
  try { models = await availableModels(provider.baseUrl); } catch { throw new Error(`${provider.name} 未连接。请检查服务地址与本地模型。`); }
  if (!models.length) throw new Error(`${provider.name} 已连接，但还没有可用模型。`);
  const preference = provider.model;
  const model = preference === 'auto' ? (models.find(name => name === 'deepseek-r1:7b') || models[0]) : models.find(name => name === preference);
  if (!model) throw new Error(`设置的模型 ${preference} 未安装，请到设置中重新选择。`);
  task.model = model;
  return askOllama(provider, model, prompt, controller.signal);
}

async function listWorkspaceFiles(dir = WORKSPACE, depth = 0, prefix = '') {
  if (depth > 2) return [];
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'README.md') continue;
    const relative = path.join(prefix, entry.name);
    if (entry.isFile()) result.push(relative);
    if (entry.isDirectory()) result.push(...await listWorkspaceFiles(path.join(dir, entry.name), depth + 1, relative));
    if (result.length >= 30) break;
  }
  return result.slice(0, 30);
}

function describeCodexEvent(task, event, onFinal) {
  const item = event.item || {};
  if (event.type === 'item.started' && item.type === 'command_execution') {
    log(task, `正在运行：${String(item.command || '命令').slice(0, 110)}`);
  } else if (event.type === 'item.completed' && item.type === 'command_execution') {
    log(task, `命令结束，退出码 ${item.exit_code ?? '未知'}`);
  } else if (event.type === 'item.completed' && item.type === 'agent_message') {
    if (item.text) onFinal(item.text);
  } else if (event.type === 'turn.failed') {
    log(task, 'Codex 报告任务失败。');
  }
}

function apiKeyFor(provider) {
  return secrets[provider.id] || (provider.apiKeyEnv ? process.env[provider.apiKeyEnv] || '' : '');
}

async function readLimited(response) {
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 2_000_000) { await reader.cancel(); throw new Error('执行器响应超过 2 MB。'); }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function responseError(provider, status, body) {
  const key = apiKeyFor(provider);
  const safe = key ? body.replaceAll(key, '[已隐藏密钥]') : body;
  return new Error(`${provider.name} 返回 ${status}：${safe.slice(0, 300)}`);
}

async function runOpenAI(run, provider, prompt) {
  const base = provider.baseUrl.replace(/\/$/, '');
  const endpoint = base.endsWith('/chat/completions') ? base : `${base}/chat/completions`;
  const key = apiKeyFor(provider);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) },
    body: JSON.stringify({ model: provider.model, messages: [{ role: 'user', content: prompt }], stream: false }),
    signal: AbortSignal.any([run.controller.signal, AbortSignal.timeout(300000)]),
  });
  const raw = await readLimited(response);
  if (!response.ok) throw responseError(provider, response.status, raw);
  let payload;
  try { payload = JSON.parse(raw); } catch { throw new Error(`${provider.name} 返回的内容不是 JSON。`); }
  const content = payload?.choices?.[0]?.message?.content;
  const result = typeof content === 'string' ? content : Array.isArray(content) ? content.map(item => item.text || '').join('\n') : '';
  if (!result.trim()) throw new Error(`${provider.name} 没有返回可显示的内容。`);
  run.task.model = provider.model;
  return cleanModelText(result);
}

function templateValue(value, replacements) {
  if (typeof value === 'string') return value.replace(/\{\{(prompt|task|model|apiKey|workspace|agentName)\}\}/g, (_, key) => replacements[key] || '');
  if (Array.isArray(value)) return value.map(item => templateValue(item, replacements));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, templateValue(item, replacements)]));
  return value;
}

function pathValue(value, fieldPath) {
  return fieldPath.split('.').reduce((item, key) => item?.[key], value);
}

async function runHttp(run, agent, provider, prompt) {
  const replacements = { prompt, task: run.task.prompt, model: provider.model || '', apiKey: apiKeyFor(provider), workspace: WORKSPACE, agentName: agent.name };
  const headers = templateValue(JSON.parse(provider.headers), replacements);
  const body = templateValue(JSON.parse(provider.bodyTemplate), replacements);
  const response = await fetch(provider.url, {
    method: provider.method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.any([run.controller.signal, AbortSignal.timeout(300000)]),
  });
  const raw = await readLimited(response);
  if (!response.ok) throw responseError(provider, response.status, raw);
  let payload;
  try { payload = JSON.parse(raw); } catch { throw new Error(`${provider.name} 返回的内容不是 JSON。`); }
  const result = pathValue(payload, provider.responsePath);
  const text = typeof result === 'string' ? result : result === undefined ? '' : JSON.stringify(result, null, 2);
  if (!text.trim()) throw new Error(`${provider.name} 的结果字段「${provider.responsePath}」为空，请检查路径。`);
  return cleanModelText(text);
}

async function runCli(run, provider, prompt) {
  const { task, controller } = run;
  const args = provider.args.split(/\r?\n/).map(arg => arg.trim()).filter(Boolean).map(arg => arg.replaceAll('{{prompt}}', prompt).replaceAll('{{workspace}}', WORKSPACE));
  task.model = provider.name;
  let finalMessage = '';
  let stdout = '';
  await new Promise((resolve, reject) => {
    const child = spawn(provider.command, args, { cwd: WORKSPACE, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    run.children.add(child);
    let pending = '';
    let stderr = '';
    let settled = false;
    const timer = setTimeout(() => { child.kill(); fail(new Error(`${provider.name} 超过 ${provider.timeoutSeconds} 秒仍未完成。`)); }, provider.timeoutSeconds * 1000);
    const fail = error => { if (settled) return; settled = true; clearTimeout(timer); reject(error); };
    const done = () => { if (settled) return; settled = true; clearTimeout(timer); resolve(); };
    const onAbort = () => child.kill();
    controller.signal.addEventListener('abort', onAbort, { once: true });
    child.on('error', error => fail(new Error(`无法启动 ${provider.name}：${error.message}`)));
    child.stdout.on('data', chunk => {
      const text = chunk.toString('utf8');
      if (stdout.length + text.length > 2_000_000) { child.kill(); fail(new Error(`${provider.name} 输出超过 2 MB。`)); return; }
      stdout += text;
      if (provider.outputFormat === 'codex-jsonl') {
        pending += text;
        let newline;
        while ((newline = pending.indexOf('\n')) !== -1) {
          const line = pending.slice(0, newline).trim();
          pending = pending.slice(newline + 1);
          if (!line) continue;
          try { describeCodexEvent(task, JSON.parse(line), value => { finalMessage = value; }); } catch { /* Ignore progress text. */ }
        }
      }
    });
    child.stderr.on('data', chunk => { stderr = (stderr + chunk.toString('utf8')).slice(-2000); });
    child.stdin.on('error', () => { /* Process may exit before stdin is written. */ });
    child.on('close', code => {
      run.children.delete(child);
      controller.signal.removeEventListener('abort', onAbort);
      if (controller.signal.aborted) return fail(controller.signal.reason);
      if (code !== 0) return fail(new Error(`${provider.name} 退出码 ${code}。${stderr.trim().slice(0, 300)}`));
      done();
    });
    if (provider.promptMode === 'stdin') child.stdin.end(prompt);
    else child.stdin.end();
  });
  if (provider.showFiles) task.files = await listWorkspaceFiles();
  const result = provider.outputFormat === 'codex-jsonl' ? finalMessage : stdout.replace(/\x1b\[[0-9;]*m/g, '').trim();
  return result || `${provider.name} 已完成。${provider.showFiles ? '请查看工作区文件。' : ''}`;
}

async function runStage(run, agent, provider, title, context = '') {
  const { task, controller } = run;
  const step = startStep(task, agent.id, title);
  step.providerName = provider.name;
  log(task, `${agent.name} 正在使用 ${provider.name}${context ? '，已收到其他成员的结果' : ''}。`);
  const focus = run.assignments?.[agent.id];
  const prompt = `${fullPrompt(task, agent, provider)}${focus ? `\n\n你在本次小队分工中负责：${focus}` : ''}${context ? `\n\n协作上下文：\n${context.slice(-16000)}` : ''}`;
  try {
    let result;
    if (provider.type === 'ollama') result = await runOllama(run, agent, provider, prompt);
    else if (provider.type === 'openai') result = await runOpenAI(run, provider, prompt);
    else if (provider.type === 'http') result = await runHttp(run, agent, provider, prompt);
    else result = await runCli(run, provider, prompt);
    await finishStep(task, step, result, controller.signal);
    return result;
  } catch (error) {
    step.status = 'error';
    step.output = String(error?.message || error);
    setAgent(agent.id, 'idle', '执行中断');
    log(task, `${agent.name} 未完成：${step.output.slice(0, 120)}`);
    throw error;
  }
}

async function planTask(run, initialAgent, initialProvider, requestedAgentId, requestedProviderId) {
  const { task } = run;
  const step = startStep(task, initialAgent.id, '判断任务与分工');
  step.providerName = initialProvider.name;
  const members = agents.map(person => ({ id: person.id, name: person.name, specialty: person.expertise, provider: settings.providers.find(item => item.id === person.providerId)?.name || '' }));
  const planningPrompt = `你是 AI 小队的任务调度员。只分析任务、返回一个 JSON 对象，不要执行任务，不要调用工具，不要写文件，也不要加 Markdown。\n用户任务：${task.prompt}\n可用成员：${JSON.stringify(members)}\n${requestedAgentId ? `主办成员必须是 ${requestedAgentId}。` : ''}\n判断原则：用户只要一个简单结果时必须 solo，例如一句话介绍、简短问答、翻译、改写、简短文案。不要把简单写作强行拆成“搜集资料”和“撰写内容”。只有任务确实有两项以上实质工作、且不同成员各有清楚的交付物时才协作，最多三人。前一步结果必须给下一位时选 relay；真正可以独立完成的不同成果才选 parallel。无法确定时选 solo。\n格式：{"mode":"solo|relay|parallel","leadAgentId":"成员 id","workers":[{"agentId":"成员 id","focus":"具体负责什么"}],"reason":"一句话说明判断"}。solo 的 workers 为空；协作时 workers 是除主办外的 1 到 2 位成员。只使用上述 id。`;
  try {
    let answer;
    if (initialProvider.type === 'ollama') answer = await runOllama(run, initialAgent, initialProvider, planningPrompt);
    else if (initialProvider.type === 'openai') answer = await runOpenAI(run, initialProvider, planningPrompt);
    else if (initialProvider.type === 'http') answer = await runHttp(run, initialAgent, initialProvider, planningPrompt);
    else answer = await runCli(run, initialProvider, planningPrompt);
    const match = cleanModelText(answer).match(/\{[\s\S]*\}/);
    const proposal = JSON.parse(match?.[0] || 'null');
    if (!proposal || !['solo', 'relay', 'parallel'].includes(proposal.mode)) throw new Error('分工格式不完整');
    // Small models sometimes invent a research/writing split for an explicit short answer.
    const clearlySingleAnswer = task.prompt.length < 120 && /一句话|一行|单句|简短回答|简单介绍|简短介绍|翻译(?:这|一|成)|只用.{0,12}(?:字|句)/.test(task.prompt);
    if (clearlySingleAnswer && proposal.mode !== 'solo') {
      proposal.mode = 'solo';
      proposal.leadAgentId = requestedAgentId || initialAgent.id;
      proposal.workers = [];
      proposal.reason = '任务只要求一个简短结果，一位成员即可完成。';
    }
    const lead = agents.find(person => person.id === (requestedAgentId || proposal.leadAgentId));
    if (!lead) throw new Error('主办成员无效');
    const workers = proposal.mode === 'solo' ? [] : (Array.isArray(proposal.workers) ? proposal.workers : []).slice(0, 2);
    const ids = workers.map(item => item.agentId);
    if (proposal.mode !== 'solo' && (!ids.length || ids.some(id => id === lead.id || !agents.some(person => person.id === id)) || new Set(ids).size !== ids.length)) throw new Error('协作成员无效');
    const collaborators = ids.map(id => agents.find(person => person.id === id));
    const provider = requestedProviderId ? initialProvider : settings.providers.find(item => item.id === lead.providerId && item.enabled);
    if (!provider) throw new Error('主办成员的执行器未启用');
    run.assignments = Object.fromEntries(workers.map(item => [item.agentId, String(item.focus || '').slice(0, 180)]));
    task.agentId = lead.id;
    task.agentName = lead.name;
    task.providerId = provider.id;
    task.providerName = provider.name;
    task.collaborationMode = proposal.mode;
    task.routingReason = String(proposal.reason || '已根据任务内容安排执行方式。').slice(0, 300);
    task.participants = [lead, ...collaborators].map(person => ({ id: person.id, name: person.name, providerName: settings.providers.find(item => item.id === (person.id === lead.id ? provider.id : person.providerId))?.name || '' }));
    step.status = 'done';
    step.output = `${task.routingReason}\n方式：${{ solo: '一人处理', relay: '小队接力', parallel: '小队并行' }[proposal.mode]}\n${collaborators.map(person => `${person.name}：${run.assignments[person.id] || '按专长处理'}`).join('\n')}`;
    setAgent(initialAgent.id, 'idle', '分工完成');
    log(task, `自动分工：${task.routingReason}`);
    return { lead, provider, collaborators };
  } catch (error) {
    if (run.controller.signal.aborted) throw error;
    task.collaborationMode = 'solo';
    task.routingReason = `自动分工没有得到有效结果，已交给 ${initialAgent.name} 独立处理。`;
    step.status = 'done';
    step.output = task.routingReason;
    setAgent(initialAgent.id, 'idle', '独立处理');
    log(task, task.routingReason);
    return { lead: initialAgent, provider: initialProvider, collaborators: [] };
  }
}

async function runSelectedProvider(run, agent, provider, collaborators = []) {
  const { task } = run;
  const providerOf = person => settings.providers.find(item => item.id === person.providerId && item.enabled);
  if (task.collaborationMode === 'solo' || !collaborators.length) {
    task.result = await runStage(run, agent, provider, '独立完成任务');
  } else if (task.collaborationMode === 'relay') {
    let context = '你正在参加小队接力。完成你擅长的部分，并把清楚的结果交给下一位成员。';
    for (const [index, person] of [agent, ...collaborators].entries()) {
      const selectedProvider = index === 0 ? provider : providerOf(person);
      const result = await runStage(run, person, selectedProvider, `接力 ${index + 1}/${collaborators.length + 1}`, context);
      context += `\n\n${person.name}的结果：\n${result.slice(0, 10000)}`;
      task.result = result;
      broadcast();
    }
  } else {
    const participants = [agent, ...collaborators];
    const contributions = await Promise.allSettled(participants.map(person => runStage(run, person, person.id === agent.id ? provider : providerOf(person), '并行处理任务', '你正在参加并行分工。请从你的专长出发独立完成，最后会由主办成员汇总。')));
    if (run.controller.signal.aborted) throw run.controller.signal.reason;
    const completed = contributions.map((entry, index) => ({ name: participants[index].name, result: entry.status === 'fulfilled' ? entry.value : '' })).filter(entry => entry.result);
    if (!completed.length) throw new Error('并行成员都未能完成任务，请查看各成员步骤。');
    const perMemberBudget = Math.max(1000, Math.floor(14000 / completed.length));
    const context = `下面是小队成员的独立结果。请综合、核对并输出一份最终交付内容，不要简单拼接。\n\n${completed.map(entry => `${entry.name}：\n${entry.result.slice(0, perMemberBudget)}`).join('\n\n')}`;
    task.result = await runStage(run, agent, provider, '汇总小队结果', context);
  }
  broadcast();
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk.toString('utf8');
    if (body.length > 400000) throw new Error('请求过长。');
  }
  try { return JSON.parse(body || '{}'); } catch { throw new Error('请求格式不是有效 JSON。'); }
}

async function codexAvailable() {
  return new Promise(resolve => {
    const child = spawn('codex', ['--version'], { windowsHide: true, stdio: 'ignore' });
    const timer = setTimeout(() => { child.kill(); resolve(false); }, 2000);
    child.on('error', () => { clearTimeout(timer); resolve(false); });
    child.on('close', code => { clearTimeout(timer); resolve(code === 0); });
  });
}

function hermesInstallIssue(provider) {
  if (provider.type !== 'cli' || !/hermes/i.test(`${provider.id} ${provider.command} ${provider.args}`)) return '';
  const script = provider.args.split(/\r?\n/).map(value => value.trim()).find(value => /hermes\.ps1$/i.test(value)) || HERMES_SCRIPT;
  if (!script) return '';
  if (!existsSync(script)) return 'Hermes 启动脚本不存在，请检查安装位置。';
  const venv = path.join(path.dirname(script), 'hermes-agent', '.venv');
  if (!existsSync(path.join(venv, 'Scripts', 'hermes.exe'))) return 'Hermes 程序文件不存在，请检查安装。';
  try {
    const home = readFileSync(path.join(venv, 'pyvenv.cfg'), 'utf8').match(/^home\s*=\s*(.+)$/im)?.[1]?.trim();
    if (home && !existsSync(path.join(home, 'python.exe'))) return 'Hermes 依赖的 Python 3.11 已不存在，请先修复 Hermes 安装。';
  } catch { return 'Hermes 的 Python 环境不完整，请先修复安装。'; }
  return '';
}

async function serveStatic(pathname, res) {
  const relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1));
  const file = path.resolve(PUBLIC, relative);
  if (!file.startsWith(PUBLIC + path.sep) && file !== path.join(PUBLIC, 'index.html')) return sendJson(res, 403, { error: '禁止访问。' });
  let info;
  try { info = await stat(file); } catch { return sendJson(res, 404, { error: '文件不存在。' }); }
  if (!info.isFile()) return sendJson(res, 404, { error: '文件不存在。' });
  const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' }[path.extname(file)] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-cache' });
  res.end(await readFile(file));
}

const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url || '/', `http://${HOST}:${PORT}`).pathname;
  try {
    if (req.method === 'GET' && pathname === '/api/state') return sendJson(res, 200, state());
    if (req.method === 'GET' && pathname === '/api/workspace') return sendJson(res, 200, { files: await listWorkspaceFiles() });
    if (req.method === 'GET' && pathname === '/api/workspace/file') {
      const relative = new URL(req.url || '/', `http://${HOST}:${PORT}`).searchParams.get('path') || '';
      const candidate = path.resolve(WORKSPACE, relative);
      if (!relative || !candidate.startsWith(WORKSPACE + path.sep)) return sendJson(res, 403, { error: '文件路径不在工作区。' });
      const resolved = await realpath(candidate);
      const rootReal = await realpath(WORKSPACE);
      if (!resolved.startsWith(rootReal + path.sep)) return sendJson(res, 403, { error: '文件路径不在工作区。' });
      const info = await stat(resolved);
      if (!info.isFile() || info.size > 120000) return sendJson(res, 400, { error: '只可预览 120 KB 内的文本文件。' });
      const ext = path.extname(resolved).toLowerCase();
      if (!['.txt', '.md', '.json', '.js', '.mjs', '.ts', '.tsx', '.jsx', '.html', '.css', '.svg', '.py', '.yml', '.yaml', '.csv', '.xml', '.sh', '.ps1'].includes(ext)) return sendJson(res, 400, { error: '当前文件类型不支持文本预览。' });
      return sendJson(res, 200, { path: relative, content: await readFile(resolved, 'utf8') });
    }
    if (req.method === 'GET' && pathname === '/api/health') {
      const providerHealth = {};
      const models = {};
      const reasons = {};
      for (const provider of settings.providers) {
        const issue = hermesInstallIssue(provider);
        if (issue) { providerHealth[provider.id] = false; reasons[provider.id] = issue; }
      }
      for (const provider of settings.providers.filter(item => item.enabled)) {
        if (reasons[provider.id]) continue;
        if (provider.type === 'ollama') {
          try { models[provider.id] = await availableModels(provider.baseUrl); providerHealth[provider.id] = models[provider.id].length > 0; }
          catch { models[provider.id] = []; providerHealth[provider.id] = false; }
        } else if (provider.type === 'cli' && provider.command.toLowerCase() === 'codex') providerHealth[provider.id] = await codexAvailable();
        else providerHealth[provider.id] = null;
      }
      return sendJson(res, 200, { providers: providerHealth, models, reasons, workspace: WORKSPACE });
    }
    if (req.method === 'GET' && pathname === '/api/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      clients.add(res);
      res.write(`event: snapshot\ndata: ${JSON.stringify(state())}\n\n`);
      const heartbeat = setInterval(() => { try { res.write(': ping\n\n'); } catch { clearInterval(heartbeat); } }, 15000);
      req.on('close', () => { clearInterval(heartbeat); clients.delete(res); });
      return;
    }
    if (req.method === 'PUT' && pathname === '/api/board') {
      const incoming = await readJson(req);
      if (!Array.isArray(incoming.notes) || incoming.notes.length > 24) throw new Error('黑板最多保存 24 条计划。');
      const next = incoming.notes.map(item => ({ id: bounded(item.id, '计划 ID', 64), text: bounded(item.text, '计划内容', 160), done: item.done === true }));
      if (new Set(next.map(item => item.id)).size !== next.length) throw new Error('计划 ID 不可重复。');
      const temp = `${BOARD_FILE}.tmp`;
      await writeFile(temp, JSON.stringify(next, null, 2), 'utf8');
      await rename(temp, BOARD_FILE);
      board = next;
      broadcast();
      return sendJson(res, 200, { notes: board });
    }
    if (req.method === 'PUT' && pathname === '/api/settings') {
      if (activeRun) return sendJson(res, 409, { error: '请等当前任务结束再保存设置。' });
      const incoming = await readJson(req);
      const next = validateSettings(incoming);
      const nextSecrets = {};
      for (const item of incoming.providers) {
        const key = String(item.apiKey || '');
        if (key.length > 4000) throw new Error('API 密钥过长。');
        if (key) nextSecrets[item.id] = key;
        else if (!item.clearKey && secrets[item.id]) nextSecrets[item.id] = secrets[item.id];
      }
      const temp = `${SETTINGS_FILE}.tmp`;
      await writeFile(temp, JSON.stringify(next, null, 2), 'utf8');
      await rename(temp, SETTINGS_FILE);
      const secretTemp = `${SECRETS_FILE}.tmp`;
      await writeFile(secretTemp, JSON.stringify(nextSecrets, null, 2), { encoding: 'utf8', mode: 0o600 });
      await rename(secretTemp, SECRETS_FILE);
      settings = next;
      secrets = nextSecrets;
      agents = next.agents.map(agent => ({ ...agent, status: 'idle', activity: '自由活动' }));
      broadcast();
      return sendJson(res, 200, { settings: publicSettings() });
    }
    if (req.method === 'POST' && pathname === '/api/tasks') {
      if (activeRun) return sendJson(res, 409, { error: '请等当前任务结束。' });
      const body = await readJson(req);
      const prompt = String(body.prompt || '').trim();
      const agentId = String(body.agentId || '');
      const providerId = String(body.providerId || '');
      const collaborationMode = ['auto', 'solo', 'relay', 'parallel'].includes(body.collaborationMode) ? body.collaborationMode : 'auto';
      const collaboratorIds = ['auto', 'solo'].includes(collaborationMode) ? [] : body.collaboratorIds;
      if (!prompt || prompt.length > 2000) return sendJson(res, 400, { error: '任务内容需在 1 到 2000 字之间。' });
      if (agentId && !agents.some(agent => agent.id === agentId)) return sendJson(res, 400, { error: '指定的小队成员不存在。' });
      const agent = pickWorker(prompt, agentId);
      const provider = settings.providers.find(item => item.id === (providerId || agent.providerId) && item.enabled);
      if (!provider) return sendJson(res, 400, { error: '执行器不存在或未启用。' });
      if (!Array.isArray(collaboratorIds) || collaboratorIds.length > 7) return sendJson(res, 400, { error: '协作成员需为 1 到 7 位。' });
      const uniqueIds = new Set(collaboratorIds.map(String));
      if (uniqueIds.size !== collaboratorIds.length || uniqueIds.has(agent.id)) return sendJson(res, 400, { error: '协作成员不能重复主办成员。' });
      const collaborators = collaboratorIds.map(id => agents.find(person => person.id === id));
      if (collaborators.some(person => !person)) return sendJson(res, 400, { error: '协作成员不存在。' });
      if (['relay', 'parallel'].includes(collaborationMode) && !collaborators.length) return sendJson(res, 400, { error: '请选择至少一位协作成员。' });
      const run = createTask(prompt, agent, provider, collaborationMode, collaborators);
      void execute(run, async current => {
        const choice = collaborationMode === 'auto' ? await planTask(current, agent, provider, agentId, providerId) : { lead: agent, provider, collaborators };
        await runSelectedProvider(current, choice.lead, choice.provider, choice.collaborators);
      });
      return sendJson(res, 202, { id: run.task.id });
    }
    if (req.method === 'POST' && pathname === '/api/cancel') {
      if (!activeRun) return sendJson(res, 404, { error: '没有正在运行的任务。' });
      activeRun.controller.abort(new Error('用户取消任务。'));
      for (const child of activeRun.children) child.kill();
      return sendJson(res, 200, { ok: true });
    }
    if (req.method === 'GET') return await serveStatic(pathname, res);
    return sendJson(res, 404, { error: '接口不存在。' });
  } catch (error) {
    return sendJson(res, 400, { error: String(error.message || error) });
  }
});

function openBrowserIfRequested() {
  if (process.env.PIXEL_OFFICE_OPEN_BROWSER === '1' && process.platform === 'win32') {
    const browser = spawn('explorer.exe', [`http://${HOST}:${PORT}`], { windowsHide: true, detached: true, stdio: 'ignore' });
    browser.on('error', error => console.error('自动打开浏览器失败:', error.message));
    browser.unref();
  }
}

server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.log(`像素办公室已在运行：http://${HOST}:${PORT}`);
    openBrowserIfRequested();
    process.exit(0);
  }
  console.error('启动服务失败:', error);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`像素办公室已启动：http://${HOST}:${PORT}`);
  console.log(`Agent 工作区：${WORKSPACE}`);
  openBrowserIfRequested();
});
