# PolicyGuard AI

> **Offline, policy-governed AI agents for secure enterprise infrastructure.**
> Data never leaves your network. Agents never exceed their mandate.

```
┌─────────────────────────────────────────────────────────────────┐
│                   PolicyGuard AI Platform                        │
│                                                                  │
│  Describe what an AI "employee" should do →                     │
│  Auto-enforce what it is allowed to access →                    │
│  Audit every single action it takes                             │
└─────────────────────────────────────────────────────────────────┘
```

## What Makes This Different

Most AI agent platforms rely on **prompt engineering** to keep agents safe — telling the model "don't access production databases." PolicyGuard AI enforces access at the **infrastructure layer** using Cedar authorization policies, making violations structurally impossible:

| Approach | Safety Mechanism | Can be Bypassed by Prompt? |
|---|---|---|
| System prompt rules | LLM self-restraint | ✅ Yes (prompt injection) |
| **PolicyGuard AI** | **Cedar policy layer** | **❌ Structurally impossible** |

Every tool call goes through:
```
LLM decides to call tool → Cedar says ALLOW/DENY → Tool executes (or doesn't)
```

The LLM **never** executes a tool directly. The policy enforcer intercepts every call.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                  React UI  (port 3000)                    │
│   Describe agent → Preview policy → Deploy → Run         │
└──────────────────┬───────────────────────────────────────┘
                   │ REST API
┌──────────────────▼───────────────────────────────────────┐
│             FastAPI Control Plane  (port 8000)            │
│  ┌─────────────┐ ┌──────────────┐ ┌─────────────────┐   │
│  │AgentBuilder │ │PolicyCompiler│ │  Orchestrator   │   │
│  │(NL→config)  │ │(config→Cedar)│ │(Docker sandbox) │   │
│  └─────────────┘ └──────────────┘ └─────────────────┘   │
└──────┬──────────────────┬────────────────────────────────┘
       │                  │
┌──────▼──────┐   ┌───────▼──────────────────────────────┐
│  Ollama LLM │   │       Agent Sandbox (Docker)          │
│  port 11434 │   │  ┌──────────────┐ ┌────────────────┐ │
│  (offline)  │   │  │ agent_runner │ │policy_enforcer │ │
│             │   │  │  (ReAct loop)│ │(Cedar check)   │ │
└─────────────┘   │  └──────────────┘ └────────┬───────┘ │
                  └───────────────────────────┬─┘         │
                                              │
                              ┌───────────────▼──────────┐
                              │   cedar-agent  (port 8180)│
                              │   Policy Decision Point   │
                              │   ALLOW / DENY every call │
                              └──────────────────────────┘
