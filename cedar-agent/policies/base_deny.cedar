// ============================================================
// PolicyGuard AI — Base Cedar Policies
// These are platform-level hard denies that apply to ALL agents
// regardless of what individual agent policies permit.
// Individual agent policies are dynamically loaded via
// cedar-agent REST API and stored in separate policy files.
// ============================================================

// ── HARD DENY 1: No agent can EVER write to protected paths ─
// This is a platform invariant and cannot be overridden.
forbid (
    principal is AgentApp::Agent,
    action == AgentApp::Action::"writeFile",
    resource is AgentApp::File
)
when {
    resource.path like "/etc/**" ||
    resource.path like "/root/**" ||
    resource.path like "/secrets/**" ||
    resource.path like "/proc/**" ||
    resource.path like "/sys/**" ||
    resource.path like "**/.env" ||
    resource.path like "**/credentials**" ||
    resource.path like "**/.ssh/**"
};

// ── HARD DENY 2: No agent can access PII-tagged databases ───
forbid (
    principal is AgentApp::Agent,
    action == AgentApp::Action::"queryDatabase",
    resource is AgentApp::Database
)
when {
    resource.pii == true
};

// ── HARD DENY 3: No agent can run shell/bash as commands ────
forbid (
    principal is AgentApp::Agent,
    action == AgentApp::Action::"runCommand",
    resource is AgentApp::Command
)
when {
    resource.isRestricted == true ||
    resource.executable like "**/bash" ||
    resource.executable like "**/sh" ||
    resource.executable like "**/python -c**" ||
    resource.executable like "**/curl**" ||
    resource.executable like "**/wget**"
};

// ── HARD DENY 4: SOX/HIPAA-tagged databases are off-limits ─
forbid (
    principal is AgentApp::Agent,
    action == AgentApp::Action::"queryDatabase",
    resource is AgentApp::Database
)
when {
    resource.compliance.contains("SOX") ||
    resource.compliance.contains("HIPAA")
};

// ── HARD DENY 5: Block write to production environment ──────
forbid (
    principal is AgentApp::Agent,
    action == AgentApp::Action::"callApi",
    resource is AgentApp::ApiEndpoint
)
when {
    resource.environment == "production" &&
    principal.trustLevel < 4
};
