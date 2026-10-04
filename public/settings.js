const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

const animals = { fox: '🦊 狐狸', squirrel: '🐿 松鼠', rabbit: '🐰 兔子', raccoon: '🦝 浣熊', owl: '🦉 猫头鹰', bear: '🐻 熊', cat: '🐱 猫', dog: '🐶 狗' };
const providerTypes = { ollama: '本地 Ollama', openai: 'OpenAI 兼容 API', http: '自定义 HTTP JSON', cli: '本地命令 Agent' };
const apiServices = {
  deepseek: { name: 'DeepSeek', url: 'https://api.deepseek.com', model: 'deepseek-flash', help: '只需粘贴 DeepSeek API Key；模型已预填。' },
  openrouter: { name: 'OpenRouter', url: 'https://openrouter.ai/api/v1', model: '', help: '从 OpenRouter 模型页面复制一个模型 ID。' },
  openai: { name: 'OpenAI API', url: 'https://api.openai.com/v1', model: 'gpt-4o-mini', help: '使用 OpenAI 开发者平台的 API Key。' },
  custom: { name: '其他兼容服务', url: 'https://api.example.com/v1', model: '', help: '向服务商获取接口地址、模型 ID 和密钥。' },
};
const field = (label, path, value, { max = 60, wide = false, hint = '', type = 'text', placeholder = '' } = {}) => `<label class="settings-field ${wide ? 'wide' : ''}">${label}<input type="${type}" data-path="${path}" value="${escapeHtml(value)}" maxlength="${max}" placeholder="${escapeHtml(placeholder)}">${hint ? `<small>${hint}</small>` : ''}</label>`;
const textArea = (label, path, value, { max = 600, hint = '', rows = 3 } = {}) => `<label class="settings-field wide">${label}<textarea data-path="${path}" maxlength="${max}" rows="${rows}">${escapeHtml(value)}</textarea>${hint ? `<small>${hint}</small>` : ''}</label>`;
const select = (label, path, value, options, wide = false) => `<label class="settings-field ${wide ? 'wide' : ''}">${label}<select data-path="${path}">${Object.entries(options).map(([key, title]) => `<option value="${escapeHtml(key)}" ${String(value) === key ? 'selected' : ''}>${escapeHtml(title)}</option>`).join('')}</select></label>`;
const check = (label, path, value) => `<label class="check-line"><input type="checkbox" data-path="${path}" ${value ? 'checked' : ''}>${label}</label>`;

function newProvider(type) {
  const common = { id: crypto.randomUUID(), name: { ollama: '新的本地模型', openai: '新的兼容 API', http: '新的 HTTP 接口', cli: '新的本地 Agent' }[type], type, enabled: false, instruction: '' };
  if (type === 'ollama') return { ...common, baseUrl: 'http://127.0.0.1:11434', model: 'auto' };
  if (type === 'openai') return { ...common, baseUrl: 'https://api.example.com/v1', model: 'your-model', apiKeyEnv: '' };
  if (type === 'http') return { ...common, url: 'https://api.example.com/run', method: 'POST', headers: '{"Authorization":"Bearer {{apiKey}}"}', bodyTemplate: '{"prompt":"{{prompt}}"}', responsePath: 'output', apiKeyEnv: '' };
  return { ...common, command: 'agent-cli', args: 'run\n{{prompt}}', promptMode: 'argument', outputFormat: 'text', timeoutSeconds: 1800, showFiles: false };
}

