window.__ModuleLoader__.load({ id: 'dsh-better-model-thinking-control', factory: (require) => {
  const module = { exports: {} }
  let React = null
  try { React = require('react') } catch {}

  const API = '/dsh-reasoning-control/api'
  const NS = 'llm-pi-ai'
  const LEVELS = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max']
  const LABELS = { off: 'Off', minimal: 'Minimal', low: 'Low', medium: 'Medium', high: 'High', xhigh: 'XHigh', max: 'Max' }
  const MODALITIES = ['text', 'image', 'video', 'audio']
  const MODALITY_LABELS = { text: '文字', image: '图片', video: '视频', audio: '语音' }
  const MODALITY_STORAGE = 'dsh-better-model-thinking-control:input-modalities'

  function apiFetch(path, options) {
    const opts = options || {}
    return window.fetch(path, Object.assign({}, opts, {
      headers: Object.assign({ 'X-DSH-Reasoning': '1' }, opts.headers || {}),
    })).then(async (response) => ({ status: response.status, data: await response.json().catch(() => null) }))
  }

  function isObject(value) { return value && typeof value === 'object' && !Array.isArray(value) }
  function copy(value) { return JSON.parse(JSON.stringify(value || {})) }
  function modelLabel(model) { return model.name || model.id }
  function providerLabel(id, provider) { return provider.displayName || provider.name || id }
  function asEfforts(model) {
    if (model.reasoningEfforts === false) return false
    if (!isObject(model.reasoningEfforts)) return {}
    return model.reasoningEfforts
  }
  function asModalities(model) {
    const values = model && (model.inputModalities || model.input)
    return Array.isArray(values) && values.length ? values.filter((value) => MODALITIES.includes(value)) : ['text']
  }
  function loadModalities() {
    try { return JSON.parse(window.localStorage.getItem(MODALITY_STORAGE) || '{}') } catch { return {} }
  }
  function saveModalities(value) {
    try { window.localStorage.setItem(MODALITY_STORAGE, JSON.stringify(value)) } catch {}
  }

  /** Add a non-invasive search field to DSH's semantic model menu. */
  function enhanceModelMenus(root) {
    if (!root) return
    root.querySelectorAll('[role="menu"]').forEach((menu) => {
      const groups = menu.querySelectorAll('[role="group"]')
      const search = menu.querySelector('[data-dbmt-model-search]')
      if (groups.length === 0) {
        if (search) search.remove()
        return
      }
      if (search) return
      const input = document.createElement('input')
      input.type = 'search'
      input.placeholder = '搜索模型名称或 ID'
      input.setAttribute('aria-label', '搜索模型名称或 ID')
      input.dataset.dbmtModelSearch = 'true'
      input.className = 'dbmt-main-model-search'
      input.addEventListener('input', () => {
        const query = input.value.trim().toLowerCase()
        groups.forEach((group) => {
          let visible = false
          group.querySelectorAll('[role="menuitemradio"]').forEach((option) => {
            const matches = !query || option.textContent.toLowerCase().includes(query)
            option.style.display = matches ? '' : 'none'
            if (matches) visible = true
          })
          group.style.display = visible ? '' : 'none'
        })
      })
      menu.insertBefore(input, menu.firstChild)
    })
  }

  function Card(props) {
    const state = props.useReasoningControl(snapshot => snapshot)
    const [open, setOpen] = React.useState(props.standalone === true)
    const [providers, setProviders] = React.useState({})
    const [providerOpen, setProviderOpen] = React.useState({})
    const [effortOpen, setEffortOpen] = React.useState({})
    const [modalityOpen, setModalityOpen] = React.useState({})
    const [modalities, setModalities] = React.useState(loadModalities)
    const [modelQuery, setModelQuery] = React.useState('')
    const [probeKeys, setProbeKeys] = React.useState({})
    const [message, setMessage] = React.useState('')
    const [busy, setBusy] = React.useState(false)
    React.useEffect(() => {
      if (state.status === 'ready') setProviders(copy((state.value && state.value.providers) || {}))
    }, [state.status, state.revision])
    // settingsScope reports availability through `status`; unlike the shared
    // DSH PluginCard model, it does not add an `available` boolean.
    if (state.status !== 'ready') {
      // The card remains hidden in the optional Plugins configuration tab when
      // llm-pi-ai is absent, but the standalone Settings page must explain why
      // it cannot show controls instead of becoming an apparently empty page.
      return props.standalone === true
        ? React.createElement('div', { className: 'dbmt-card dbmt-unavailable' },
            React.createElement('strong', null, '模型思考强度'),
            React.createElement('p', null, state.status === 'loading'
              ? '正在读取 DSH 模型配置…'
              : '未检测到 DSH 的 llm-pi-ai 模型配置。请先在“模型”设置中启用或添加 OpenAI 兼容中转站，然后重新打开此页。'))
        : null
    }

    function updateProvider(id, next) {
      setProviders((current) => Object.assign({}, current, { [id]: next }))
      setMessage('')
    }
    function updateModel(providerId, index, next) {
      const provider = copy(providers[providerId])
      provider.models = Array.isArray(provider.models) ? provider.models : []
      provider.models[index] = Object.assign({}, provider.models[index], next)
      updateProvider(providerId, provider)
    }
    function updateModalities(providerId, modelId, next) {
      const key = `${providerId}:${modelId}`
      setModalities((current) => {
        const updated = Object.assign({}, current, { [key]: next })
        saveModalities(updated)
        return updated
      })
    }
    function save() {
      setBusy(true); setMessage('')
      props.scope.set('providers', providers).then(() => {
        setBusy(false); setMessage('已保存')
      }).catch((error) => {
        setBusy(false); setMessage('保存失败：' + String(error && error.message || error))
      })
    }
    function reset() {
      setProviders(copy((state.value && state.value.providers) || {})); setMessage('')
    }
    function addModel(providerId) {
      const provider = copy(providers[providerId])
      provider.models = Array.isArray(provider.models) ? provider.models : []
      provider.models.push({ id: '', reasoningEfforts: { off: null, low: 'low', medium: 'medium', high: 'high', max: 'max' } })
      updateProvider(providerId, provider)
    }
    function removeModel(providerId, index) {
      const provider = copy(providers[providerId])
      provider.models = (provider.models || []).filter((_, at) => at !== index)
      updateProvider(providerId, provider)
    }
    async function autoFetch(providerId) {
      const provider = providers[providerId] || {}
      setBusy(true); setMessage('正在拉取模型…')
      try {
        const result = await apiFetch(`${API}/probe`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: providerId, baseURL: provider.baseURL, api: provider.api, apiKeyEnv: provider.apiKeyEnv, apiKey: probeKeys[providerId] || undefined }),
        })
        if (!result.data || !result.data.ok) throw new Error(result.data && result.data.error || `请求失败（状态码 ${result.status}）`)
        const current = Array.isArray(provider.models) ? provider.models : []
        const byId = new Map(current.map((model) => [model.id, model]))
        for (const candidate of result.data.models || []) {
          const existing = byId.get(candidate.id) || { id: candidate.id }
          byId.set(candidate.id, Object.assign({}, existing, candidate))
        }
        updateProvider(providerId, Object.assign({}, provider, { models: Array.from(byId.values()) }))
        setMessage(`已拉取 ${result.data.models.length} 个模型；请检查后保存`)
      } catch (error) {
        setMessage('自动拉取失败：' + String(error && error.message || error))
      } finally { setBusy(false) }
    }

    function renderModel(providerId, model, index) {
      const efforts = asEfforts(model)
      const selected = efforts === false ? [] : LEVELS.filter((level) => Object.prototype.hasOwnProperty.call(efforts, level))
      const menuKey = `${providerId}:${index}`
      const menuOpen = effortOpen[menuKey] === true
      const options = LEVELS.map((level) => {
        const checked = efforts !== false && Object.prototype.hasOwnProperty.call(efforts, level)
        return React.createElement('label', { key: level, className: 'dbmt-effort-option' },
          React.createElement('input', { type: 'checkbox', checked, onChange: (event) => {
            const next = efforts === false ? {} : Object.assign({}, efforts)
            if (event.target.checked) next[level] = level === 'off' ? null : level
            else delete next[level]
            updateModel(providerId, index, { reasoningEfforts: next })
          } }), LABELS[level])
      })
      const effortMenu = menuOpen ? React.createElement('div', { className: 'dbmt-effort-menu' }, options) : null
      const effortSelect = React.createElement('div', { className: 'dbmt-effort-select' },
        React.createElement('button', { type: 'button', className: 'dbmt-effort-trigger', 'aria-expanded': menuOpen, onClick: () => setEffortOpen((current) => Object.assign({}, current, { [menuKey]: !menuOpen })) }, selected.length ? `已选择 ${selected.length} 个档位` : '选择推理强度'),
        effortMenu,
        menuOpen ? React.createElement('label', { className: 'dbmt-effort-option dbmt-none' },
          React.createElement('input', { type: 'checkbox', checked: efforts === false, onChange: (event) => updateModel(providerId, index, { reasoningEfforts: event.target.checked ? false : { off: null } }) }), '非推理模型') : null)
      const modalityKey = `${providerId}:${model.id || index}`
      const selectedModalities = modalities[modalityKey] || asModalities(model)
      const modalitiesMenuOpen = modalityOpen[modalityKey] === true
      const modalityOptions = MODALITIES.map((modality) => React.createElement('label', { key: modality, className: 'dbmt-effort-option' },
        React.createElement('input', { type: 'checkbox', checked: selectedModalities.includes(modality), onChange: (event) => {
          const next = selectedModalities.filter((item) => item !== modality)
          if (event.target.checked) next.push(modality)
          updateModalities(providerId, model.id || index, next.length ? next : ['text'])
        } }), MODALITY_LABELS[modality]))
      const modalitySelect = React.createElement('div', { className: 'dbmt-effort-select dbmt-modality-select' },
        React.createElement('button', { type: 'button', className: 'dbmt-effort-trigger', 'aria-expanded': modalitiesMenuOpen, onClick: () => setModalityOpen((current) => Object.assign({}, current, { [modalityKey]: !modalitiesMenuOpen })) }, `输入模态：${selectedModalities.map((item) => MODALITY_LABELS[item]).join('、')}`),
        modalitiesMenuOpen ? React.createElement('div', { className: 'dbmt-effort-menu' }, modalityOptions) : null)
      return React.createElement('div', { className: 'dbmt-model', key: `${providerId}:${index}` },
        React.createElement('div', { className: 'dbmt-model-row' },
          React.createElement('input', { value: model.id || '', placeholder: '模型 ID', onChange: (event) => updateModel(providerId, index, { id: event.target.value }) }),
          React.createElement('button', { type: 'button', title: '删除模型', onClick: () => removeModel(providerId, index) }, '删除')),
        React.createElement('div', { className: 'dbmt-model-controls' }, effortSelect, modalitySelect))
    }

    const configuredProviders = Object.keys(providers)
    const providerSections = configuredProviders.map((providerId) => {
      const provider = providers[providerId] || {}
      const models = Array.isArray(provider.models) ? provider.models : []
      const expanded = providerOpen[providerId] !== false
      const providerBody = React.createElement('div', { className: 'dbmt-provider-body' },
        React.createElement('label', { className: 'dbmt-field' },
          React.createElement('span', null, '一次性 API Key（可选）'),
          React.createElement('input', { type: 'password', autoComplete: 'off', value: probeKeys[providerId] || '', placeholder: '仅用于本次自动拉取，不会保存', onChange: (event) => setProbeKeys((current) => Object.assign({}, current, { [providerId]: event.target.value })) })),
        React.createElement('div', { className: 'dbmt-provider-actions' },
          React.createElement('button', { type: 'button', disabled: busy || !provider.baseURL, onClick: () => autoFetch(providerId) }, '自动拉取')),
        models.map((model, index) => ({ model, index }))
          .filter(({ model }) => !modelQuery.trim() || `${model.id} ${model.name || ''}`.toLowerCase().includes(modelQuery.trim().toLowerCase()))
          .map(({ model, index }) => renderModel(providerId, model, index)),
        React.createElement('button', { type: 'button', className: 'dbmt-add', onClick: () => addModel(providerId) }, '+ 添加模型'))
      return React.createElement('section', { className: 'dbmt-provider', key: providerId },
        React.createElement('button', { type: 'button', className: 'dbmt-provider-head dbmt-provider-toggle', onClick: () => setProviderOpen((current) => Object.assign({}, current, { [providerId]: !expanded })), 'aria-expanded': expanded },
          React.createElement('strong', null, providerLabel(providerId, provider)),
          React.createElement('code', null, providerId),
          React.createElement('span', { className: 'dbmt-provider-state' }, expanded ? '收起' : '展开')),
        expanded ? providerBody : null)
    })
    const body = React.createElement('div', { className: 'dbmt-body' },
      React.createElement('div', { className: 'dbmt-hint dbmt-global-hint' }, '自动识别到的档位会写入模型配置；未识别时可手动勾选。'),
      React.createElement('input', { className: 'dbmt-search', value: modelQuery, placeholder: '搜索模型名称或 ID', onChange: (event) => setModelQuery(event.target.value) }),
      !state.writable ? React.createElement('div', { className: 'dbmt-warn' }, '当前 DSH 设置为只读') : null,
      configuredProviders.length === 0 ? React.createElement('div', { className: 'dbmt-muted' }, '尚未配置 llm-pi-ai 中转站，请先到 DSH 的模型设置添加。') : null,
      providerSections,
      message ? React.createElement('div', { className: message.indexOf('失败') >= 0 ? 'dbmt-error' : 'dbmt-success' }, message) : null,
      React.createElement('div', { className: 'dbmt-actions' },
        React.createElement('button', { type: 'button', disabled: busy, onClick: reset }, '撤销未保存修改'),
        React.createElement('button', { type: 'button', className: 'dbmt-primary', disabled: busy || !state.writable, onClick: save }, busy ? '处理中…' : '保存配置')))
    return React.createElement('div', { className: 'dbmt-card' },
      React.createElement('button', { className: 'dbmt-header', type: 'button', onClick: () => setOpen(!open), 'aria-expanded': open },
        React.createElement('span', null,
          React.createElement('strong', null, '模型思考强度'),
          React.createElement('small', null, '按中转站和模型设置思考强度')), open ? '收起' : '展开'),
      open ? body : null)
  }

  const CSS = `.dbmt-card{border:0;border-radius:0;margin:0;background:transparent;overflow:visible}.dbmt-header{display:flex;justify-content:space-between;align-items:center;width:100%;padding:13px 14px;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer}.dbmt-header span{display:grid;gap:3px}.dbmt-header small{font-size:11px;opacity:.65;font-weight:400}.dbmt-body{display:flex;flex-direction:column;gap:10px;padding:0 14px 14px}.dbmt-search{box-sizing:border-box;width:100%;padding:8px 10px;border:1px solid rgba(127,127,127,.4);border-radius:6px;background:rgba(127,127,127,.06);color:inherit}.dbmt-global-hint{margin:0;padding:8px 10px;border-radius:6px;background:rgba(76,125,255,.08);opacity:.8}.dbmt-provider{border:1px solid rgba(127,127,127,.22);border-radius:8px;padding:14px}.dbmt-provider + .dbmt-provider{margin-top:10px}.dbmt-provider-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.dbmt-provider-head strong{font-size:13px}.dbmt-provider-head code{font-size:10px;opacity:.6;flex:1}.dbmt-provider-head button,.dbmt-actions button,.dbmt-add,.dbmt-model-row button{border:1px solid rgba(76,125,255,.5);border-radius:6px;background:transparent;color:#4c7dff;padding:5px 9px;cursor:pointer}.dbmt-provider-head button:disabled,.dbmt-actions button:disabled{opacity:.45;cursor:default}.dbmt-model{margin-top:8px;padding:0;border:0}.dbmt-model-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:6px}.dbmt-model-row>input{width:100%;min-width:0;box-sizing:border-box;padding:6px 8px;border:1px solid rgba(127,127,127,.4);border-radius:6px;background:rgba(127,127,127,.06);color:inherit}.dbmt-model-row>button{height:32px;white-space:nowrap}.dbmt-model-controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:6px}.dbmt-level{display:inline-flex;gap:4px;align-items:center;padding:4px 7px;border-radius:5px;background:rgba(76,125,255,.08);font-size:11px;cursor:pointer}.dbmt-none{color:#c44}.dbmt-hint,.dbmt-muted{font-size:11px;opacity:.65}.dbmt-add{margin-top:8px}.dbmt-actions{display:flex;gap:8px;justify-content:flex-end;border-top:1px solid rgba(127,127,127,.2);padding-top:10px}.dbmt-primary{background:rgba(76,125,255,.12)!important}.dbmt-success{color:#2ea043;font-size:12px}.dbmt-error,.dbmt-warn{color:#c44;font-size:12px}`
  const EXTRA_CSS = `.dbmt-provider-toggle{width:100%;text-align:left;color:inherit;background:transparent;border:0;padding:7px 0;cursor:pointer}.dbmt-provider-state{font-size:11px;color:#4c7dff}.dbmt-provider-body{display:flex;flex-direction:column;gap:8px}.dbmt-field{display:flex;flex-direction:column;gap:5px;font-size:11px;font-weight:600}.dbmt-field input{box-sizing:border-box;width:100%;padding:7px 9px;border:1px solid rgba(127,127,127,.4);border-radius:6px;background:rgba(127,127,127,.06);color:inherit}.dbmt-provider-actions{display:flex;justify-content:flex-end}.dbmt-provider-actions button{border:1px solid rgba(76,125,255,.5);border-radius:6px;background:transparent;color:#4c7dff;padding:5px 9px;cursor:pointer}.dbmt-provider-actions button:disabled{opacity:.45;cursor:default}.dbmt-effort-select{position:relative;display:block;min-width:0}.dbmt-modality-select{margin-top:6px}.dbmt-effort-trigger{width:100%;min-width:0;box-sizing:border-box;border:1px solid rgba(127,127,127,.4);border-radius:6px;background:rgba(127,127,127,.06);color:inherit;padding:7px 9px;text-align:left;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dbmt-effort-trigger::after{content:'▾';float:right;opacity:.7}.dbmt-effort-trigger[aria-expanded='true']::after{content:'▴'}.dbmt-effort-menu{position:absolute;top:calc(100% + 4px);left:0;z-index:10;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;width:260px;padding:8px;border:1px solid rgba(127,127,127,.35);border-radius:7px;background:#111b2b;box-shadow:0 10px 24px rgba(0,0,0,.28)}.dbmt-effort-option{display:flex;align-items:center;gap:6px;padding:5px 7px;border-radius:5px;background:rgba(76,125,255,.08);font-size:12px;cursor:pointer}.dbmt-main-model-search{box-sizing:border-box;width:calc(100% - 8px);margin:4px;padding:7px 9px;border:1px solid rgba(127,127,127,.4);border-radius:6px;background:rgba(127,127,127,.08);color:inherit}.dbmt-unavailable{display:grid;gap:8px;padding:16px}.dbmt-unavailable p{margin:0;font-size:12px;line-height:1.65;opacity:.72}`

  function apply(ctx) {
    if (React === null) return
    const settingsScope = ctx.get('settingsScope')
    if (!settingsScope) return
    const scope = settingsScope.bind({ namespace: NS })
    // Use DSH's SettingsScope directly. Its getSnapshot() returns a stable
    // reference until the next update, which React's useSyncExternalStore
    // requires. Wrapping it in a freshly allocated object made the Settings
    // renderer continuously re-render and appear as an empty section.
    const store = scope
    if (typeof document !== 'undefined') {
      const style = document.createElement('style')
      style.dataset.plugin = 'dsh-better-model-thinking-control'
      style.textContent = CSS + EXTRA_CSS
      document.head.appendChild(style)
      ctx.effect(() => () => style.remove(), 'dsh-better-model-thinking-control: styles')
      const observer = typeof MutationObserver === 'function'
        ? new MutationObserver(() => { enhanceModelMenus(document.body) })
        : null
      if (observer && document.body) {
        observer.observe(document.body, { childList: true, subtree: true })
        enhanceModelMenus(document.body)
      }
      ctx.effect(() => () => observer?.disconnect(), 'dsh-better-model-thinking-control: model search')
    }
    // The Settings plugin can activate after a bundled external client plugin.
    // Mirror the official DSH activity plugin's delayed slot registration so a
    // fast bundle preload never leaves this card inert for the whole session.
    let registered = false
    const registerCard = () => {
      if (registered) return true
      const slots = ctx.get('slots')
      if (!slots) return false
      // Register only the dedicated Settings page. The Plugins configuration
      // page must not show a second copy of this card.
      slots.inject('settings.section', () => slots.register({
        name: 'settings.section',
        id: 'model-thinking-control',
        order: 35,
        label: () => '模型思考强度',
        inject: () => ({
          hooks: { reasoningControl: store },
          scope,
          standalone: true,
        }),
      }, Card))
      registered = true
      return true
    }
    if (!registerCard()) {
      let attempts = 0
      const timer = window.setInterval(() => {
        attempts += 1
        if (registerCard() || attempts >= 60) window.clearInterval(timer)
      }, 250)
      ctx.effect(() => () => window.clearInterval(timer), 'dsh-better-model-thinking-control: wait for settings slots')
    }
  }

  module.exports = { apply }
  return module.exports
} })