```

---

## Quick Start

### Prerequisites

- Docker Desktop (with Docker Compose v2)
- ~8 GB free RAM (for LLM model)
- ~10 GB free disk space (for model weights)

### 1. Clone and configure

```bash
git clone <repo>
cd Agent
cp .env.example .env
# Edit .env if needed (model choice, secret key)
```

### 2. Start the platform

```bash
docker compose up -d
```

On first run, the `model-init` container automatically pulls the configured LLM model (`qwen2.5:7b` by default). This takes 5–15 minutes depending on your connection. After that, **everything runs fully offline.**

### 3. Open the UI

Navigate to **http://localhost:3000**

### 4. Build your first agent

1. Click **"Build Agent"** tab
2. Describe your agent: *"Read PDF invoices from /data/invoices, extract the total and vendor name, write a summary CSV to /data/reports/"*
3. Select tools: ✅ File Read, ✅ File Write
4. Set file scope: `/data/invoices/**`, `/data/reports/**`
5. Click **Generate Agent** — the LLM extracts a structured config
6. Review the **auto-generated Cedar policy** in the right panel
7. Click **Deploy Agent**

### 5. Run a prompt

In the **"My Agents"** tab, click **Run Prompt** on your agent:
> *"Summarize all invoices in /data/invoices"*

Try an unauthorized action:
> *"Email the summary to external@company.com"*

→ This will be **blocked at the Cedar policy layer** with a `DENY` logged to the audit trail.

### 6. Review the audit trail

Click **"Audit Trail"** tab to see every tool call, policy decision, and result.

---

## File Structure

```
Agent/
├── docker-compose.yml          # Platform orchestration
├── .env.example                # Configuration template
│
├── backend/                    # FastAPI control plane
│   ├── main.py                 # App entry point + CORS
│   ├── config.py               # Environment config
│   ├── database.py             # SQLite async manager
│   ├── models/
│   │   ├── agent.py            # AgentConfig, CreateAgentRequest
│   │   └── audit.py            # AuditRecord, AuditQuery
│   ├── services/
│   │   ├── agent_builder.py    # NL → AgentConfig via Ollama
│   │   ├── policy_compiler.py  # AgentConfig → Cedar policy
│   │   ├── orchestrator.py     # Docker sandbox management
│   │   └── audit_service.py    # SQLite audit logger
│   └── routers/
│       ├── agents.py           # /api/agents/*
│       ├── policies.py         # /api/policies/*
│       └── audit.py            # /api/audit/*
│
├── agent-runtime/              # Runs inside each sandbox
│   ├── agent_runner.py         # ReAct loop entry point
│   ├── policy_enforcer.py      # Cedar authorization check
│   └── tools/
│       ├── file_tools.py       # read_file, write_file, list_dir
│       ├── http_tools.py       # http_get, http_post
│       ├── sql_tools.py        # sql_query (SELECT only)
│       └── shell_tools.py      # run_command (restricted)
│
├── cedar-agent/                # Cedar PDP sidecar
│   ├── schema.cedarschema      # Entity type definitions
│   ├── entities.json           # Base entity data
│   └── policies/
│       └── base_deny.cedar     # Platform-level hard denies
│
└── frontend/                   # React SPA
    ├── src/
    │   ├── App.tsx             # Tab navigation
    │   ├── api/client.ts       # Typed API client
    │   ├── pages/
    │   │   ├── BuilderPage.tsx # NL → agent builder
    │   │   ├── AgentsPage.tsx  # Deployed agents manager
    │   │   └── AuditPage.tsx   # Audit trail viewer
    │   └── components/
    │       └── PolicyPreview.tsx # Cedar syntax highlighter
    └── nginx.conf              # Reverse proxy config
```

---

## Security Model

### Defense Layers

| Layer | Mechanism | Threat Mitigated |
|---|---|---|
| **Policy (Cedar)** | Deny-by-default, `forbid` overrides any `permit` | Prompt injection, jailbreaks |
| **Sandbox** | Docker + seccomp + non-root + read-only FS | Container escape, resource abuse |
| **Network** | Isolated Docker network, no internet by default | Data exfiltration |
| **Audit** | Every call logged with decision + reason | Forensics, compliance |
| **LLM isolation** | Ollama runs locally, no cloud API calls | Data leakage |

### Cedar Policy Model

Cedar uses **default-deny**: a request is `ALLOW` only if:
- At least one `permit` policy matches, **AND**
- No `forbid` policy matches

`forbid` always wins. Platform-level hard denies in `base_deny.cedar` can **never** be overridden by individual agent policies.

### Fail-Closed Policy Enforcement

If the Cedar sidecar is unreachable for any reason, `policy_enforcer.py` returns **DENY** by default. Agents can never execute tools without an explicit ALLOW from the policy engine.

---

## Configuration

### Choosing a Model

Edit `.env`:

| Model | RAM Required | Best For |
|---|---|---|
| `qwen2.5:7b` (default) | ~5 GB | Best tool-use accuracy |
| `llama3.2:3b` | ~2 GB | CPU-only / low RAM |
| `mistral:7b` | ~5 GB | General reasoning |
| `llama3.1:8b` | ~6 GB | Strong reasoning |

### Air-Gap Deployment

Once models are downloaded, set Docker Compose network to `internal: true`:
```yaml
networks:
  agent-net:
    driver: bridge
    internal: true   # No outbound internet from any container
```

The platform runs entirely offline with local models and local policy evaluation.

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/agents` | Create and deploy an agent |
| `GET` | `/api/agents` | List all agents |
| `GET` | `/api/agents/{id}` | Get agent details + policy |
| `POST` | `/api/agents/{id}/run` | Run a prompt against agent |
| `DELETE` | `/api/agents/{id}` | Stop and remove agent |
| `GET` | `/api/policies/{id}` | Get Cedar policy text |
| `POST` | `/api/policies/{id}/check` | Test authorization request |
| `GET` | `/api/audit` | Query audit logs |
| `GET` | `/api/audit/stats` | Aggregate statistics |
| `GET` | `/health` | Platform health check |

---

## Tech Stack

| Component | Technology |
|---|---|
| **LLM Inference** | Ollama (local, offline) |
| **Agent Reasoning** | Custom ReAct loop → Ollama `/api/generate` |
| **Authorization** | Cedar policy language + `permitio/cedar-agent` |
| **Sandbox** | Docker + seccomp + non-root |
| **Backend** | Python 3.11 + FastAPI + Pydantic v2 |
| **Database** | SQLite (zero-config, file-based) |
| **Frontend** | React 18 + TypeScript + Tailwind CSS v3 |
| **Orchestration** | Docker Compose |

---

## License

MIT