export function setupSettings({ getSettings, getHealth, save, toast }) {
  const dialog = $('#settings-dialog');
  const content = $('#settings-content');
  let draft = null;
  let tab = 'setup';
  let expandedProviderId = null;
  let setupProviderId = null;

  function providerKind(provider) {
    if (provider.type === 'ollama') return 'ollama';
    if (provider.type === 'openai') return 'api';
    if (provider.type === 'cli' && (provider.id === 'codex' || /^codex(?:\.exe)?$/i.test(provider.command))) return 'codex';
    if (provider.type === 'cli' && (provider.id === 'hermes' || /hermes/i.test(`${provider.command} ${provider.args}`))) return 'hermes';
    if (provider.type === 'cli') return 'local';
    return 'other';
  }

  function setupPreset(kind) {
    if (kind === 'ollama') return { ...newProvider('ollama'), name: '本地 Ollama', enabled: true };
    if (kind === 'api') return { ...newProvider('openai'), name: '自定义 API', enabled: true };
    if (kind === 'codex') return { ...newProvider('cli'), name: 'Codex', enabled: true, command: 'codex', args: 'exec\n--json\n--sandbox\nworkspace-write\n-C\n{{workspace}}\n--skip-git-repo-check\n--ephemeral\n-', promptMode: 'stdin', outputFormat: 'codex-jsonl', showFiles: true };
    if (kind === 'local') return { ...newProvider('cli'), name: '其他本地 Agent', enabled: false };
    return { ...newProvider('cli'), name: 'Hermes Agent', enabled: false, command: 'hermes', args: '-z\n{{prompt}}', promptMode: 'argument', showFiles: true };
  }

  function setupStatus(provider) {
    if (!provider) return '还没添加';
    if (getHealth().reasons?.[provider.id]) return '安装需修复';
    if (provider.type === 'openai' && (/api\.example\.com/i.test(provider.baseUrl) || provider.model === 'your-model')) return '待填写地址和模型';
    if (provider.type === 'openai' && !provider.hasKey && !provider.apiKey && !provider.apiKeyEnv && !/127\.0\.0\.1|localhost/.test(provider.baseUrl)) return '待填写 API Key';
    if (!provider.enabled) return '未启用';
    const connected = getHealth().providers?.[provider.id];
    if (connected === true) return '已连接';
    if (connected === false) return '未连接';
    return '已启用 · 待实际运行验证';
  }

  function renderSetup() {
    const selected = draft.providers.find(provider => provider.id === setupProviderId);
    const index = draft.providers.indexOf(selected);
    const cards = [
      ['ollama', '🏠', '本地模型', '电脑上已安装 Ollama'],
      ['codex', '⌘', 'Codex', '使用本机 Codex 登录'],
      ['hermes', '✦', 'Hermes', '使用本机 Hermes Agent'],
      ['api', '☁', '云端 API', 'DeepSeek / OpenRouter / OpenAI / 其他'],
    ];
    const choices = cards.map(([kind, icon, title, description]) => {
      const matches = draft.providers.filter(provider => providerKind(provider) === kind);
      const first = matches[0];
      return `<button type="button" class="setup-choice ${selected && providerKind(selected) === kind ? 'active' : ''}" data-action="setup-select" data-kind="${kind}"><span class="setup-choice-icon">${icon}</span><span><strong>${title}</strong><small>${description}</small><em>${escapeHtml(setupStatus(first))}${matches.length > 1 ? ` · 共 ${matches.length} 个` : ''}</em></span></button>`;
    }).join('');
    let editor = '<div class="scene-empty">点上方一种 Agent，填写信息后保存即可。</div>';
    if (selected) {
      const kind = providerKind(selected);
      const base = `providers.${index}`;
      const status = setupStatus(selected);
      const memberOptions = Object.fromEntries(draft.providers.filter(provider => provider.enabled).map(provider => [provider.id, provider.name]));
      const memberBindings = draft.agents.map((agent, memberIndex) => `<div class="setup-member-row"><span>${escapeHtml((animals[agent.animal] || '🐾').split(' ')[0])} ${escapeHtml(agent.name)}</span>${select('使用', `agents.${memberIndex}.providerId`, agent.providerId, memberOptions)}</div>`).join('');
      let fields = '';
      if (kind === 'ollama') fields = `<p class="settings-note wide-note">Ollama 在这台电脑上运行；通常无需填写地址。${escapeHtml((getHealth().models?.[selected.id] || []).length ? `检测到：${getHealth().models[selected.id].join('、')}` : '目前没有检测到可用模型，请先安装 Ollama 并下载模型。')}</p>${select('使用哪个模型', `${base}.model`, selected.model, { auto: '自动选可用模型', ...Object.fromEntries((getHealth().models?.[selected.id] || []).map(model => [model, model])), ...(!['auto', ...(getHealth().models?.[selected.id] || [])].includes(selected.model) ? { [selected.model]: `${selected.model}（未检测到）` } : {}) }, true)}`;
      else if (kind === 'api') {
        const service = Object.entries(apiServices).find(([key, item]) => key !== 'custom' && item.url === selected.baseUrl)?.[0] || 'custom';
        fields = `<div class="api-service-grid wide-note">${Object.entries(apiServices).map(([key, item]) => `<button type="button" class="api-service ${service === key ? 'active' : ''}" data-action="setup-api-template" data-service="${key}">${escapeHtml(item.name)}</button>`).join('')}</div><p class="settings-note wide-note">${escapeHtml(apiServices[service].help)}</p>${service === 'custom' ? field('服务商给你的接口地址', `${base}.baseUrl`, selected.baseUrl, { max: 1000, wide: true, placeholder: 'https://api.example.com/v1' }) : ''}${field('模型 ID', `${base}.model`, selected.model === 'your-model' ? '' : selected.model, { max: 120, wide: true, placeholder: '从服务商的模型列表复制', hint: '这是服务商给出的模型标识，不是你给 Agent 取的名字。' })}${field('API Key（密钥）', `${base}.apiKey`, selected.apiKey || '', { max: 4000, wide: true, type: 'password', placeholder: selected.hasKey ? '密钥已保存；留空保持原值' : '粘贴服务商提供的 API Key', hint: '只保存在本机，页面不会再显示完整密钥。' })}${selected.hasKey ? check('删除已保存的 API Key', `${base}.clearKey`, selected.clearKey) : ''}`;
      }
      else if (kind === 'codex') fields = '<p class="settings-note wide-note">使用这台电脑已经登录的 Codex。成员任务会直接交给 Codex 执行。</p>';
      else if (kind === 'hermes') fields = `<p class="settings-note wide-note">先确保在 PowerShell 中运行 hermes 可以正常工作；Hermes 自己的子代理由 Hermes 管理。若安装位置特殊，可到“高级接入设置”改启动命令。</p>${getHealth().reasons?.[selected.id] ? `<p class="setup-warning wide-note">${escapeHtml(getHealth().reasons[selected.id])}</p>` : ''}`;
      else if (kind === 'local') fields = '<p class="settings-note wide-note">这个 Agent 需要本机启动命令。请在“高级接入设置”中按它的官方安装说明填写；普通用户可先选上方的预设服务。</p>';
      else fields = '<p class="settings-note wide-note">这位 Agent 使用自定义接入方式。细节请到“高级接入设置”修改。</p>';
      editor = `<div class="settings-card setup-editor"><div class="settings-card-title"><h4>接入 ${escapeHtml(selected.name)}</h4><span class="setup-status">${escapeHtml(status)}</span></div><div class="settings-grid">${fields}${check('启用这个 Agent', `${base}.enabled`, selected.enabled)}</div>
        <div class="setup-bindings"><div class="settings-card-title"><h4>交给谁使用？</h4><button type="button" class="small-action" data-action="setup-bind-all" data-index="${index}" ${selected.enabled ? '' : 'disabled'}>让全部成员使用</button></div><details class="setup-member-details"><summary>分别指定每位成员使用的 Agent</summary><div class="setup-member-list">${memberBindings}</div></details></div>
        <details class="setup-member-details"><summary>修改名称与高级参数</summary><div class="settings-grid">${field('显示名称', `${base}.name`, selected.name, { max: 32 })}</div><button type="button" class="small-action" data-action="setup-advanced" data-index="${index}">打开高级接入设置 →</button></details></div>`;
    }
    return `<section class="settings-section"><div><h3>接入 Agent</h3><p class="settings-note">① 选择你已有的服务　② 按提示填密钥或选本地模型　③ 点击保存。任务会默认由 AI 自动判断是否需要协作。</p></div><div class="setup-choice-grid">${choices}</div>${editor}<p class="settings-note">其他命令行 Agent、特殊 HTTP 接口和更多 API，可在“高级接入设置”里添加。</p></section>`;
  }

  function renderBrand() {
    const { brand, scene } = draft;
    return `<section class="settings-section">
      <div><h3>品牌与场景</h3><p class="settings-note">顶部名称、房间门牌和 LOGO 会跟着保存后的配置变化。</p></div>
      <div class="settings-grid">
        ${field('办公室名称', 'brand.name', brand.name, { max: 20 })}
        ${field('场景角标', 'brand.location', brand.location, { max: 28 })}
        ${field('副标题', 'brand.tagline', brand.tagline, { max: 60, wide: true })}
      </div>
      <div class="settings-card"><div class="settings-card-title"><h4>LOGO</h4></div>
        <div class="logo-config"><div class="logo-preview">${brand.logoImage ? `<img src="${escapeHtml(brand.logoImage)}" alt="LOGO 预览">` : escapeHtml(brand.logoEmoji)}</div>
          <div class="logo-fields">${field('图标文字', 'brand.logoEmoji', brand.logoEmoji, { max: 16, hint: '可填一个 Emoji；上传图片后优先显示图片。' })}
            <label class="settings-field">上传图片 PNG / JPEG / WebP，180 KB 内<input type="file" id="logo-file" accept="image/png,image/jpeg,image/webp"></label>
            ${brand.logoImage ? '<div><button type="button" class="small-action danger" data-action="remove-logo">移除已上传图片</button></div>' : ''}
          </div>
        </div>
      </div>
      <div class="settings-card"><div class="settings-card-title"><h4>场景行为</h4></div><div class="settings-grid">
        ${select('窗外时间', 'scene.time', scene.time, { auto: '跟随本机时间', day: '始终白天', night: '始终夜晚' })}
        ${select('短任务工作动画', 'scene.holdSeconds', scene.holdSeconds, { 0: '结果优先', 3: '至少 3 秒', 5: '至少 5 秒', 8: '至少 8 秒' })}
        ${check('空闲成员在办公室走动', 'scene.wander', scene.wander)}
      </div></div>
    </section>`;
  }

  function providerFields(provider, index) {
    const base = `providers.${index}`;
    if (provider.type === 'ollama') return `${field('服务地址', `${base}.baseUrl`, provider.baseUrl, { max: 1000, wide: true, hint: '例如 http://127.0.0.1:11434' })}${field('模型名称', `${base}.model`, provider.model, { max: 120, wide: true, hint: `填 auto 自动选择；当前模型：${escapeHtml((getHealth().models?.[provider.id] || []).join('、') || '尚未读取')}` })}`;
    if (provider.type === 'openai') return `${field('API 基础地址', `${base}.baseUrl`, provider.baseUrl, { max: 1000, wide: true, hint: '例如 https://api.example.com/v1，会调用 /chat/completions。' })}${field('模型名称', `${base}.model`, provider.model, { max: 120 })}${field('API Key', `${base}.apiKey`, provider.apiKey || '', { max: 4000, type: 'password', placeholder: provider.hasKey ? '已保存；留空保持原值' : '可选，按接口要求填写' })}${field('也可用环境变量名', `${base}.apiKeyEnv`, provider.apiKeyEnv || '', { max: 120, wide: true, hint: '若同时填写 Key 和环境变量，优先使用保存的 Key。' })}${provider.hasKey ? check('删除已保存的 API Key', `${base}.clearKey`, provider.clearKey) : ''}`;
    if (provider.type === 'http') return `${field('接口地址', `${base}.url`, provider.url, { max: 1000, wide: true })}${select('请求方法', `${base}.method`, provider.method, { POST: 'POST', PUT: 'PUT' })}${field('结果字段路径', `${base}.responsePath`, provider.responsePath, { max: 200, hint: '例如 choices.0.message.content' })}${textArea('请求头 JSON', `${base}.headers`, provider.headers, { max: 4000, hint: '可用 {{apiKey}} 占位符。' })}${textArea('请求体 JSON', `${base}.bodyTemplate`, provider.bodyTemplate, { max: 12000, hint: '可用 {{prompt}}、{{task}}、{{model}}、{{workspace}}、{{agentName}} 占位符。' })}${field('API Key', `${base}.apiKey`, provider.apiKey || '', { max: 4000, type: 'password', placeholder: provider.hasKey ? '已保存；留空保持原值' : '可选' })}${field('也可用环境变量名', `${base}.apiKeyEnv`, provider.apiKeyEnv || '', { max: 120 })}${provider.hasKey ? check('删除已保存的 API Key', `${base}.clearKey`, provider.clearKey) : ''}`;
    return `${field('命令程序', `${base}.command`, provider.command, { max: 1000, wide: true, hint: '例如 codex、node，或程序的完整路径。直接启动程序，不通过命令行拼接。' })}${textArea('参数：每行一个', `${base}.args`, provider.args, { max: 5000, rows: 7, hint: '可用 {{prompt}} 和 {{workspace}}；参数模式必须包含 {{prompt}}。' })}${select('输入任务的方式', `${base}.promptMode`, provider.promptMode, { stdin: '写入标准输入', argument: '替换参数中的 {{prompt}}' })}${select('输出格式', `${base}.outputFormat`, provider.outputFormat, { text: '普通文本', 'codex-jsonl': 'Codex JSONL 事件' })}${field('超时秒数', `${base}.timeoutSeconds`, provider.timeoutSeconds, { type: 'number', max: 4 })}${check('完成后显示工作区文件', `${base}.showFiles`, provider.showFiles)}<p class="settings-note wide-note">命令在本应用的 workspace 文件夹启动；请先在电脑上安装并配置对应 Agent。</p>`;
  }

  function renderProviders() {
    const status = getHealth().providers || {};
    return `<section class="settings-section"><div><h3>执行器</h3><p class="settings-note">任务只有一个入口。每位成员可绑定任意执行器，派发时也可临时指定。支持本地模型、兼容 API、自定义 HTTP 和命令行 Agent。</p></div>
      <div class="provider-adds">${Object.entries(providerTypes).map(([type, label]) => `<button type="button" class="settings-add" data-action="provider-add" data-type="${type}" ${draft.providers.length >= 20 ? 'disabled' : ''}>＋ ${escapeHtml(label)}</button>`).join('')}</div>
      <div class="provider-list">${draft.providers.map((provider, index) => `<div class="settings-card provider-card ${expandedProviderId === provider.id ? 'expanded' : ''}"><div class="settings-card-title"><button type="button" class="provider-toggle" data-action="provider-expand" data-index="${index}" aria-expanded="${expandedProviderId === provider.id}"><span>${expandedProviderId === provider.id ? '▾' : '▸'} ${escapeHtml(provider.name || '新执行器')} <small>· ${escapeHtml(providerTypes[provider.type])}</small></span><small>${provider.enabled ? status[provider.id] === true ? '连接正常' : status[provider.id] === false ? '未连接' : '待验证' : '未启用'}</small></button><div class="provider-actions">${check('启用', `providers.${index}.enabled`, provider.enabled)}<button type="button" class="small-action danger" data-action="provider-remove" data-index="${index}" ${draft.providers.length === 1 ? 'disabled' : ''}>移除</button></div></div>
        ${expandedProviderId === provider.id ? `<div class="settings-grid">${field('显示名称', `providers.${index}.name`, provider.name, { max: 32 })}${select('接入类型', `providers.${index}.type`, provider.type, providerTypes)}${providerFields(provider, index)}${textArea('长期要求（可选）', `providers.${index}.instruction`, provider.instruction, { max: 2000 })}</div>` : ''}</div>`).join('')}</div>
    </section>`;
  }

  function renderAgents() {
    const available = Object.fromEntries(draft.providers.filter(provider => provider.enabled).map(provider => [provider.id, provider.name]));
    const providerOptions = Object.keys(available).length ? available : Object.fromEntries(draft.providers.map(provider => [provider.id, `${provider.name}（未启用）`]));
    return `<section class="settings-section"><div><h3>小队成员</h3><p class="settings-note">先填名字、擅长的事和使用哪个 Agent。派工词、职位与外观需要时再展开修改。</p></div>
      <div class="settings-card">${select('无人匹配时交给', 'defaultAgentId', draft.defaultAgentId, Object.fromEntries(draft.agents.map(agent => [agent.id, agent.name])), true)}</div>
      <div class="member-list">${draft.agents.map((agent, index) => `<div class="member-card"><div class="member-head"><span class="member-avatar">${escapeHtml((animals[agent.animal] || '🐾').split(' ')[0])}</span><strong>${escapeHtml(agent.name || '新成员')} · 工位 ${index + 1}</strong><div class="member-actions"><button type="button" class="small-action" data-action="agent-up" data-index="${index}" ${index === 0 ? 'disabled' : ''} title="上移">↑</button><button type="button" class="small-action" data-action="agent-down" data-index="${index}" ${index === draft.agents.length - 1 ? 'disabled' : ''} title="下移">↓</button><button type="button" class="small-action danger" data-action="agent-remove" data-index="${index}" ${draft.agents.length === 1 ? 'disabled' : ''}>移除</button></div></div>
        <div class="settings-grid">${field('名字', `agents.${index}.name`, agent.name, { max: 10 })}${select('使用的 Agent', `agents.${index}.providerId`, agent.providerId, providerOptions)}${field('擅长什么', `agents.${index}.expertise`, agent.expertise, { max: 100, wide: true, placeholder: '例如：电商运营、前端开发、旅行规划' })}</div><details class="member-advanced"><summary>更多个人设置</summary><div class="settings-grid">${field('职位', `agents.${index}.role`, agent.role, { max: 20 })}${field('自动派工词', `agents.${index}.routingKeywords`, agent.routingKeywords, { max: 300, wide: true, hint: '用逗号分隔，例如：订单,客服,售后。留空则只手动指定。' })}${textArea('成员长期要求（可选）', `agents.${index}.instructions`, agent.instructions, { max: 1200 })}${select('像素角色', `agents.${index}.animal`, agent.animal, animals)}${field('角色颜色', `agents.${index}.color`, agent.color, { type: 'color', max: 7 })}</div></details></div>`).join('')}</div>
      <button type="button" class="settings-add" data-action="agent-add" ${draft.agents.length >= 8 ? 'disabled' : ''}>＋ 增加小队成员</button></section>`;
  }

  function renderPresets() {
    const allAgents = { '': '自动分配', ...Object.fromEntries(draft.agents.map(agent => [agent.id, agent.name])) };
    const allProviders = { '': '跟随成员默认执行器', ...Object.fromEntries(draft.providers.filter(provider => provider.enabled).map(provider => [provider.id, provider.name])) };
    return `<section class="settings-section"><div><h3>快捷任务</h3><p class="settings-note">点一下填入任务内容。执行成员和执行器都可以预设，也可以留给派发时选择。</p></div>
      <div class="preset-list">${draft.presets.map((preset, index) => `<div class="preset-card"><div class="settings-card-title"><h4>快捷任务 ${index + 1}</h4><button type="button" class="small-action danger" data-action="preset-remove" data-index="${index}">移除</button></div><div class="settings-grid">${field('按钮名称', `presets.${index}.title`, preset.title, { max: 24 })}${select('执行成员', `presets.${index}.agentId`, preset.agentId, allAgents)}${select('执行器', `presets.${index}.providerId`, preset.providerId, allProviders, true)}${textArea('自动填入的任务内容', `presets.${index}.prompt`, preset.prompt, { max: 2000 })}</div></div>`).join('')}</div>
      <button type="button" class="settings-add" data-action="preset-add" ${draft.presets.length >= 12 ? 'disabled' : ''}>＋ 增加快捷任务</button></section>`;
  }

  function render() {
    $('#settings-feedback').textContent = '设置保存在本机 · 最多 8 位成员、20 个执行器';
    dialog.querySelectorAll('[data-settings-tab]').forEach(button => button.classList.toggle('active', button.dataset.settingsTab === tab));
    content.innerHTML = { setup: renderSetup, brand: renderBrand, providers: renderProviders, agents: renderAgents, presets: renderPresets }[tab]();
    $('#settings-save').disabled = false;
  }

  function setPath(path, value) {
    const parts = path.split('.');
    let owner = draft;
    for (const key of parts.slice(0, -1)) owner = owner[key];
    owner[parts.at(-1)] = value;
  }

  function repairProviderReferences() {
    const fallback = draft.providers.find(provider => provider.enabled)?.id || '';
    draft.agents.forEach(agent => { if (!draft.providers.some(provider => provider.id === agent.providerId && provider.enabled)) agent.providerId = fallback; });
    draft.presets.forEach(preset => { if (!draft.providers.some(provider => provider.id === preset.providerId && provider.enabled)) preset.providerId = ''; });
  }

  function open() { draft = structuredClone(getSettings()); tab = 'setup'; expandedProviderId = draft.providers[0]?.id || null; setupProviderId = draft.providers.find(provider => provider.enabled)?.id || draft.providers[0]?.id || null; render(); dialog.showModal(); }
  $('#open-settings').addEventListener('click', open);
  $('#settings-close').addEventListener('click', () => dialog.close());
  $('#settings-cancel').addEventListener('click', () => dialog.close());
  dialog.querySelectorAll('[data-settings-tab]').forEach(button => button.addEventListener('click', () => { tab = button.dataset.settingsTab; render(); }));

  content.addEventListener('input', event => {
    const path = event.target.dataset.path;
    if (path) setPath(path, event.target.type === 'checkbox' ? event.target.checked : event.target.value);
  });
  content.addEventListener('change', async event => {
    if (event.target.id === 'logo-file') {
      const file = event.target.files?.[0];
      if (!file) return;
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 180000) { toast('LOGO 请选 180 KB 内的 PNG、JPEG 或 WebP 图片。'); return; }
      draft.brand.logoImage = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
      render();
      return;
    }
    const path = event.target.dataset.path;
    if (!path) return;
    setPath(path, event.target.type === 'checkbox' ? event.target.checked : event.target.value);
    const typeMatch = path.match(/^providers\.(\d+)\.type$/);
    if (typeMatch) {
      const index = Number(typeMatch[1]);
      const old = draft.providers[index];
      draft.providers[index] = { ...newProvider(old.type), id: old.id, name: old.name, enabled: old.enabled, instruction: old.instruction, clearKey: true };
      repairProviderReferences();
      render();
    } else if (/^providers\.\d+\.enabled$/.test(path)) { repairProviderReferences(); render(); }
  });
  content.addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    const index = Number(button.dataset.index);
    if (action === 'remove-logo') draft.brand.logoImage = '';
    if (action === 'setup-select') {
      const kind = button.dataset.kind;
      let provider = draft.providers.find(item => providerKind(item) === kind);
      if (!provider && draft.providers.length < 20) { provider = setupPreset(kind); draft.providers.push(provider); }
      if (provider) setupProviderId = provider.id;
    }
    if (action === 'setup-api-template') {
      const provider = draft.providers.find(item => item.id === setupProviderId);
      const service = apiServices[button.dataset.service];
      if (provider?.type === 'openai' && service) {
        provider.baseUrl = service.url;
        provider.model = service.model;
        provider.name = service.name;
      }
    }
    if (action === 'setup-bind-all') draft.agents.forEach(agent => { agent.providerId = draft.providers[index].id; });
    if (action === 'setup-advanced') { tab = 'providers'; expandedProviderId = draft.providers[index].id; }
    if (action === 'provider-add' && draft.providers.length < 20) { const provider = newProvider(button.dataset.type); draft.providers.unshift(provider); expandedProviderId = provider.id; }
    if (action === 'provider-remove' && draft.providers.length > 1) { const [removed] = draft.providers.splice(index, 1); if (expandedProviderId === removed.id) expandedProviderId = draft.providers[0].id; repairProviderReferences(); }
    if (action === 'provider-expand') expandedProviderId = expandedProviderId === draft.providers[index].id ? null : draft.providers[index].id;
    if (action === 'agent-add' && draft.agents.length < 8) draft.agents.push({ id: crypto.randomUUID(), name: '新成员', role: '小队成员', expertise: '', routingKeywords: '', instructions: '', providerId: draft.providers.find(provider => provider.enabled)?.id || '', animal: 'cat', color: '#d7a875' });
    if (action === 'agent-remove' && draft.agents.length > 1) { const [removed] = draft.agents.splice(index, 1); draft.presets.forEach(preset => { if (preset.agentId === removed.id) preset.agentId = ''; }); if (draft.defaultAgentId === removed.id) draft.defaultAgentId = draft.agents[0].id; }
    if (action === 'agent-up' && index > 0) [draft.agents[index - 1], draft.agents[index]] = [draft.agents[index], draft.agents[index - 1]];
    if (action === 'agent-down' && index < draft.agents.length - 1) [draft.agents[index + 1], draft.agents[index]] = [draft.agents[index], draft.agents[index + 1]];
    if (action === 'preset-add' && draft.presets.length < 12) draft.presets.push({ id: crypto.randomUUID(), title: '新任务', prompt: '请在这里填写任务内容', agentId: '', providerId: '' });
    if (action === 'preset-remove') draft.presets.splice(index, 1);
    render();
  });
  $('#settings-save').addEventListener('click', async () => {
    const button = $('#settings-save');
    button.disabled = true;
    $('#settings-feedback').textContent = '正在保存…';
    try {
      const unfinishedApi = draft.providers.find(provider => provider.enabled && provider.type === 'openai' && (/api\.example\.com/i.test(provider.baseUrl) || provider.model === 'your-model'));
      if (unfinishedApi) { tab = 'setup'; setupProviderId = unfinishedApi.id; render(); throw new Error('请先填写自定义 API 的真实地址和模型名。'); }
      await save(draft);
      dialog.close();
      toast('自定义设置已保存。');
    }
    catch (error) { $('#settings-feedback').textContent = error.message; button.disabled = false; }
  });
}
